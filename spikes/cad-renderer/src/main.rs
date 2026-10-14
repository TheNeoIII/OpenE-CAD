// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, sync::Arc, time::Instant};

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;
use winit::{
    application::ApplicationHandler,
    dpi::{PhysicalPosition, PhysicalSize},
    event::{ElementState, MouseButton, MouseScrollDelta, WindowEvent},
    event_loop::{ActiveEventLoop, ControlFlow, EventLoop, OwnedDisplayHandle},
    keyboard::{KeyCode, PhysicalKey},
    window::{Window, WindowId},
};

const PAGE_W_MM: f32 = 420.0;
const PAGE_H_MM: f32 = 297.0;
const HIT_RADIUS_PX: f32 = 9.0;
const JUNCTIONS: [[f32; 2]; 6] = [
    [85.0, 35.0],
    [155.0, 35.0],
    [225.0, 35.0],
    [285.0, 58.0],
    [330.0, 58.0],
    [305.0, 155.0],
];

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct Vertex {
    position: [f32; 2],
    color: [f32; 3],
}

impl Vertex {
    const ATTRIBUTES: [wgpu::VertexAttribute; 2] =
        wgpu::vertex_attr_array![0 => Float32x2, 1 => Float32x3];

    fn layout() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Self>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &Self::ATTRIBUTES,
        }
    }
}

#[derive(Clone, Copy)]
struct LineSegment {
    a: [f32; 2],
    b: [f32; 2],
    color: [f32; 3],
}

#[derive(Debug, Clone, Copy)]
enum Theme {
    Light,
    DarkCanvas,
}

impl Theme {
    fn workspace_color(self) -> wgpu::Color {
        match self {
            Self::Light => wgpu::Color {
                r: 0.13,
                g: 0.14,
                b: 0.15,
                a: 1.0,
            },
            Self::DarkCanvas => wgpu::Color {
                r: 0.025,
                g: 0.030,
                b: 0.035,
                a: 1.0,
            },
        }
    }

    fn page_color(self) -> [f32; 3] {
        match self {
            Self::Light => [0.975, 0.980, 0.985],
            Self::DarkCanvas => [0.090, 0.100, 0.110],
        }
    }

    fn neutral(self) -> [f32; 3] {
        match self {
            Self::Light => [0.10, 0.12, 0.14],
            Self::DarkCanvas => [0.83, 0.86, 0.88],
        }
    }

    fn muted(self) -> [f32; 3] {
        match self {
            Self::Light => [0.62, 0.66, 0.69],
            Self::DarkCanvas => [0.34, 0.37, 0.40],
        }
    }

    fn grid_minor(self) -> [f32; 3] {
        match self {
            Self::Light => [0.89, 0.90, 0.92],
            Self::DarkCanvas => [0.15, 0.17, 0.19],
        }
    }

    fn grid_major(self) -> [f32; 3] {
        match self {
            Self::Light => [0.80, 0.82, 0.85],
            Self::DarkCanvas => [0.23, 0.25, 0.28],
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum Density {
    Reference,
    Stress,
}

#[derive(Debug, Clone, Copy)]
struct Camera {
    center_x_mm: f32,
    center_y_mm: f32,
    zoom: f32,
}

impl Default for Camera {
    fn default() -> Self {
        Self {
            center_x_mm: PAGE_W_MM / 2.0,
            center_y_mm: PAGE_H_MM / 2.0,
            zoom: 0.92,
        }
    }
}

impl Camera {
    fn pixels_per_mm(self, size: PhysicalSize<u32>) -> f32 {
        let fit = (size.width as f32 / PAGE_W_MM).min(size.height as f32 / PAGE_H_MM);
        fit * self.zoom
    }

    fn pan_pixels(&mut self, dx_px: f32, dy_px: f32, size: PhysicalSize<u32>) {
        let scale = self.pixels_per_mm(size).max(0.000_1);
        self.center_x_mm -= dx_px / scale;
        self.center_y_mm -= dy_px / scale;
    }

    fn zoom_by(&mut self, factor: f32) {
        self.zoom = (self.zoom * factor).clamp(0.1, 20.0);
    }

    fn zoom_at_cursor(
        &mut self,
        factor: f32,
        cursor: PhysicalPosition<f64>,
        size: PhysicalSize<u32>,
    ) {
        let before = self.screen_to_world(cursor, size);
        self.zoom_by(factor);
        let after = self.screen_to_world(cursor, size);
        self.center_x_mm += before[0] - after[0];
        self.center_y_mm += before[1] - after[1];
    }

    fn screen_to_world(self, p: PhysicalPosition<f64>, size: PhysicalSize<u32>) -> [f32; 2] {
        let width = size.width.max(1) as f32;
        let height = size.height.max(1) as f32;
        let scale = self.pixels_per_mm(size).max(0.000_1);

        [
            self.center_x_mm + (p.x as f32 - width * 0.5) / scale,
            self.center_y_mm + (p.y as f32 - height * 0.5) / scale,
        ]
    }

    fn to_ndc(self, p: [f32; 2], size: PhysicalSize<u32>) -> [f32; 2] {
        let width = size.width.max(1) as f32;
        let height = size.height.max(1) as f32;
        let scale = self.pixels_per_mm(size);

        let x_px = (p[0] - self.center_x_mm) * scale + width * 0.5;
        let y_px = (p[1] - self.center_y_mm) * scale + height * 0.5;

        [x_px / width * 2.0 - 1.0, 1.0 - y_px / height * 2.0]
    }
}

struct FpsMeter {
    started: Instant,
    frames: u32,
    fps: f32,
}

impl FpsMeter {
    fn new() -> Self {
        Self {
            started: Instant::now(),
            frames: 0,
            fps: 0.0,
        }
    }

    fn tick(&mut self) -> Option<f32> {
        self.frames += 1;
        let elapsed = self.started.elapsed().as_secs_f32();
        if elapsed >= 1.0 {
            self.fps = self.frames as f32 / elapsed;
            self.frames = 0;
            self.started = Instant::now();
            Some(self.fps)
        } else {
            None
        }
    }
}

struct State {
    instance: wgpu::Instance,
    window: Arc<Window>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    surface: wgpu::Surface<'static>,
    config: wgpu::SurfaceConfiguration,
    line_pipeline: wgpu::RenderPipeline,
    fill_pipeline: wgpu::RenderPipeline,
    camera: Camera,
    theme: Theme,
    density: Density,
    grid_visible: bool,
    middle_dragging: bool,
    last_cursor: Option<PhysicalPosition<f64>>,
    hovered_junction: Option<usize>,
    selected_junction: Option<usize>,
    fps: FpsMeter,
}

impl State {
    async fn new(display: OwnedDisplayHandle, window: Arc<Window>) -> Self {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::new_with_display_handle(
            Box::new(display),
        ));
        let surface = instance.create_surface(window.clone()).unwrap();

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                compatible_surface: Some(&surface),
                ..Default::default()
            })
            .await
            .expect("no compatible GPU adapter found");

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default())
            .await
            .expect("failed to create wgpu device");

        let size = window.inner_size();
        let config = surface
            .get_default_config(&adapter, size.width.max(1), size.height.max(1))
            .expect("surface has no default configuration");
        surface.configure(&device, &config);

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("OpenE-CAD spike geometry shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("line.wgsl"))),
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("OpenE-CAD spike geometry pipeline layout"),
            bind_group_layouts: &[],
            immediate_size: 0,
        });

        let make_pipeline = |label: &'static str, topology: wgpu::PrimitiveTopology| {
            device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some(label),
                layout: Some(&pipeline_layout),
                vertex: wgpu::VertexState {
                    module: &shader,
                    entry_point: Some("vs_main"),
                    buffers: &[Some(Vertex::layout())],
                    compilation_options: Default::default(),
                },
                fragment: Some(wgpu::FragmentState {
                    module: &shader,
                    entry_point: Some("fs_main"),
                    compilation_options: Default::default(),
                    targets: &[Some(config.format.into())],
                }),
                primitive: wgpu::PrimitiveState {
                    topology,
                    ..Default::default()
                },
                depth_stencil: None,
                multisample: wgpu::MultisampleState::default(),
                multiview_mask: None,
                cache: None,
            })
        };

        let line_pipeline = make_pipeline(
            "OpenE-CAD spike line pipeline",
            wgpu::PrimitiveTopology::LineList,
        );
        let fill_pipeline = make_pipeline(
            "OpenE-CAD spike fill pipeline",
            wgpu::PrimitiveTopology::TriangleList,
        );

        Self {
            instance,
            window,
            device,
            queue,
            surface,
            config,
            line_pipeline,
            fill_pipeline,
            camera: Camera::default(),
            theme: Theme::Light,
            density: Density::Reference,
            grid_visible: true,
            middle_dragging: false,
            last_cursor: None,
            hovered_junction: None,
            selected_junction: None,
            fps: FpsMeter::new(),
        }
    }

    fn size(&self) -> PhysicalSize<u32> {
        PhysicalSize::new(self.config.width, self.config.height)
    }

    fn resize(&mut self, size: PhysicalSize<u32>) {
        if size.width == 0 || size.height == 0 {
            return;
        }
        self.config.width = size.width;
        self.config.height = size.height;
        self.surface.configure(&self.device, &self.config);
        if let Some(cursor) = self.last_cursor {
            self.update_hover(cursor);
        }
    }

    fn build_page_vertices(&self) -> Vec<Vertex> {
        let size = self.size();
        let color = self.theme.page_color();
        let points = [
            [0.0, 0.0],
            [PAGE_W_MM, 0.0],
            [PAGE_W_MM, PAGE_H_MM],
            [0.0, 0.0],
            [PAGE_W_MM, PAGE_H_MM],
            [0.0, PAGE_H_MM],
        ];

        points
            .into_iter()
            .map(|position| Vertex {
                position: self.camera.to_ndc(position, size),
                color,
            })
            .collect()
    }

    fn build_line_vertices(&self) -> Vec<Vertex> {
        let lines = build_scene(
            self.theme,
            self.density,
            self.grid_visible,
            self.hovered_junction,
            self.selected_junction,
        );
        let size = self.size();
        let mut vertices = Vec::with_capacity(lines.len() * 2);
        for line in lines {
            vertices.push(Vertex {
                position: self.camera.to_ndc(line.a, size),
                color: line.color,
            });
            vertices.push(Vertex {
                position: self.camera.to_ndc(line.b, size),
                color: line.color,
            });
        }
        vertices
    }

    fn render(&mut self) {
        let frame = match self.surface.get_current_texture() {
            wgpu::CurrentSurfaceTexture::Success(frame) => frame,
            wgpu::CurrentSurfaceTexture::Occluded | wgpu::CurrentSurfaceTexture::Timeout => return,
            wgpu::CurrentSurfaceTexture::Suboptimal(frame) => {
                drop(frame);
                self.surface.configure(&self.device, &self.config);
                return;
            }
            wgpu::CurrentSurfaceTexture::Outdated => {
                self.surface.configure(&self.device, &self.config);
                return;
            }
            wgpu::CurrentSurfaceTexture::Lost => {
                self.surface = self.instance.create_surface(self.window.clone()).unwrap();
                self.surface.configure(&self.device, &self.config);
                return;
            }
            wgpu::CurrentSurfaceTexture::Validation => {
                unreachable!("validation errors are not expected outside an error scope")
            }
        };

        let view = frame
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let page_vertices = self.build_page_vertices();
        let line_vertices = self.build_line_vertices();

        let page_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("OpenE-CAD spike page vertices"),
            contents: bytemuck::cast_slice(&page_vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let line_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("OpenE-CAD spike line vertices"),
            contents: bytemuck::cast_slice(&line_vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("OpenE-CAD spike encoder"),
            });

        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("OpenE-CAD spike render pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    depth_slice: None,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(self.theme.workspace_color()),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });

            pass.set_pipeline(&self.fill_pipeline);
            pass.set_vertex_buffer(0, page_buffer.slice(..));
            pass.draw(0..page_vertices.len() as u32, 0..1);

            pass.set_pipeline(&self.line_pipeline);
            pass.set_vertex_buffer(0, line_buffer.slice(..));
            pass.draw(0..line_vertices.len() as u32, 0..1);
        }

        self.queue.submit([encoder.finish()]);
        self.window.pre_present_notify();
        self.queue.present(frame);

        if let Some(fps) = self.fps.tick() {
            let segments = line_vertices.len() / 2;
            let hovered = self
                .hovered_junction
                .map(|i| format!("J{}", i + 1))
                .unwrap_or_else(|| "-".to_owned());
            let selected = self
                .selected_junction
                .map(|i| format!("J{}", i + 1))
                .unwrap_or_else(|| "-".to_owned());
            self.window.set_title(&format!(
                "OpenE-CAD S2 Renderer Spike — {segments} Segmente — {fps:.0} FPS — {:?} — Zoom {:.0}% — Grid {} — Hover {hovered} — Auswahl {selected}",
                self.theme,
                self.camera.zoom * 100.0,
                if self.grid_visible { "an" } else { "aus" },
            ));
        }
    }

    fn update_hover(&mut self, position: PhysicalPosition<f64>) {
        let size = self.size();
        let world = self.camera.screen_to_world(position, size);
        let radius_mm = HIT_RADIUS_PX / self.camera.pixels_per_mm(size).max(0.000_1);
        let radius_sq = radius_mm * radius_mm;

        self.hovered_junction = JUNCTIONS
            .iter()
            .enumerate()
            .filter_map(|(index, point)| {
                let dx = point[0] - world[0];
                let dy = point[1] - world[1];
                let distance_sq = dx * dx + dy * dy;
                (distance_sq <= radius_sq).then_some((index, distance_sq))
            })
            .min_by(|a, b| a.1.total_cmp(&b.1))
            .map(|(index, _)| index);
    }

    fn handle_cursor(&mut self, position: PhysicalPosition<f64>) {
        if self.middle_dragging {
            if let Some(last) = self.last_cursor {
                self.camera.pan_pixels(
                    (position.x - last.x) as f32,
                    (position.y - last.y) as f32,
                    self.size(),
                );
            }
        }
        self.last_cursor = Some(position);
        self.update_hover(position);
    }

    fn handle_wheel(&mut self, delta: MouseScrollDelta) {
        let amount = match delta {
            MouseScrollDelta::LineDelta(_, y) => y,
            MouseScrollDelta::PixelDelta(p) => (p.y as f32 / 120.0).clamp(-4.0, 4.0),
        };
        let factor = 1.12_f32.powf(amount);
        if let Some(cursor) = self.last_cursor {
            self.camera.zoom_at_cursor(factor, cursor, self.size());
            self.update_hover(cursor);
        } else {
            self.camera.zoom_by(factor);
        }
    }

    fn select_hovered(&mut self) {
        self.selected_junction = self.hovered_junction;
    }
}

#[derive(Default)]
struct App {
    state: Option<State>,
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.state.is_some() {
            return;
        }

        let window = Arc::new(
            event_loop
                .create_window(
                    Window::default_attributes()
                        .with_title("OpenE-CAD S2 Renderer Spike")
                        .with_inner_size(PhysicalSize::new(1440, 900)),
                )
                .expect("failed to create window"),
        );

        let state = pollster::block_on(State::new(
            event_loop.owned_display_handle(),
            window.clone(),
        ));
        self.state = Some(state);
        window.request_redraw();
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        let Some(state) = self.state.as_mut() else {
            return;
        };

        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::Resized(size) => state.resize(size),
            WindowEvent::RedrawRequested => {
                state.render();
                state.window.request_redraw();
            }
            WindowEvent::CursorMoved { position, .. } => state.handle_cursor(position),
            WindowEvent::MouseInput {
                state: button_state,
                button: MouseButton::Middle,
                ..
            } => {
                state.middle_dragging = button_state == ElementState::Pressed;
            }
            WindowEvent::MouseInput {
                state: ElementState::Pressed,
                button: MouseButton::Left,
                ..
            } => state.select_hovered(),
            WindowEvent::MouseWheel { delta, .. } => state.handle_wheel(delta),
            WindowEvent::KeyboardInput { event, .. } if event.state == ElementState::Pressed => {
                match event.physical_key {
                    PhysicalKey::Code(KeyCode::Digit1) => state.theme = Theme::Light,
                    PhysicalKey::Code(KeyCode::Digit2) => state.theme = Theme::DarkCanvas,
                    PhysicalKey::Code(KeyCode::Digit3) => state.density = Density::Reference,
                    PhysicalKey::Code(KeyCode::Digit4) => state.density = Density::Stress,
                    PhysicalKey::Code(KeyCode::KeyG) => state.grid_visible = !state.grid_visible,
                    PhysicalKey::Code(KeyCode::KeyR) => {
                        state.camera = Camera::default();
                        if let Some(cursor) = state.last_cursor {
                            state.update_hover(cursor);
                        }
                    }
                    PhysicalKey::Code(KeyCode::Escape) => event_loop.exit(),
                    _ => {}
                }
            }
            _ => {}
        }
    }
}

fn line(a: [f32; 2], b: [f32; 2], color: [f32; 3]) -> LineSegment {
    LineSegment { a, b, color }
}

fn circle_lines(center: [f32; 2], radius: f32, color: [f32; 3]) -> Vec<LineSegment> {
    const STEPS: usize = 16;
    let mut lines = Vec::with_capacity(STEPS);
    for i in 0..STEPS {
        let a0 = i as f32 / STEPS as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / STEPS as f32 * std::f32::consts::TAU;
        lines.push(line(
            [center[0] + radius * a0.cos(), center[1] + radius * a0.sin()],
            [center[0] + radius * a1.cos(), center[1] + radius * a1.sin()],
            color,
        ));
    }
    lines
}

fn build_scene(
    theme: Theme,
    density: Density,
    grid_visible: bool,
    hovered_junction: Option<usize>,
    selected_junction: Option<usize>,
) -> Vec<LineSegment> {
    let neutral = theme.neutral();
    let muted = theme.muted();
    let n_blue = [0.09, 0.46, 0.82];
    let pe_green = [0.12, 0.55, 0.29];
    let control_red = [0.83, 0.25, 0.28];
    let cross_ref = [0.92, 0.43, 0.08];
    let hover_color = [0.98, 0.68, 0.08];
    let selected_color = [1.00, 0.36, 0.08];

    let mut lines = Vec::new();

    if grid_visible {
        let mut x = 10.0;
        while x < PAGE_W_MM {
            let major = (x as i32) % 50 == 0;
            lines.push(line(
                [x, 5.0],
                [x, PAGE_H_MM - 5.0],
                if major { theme.grid_major() } else { theme.grid_minor() },
            ));
            x += 10.0;
        }

        let mut y = 10.0;
        while y < PAGE_H_MM {
            let major = (y as i32) % 50 == 0;
            lines.push(line(
                [5.0, y],
                [PAGE_W_MM - 5.0, y],
                if major { theme.grid_major() } else { theme.grid_minor() },
            ));
            y += 10.0;
        }
    }

    // A3 page border.
    lines.extend([
        line([5.0, 5.0], [415.0, 5.0], muted),
        line([415.0, 5.0], [415.0, 292.0], muted),
        line([415.0, 292.0], [5.0, 292.0], muted),
        line([5.0, 292.0], [5.0, 5.0], muted),
    ]);

    // Main potentials inspired by the design reference, without private project data.
    for (y, color) in [
        (35.0, neutral),
        (42.0, neutral),
        (49.0, neutral),
        (58.0, n_blue),
    ] {
        lines.push(line([18.0, y], [402.0, y], color));
    }
    lines.push(line([18.0, 258.0], [402.0, 258.0], pe_green));

    // Three representative outgoing circuits.
    for x in [85.0, 155.0, 225.0] {
        lines.push(line([x, 35.0], [x, 92.0], neutral));
        lines.push(line([x - 5.0, 92.0], [x + 5.0, 104.0], neutral));
        lines.push(line([x, 104.0], [x, 178.0], neutral));
    }

    // Control circuit with a red switched branch and blue neutral return.
    lines.push(line([285.0, 58.0], [285.0, 110.0], n_blue));
    lines.push(line([285.0, 110.0], [305.0, 110.0], control_red));
    lines.push(line([305.0, 110.0], [305.0, 155.0], control_red));
    lines.push(line([305.0, 155.0], [330.0, 155.0], control_red));
    lines.push(line([330.0, 155.0], [330.0, 58.0], n_blue));

    // Cross-reference markers as short orange technical strokes.
    for y in [35.0, 42.0, 49.0, 58.0, 258.0] {
        lines.push(line([12.0, y - 2.0], [18.0, y], cross_ref));
        lines.push(line([402.0, y], [408.0, y - 2.0], cross_ref));
    }

    // A small terminal strip.
    for i in 0..8 {
        let x = 255.0 + i as f32 * 8.0;
        lines.push(line([x, 200.0], [x, 213.0], neutral));
        lines.push(line([x - 2.0, 203.0], [x + 2.0, 210.0], neutral));
    }

    // Explicit junction nodes and interaction state.
    for (index, point) in JUNCTIONS.iter().copied().enumerate() {
        let (radius, color) = if selected_junction == Some(index) {
            (3.0, selected_color)
        } else if hovered_junction == Some(index) {
            (2.5, hover_color)
        } else {
            (1.35, neutral)
        };
        lines.extend(circle_lines(point, radius, color));
    }

    if matches!(density, Density::Stress) {
        // Deterministic synthetic load: 10,000 additional line segments.
        // They intentionally stay inside the page to exercise buffer rebuild + draw cost.
        for i in 0..10_000u32 {
            let col = i % 200;
            let row = (i / 200) % 50;
            let x = 10.0 + col as f32 * 2.0;
            let y = 70.0 + row as f32 * 3.2;
            let len = 0.8 + (i % 7) as f32 * 0.12;
            lines.push(line([x, y], [x + len, y], muted));
        }
    }

    lines
}

fn main() {
    env_logger::init();

    let event_loop = EventLoop::new().expect("failed to create event loop");
    event_loop.set_control_flow(ControlFlow::Poll);

    let mut app = App::default();
    event_loop.run_app(&mut app).expect("event loop failed");
}
