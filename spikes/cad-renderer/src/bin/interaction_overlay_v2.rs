// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, sync::Arc};

use bytemuck::{Pod, Zeroable};
use opene_cad_editor_interaction_spike::{Point, SelectionInteraction, SnapSettings};
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
const GRID_MM: f32 = 5.0;
const HANDLE_RADIUS_PX: f32 = 5.0;
const HANDLE_HIT_RADIUS_PX: f32 = 10.0;
const CURSOR_RADIUS_PX: f32 = 6.0;

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct Vertex {
    position_mm: [f32; 2],
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

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct CameraUniform {
    center_mm: [f32; 2],
    ndc_per_mm: [f32; 2],
}

#[derive(Clone, Copy)]
struct Segment {
    a: [f32; 2],
    b: [f32; 2],
    color: [f32; 3],
}

fn segment(a: [f32; 2], b: [f32; 2], color: [f32; 3]) -> Segment {
    Segment { a, b, color }
}

#[derive(Debug, Clone, Copy)]
enum Theme {
    Light,
    Dark,
}

impl Theme {
    fn workspace(self) -> wgpu::Color {
        match self {
            Self::Light => wgpu::Color {
                r: 0.18,
                g: 0.19,
                b: 0.20,
                a: 1.0,
            },
            Self::Dark => wgpu::Color {
                r: 0.025,
                g: 0.030,
                b: 0.035,
                a: 1.0,
            },
        }
    }

    fn page(self) -> [f32; 3] {
        match self {
            Self::Light => [0.985, 0.988, 0.992],
            Self::Dark => [0.10, 0.11, 0.12],
        }
    }

    fn border(self) -> [f32; 3] {
        match self {
            Self::Light => [0.62, 0.66, 0.70],
            Self::Dark => [0.42, 0.45, 0.48],
        }
    }

    fn grid_minor(self) -> [f32; 3] {
        match self {
            Self::Light => [0.91, 0.92, 0.94],
            Self::Dark => [0.16, 0.18, 0.20],
        }
    }

    fn grid_major(self) -> [f32; 3] {
        match self {
            Self::Light => [0.82, 0.84, 0.87],
            Self::Dark => [0.25, 0.27, 0.30],
        }
    }
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
        let fit = (size.width.max(1) as f32 / PAGE_W_MM)
            .min(size.height.max(1) as f32 / PAGE_H_MM);
        fit * self.zoom
    }

    fn screen_to_world(self, p: PhysicalPosition<f64>, size: PhysicalSize<u32>) -> Point {
        let scale = self.pixels_per_mm(size).max(0.000_1);
        Point::new(
            self.center_x_mm + (p.x as f32 - size.width as f32 * 0.5) / scale,
            self.center_y_mm + (p.y as f32 - size.height as f32 * 0.5) / scale,
        )
    }

    fn zoom_at(&mut self, factor: f32, cursor: PhysicalPosition<f64>, size: PhysicalSize<u32>) {
        let before = self.screen_to_world(cursor, size);
        self.zoom = (self.zoom * factor).clamp(0.08, 24.0);
        let after = self.screen_to_world(cursor, size);
        self.center_x_mm += before.x - after.x;
        self.center_y_mm += before.y - after.y;
    }

    fn pan_pixels(&mut self, dx: f32, dy: f32, size: PhysicalSize<u32>) {
        let scale = self.pixels_per_mm(size).max(0.000_1);
        self.center_x_mm -= dx / scale;
        self.center_y_mm -= dy / scale;
    }

    fn uniform(self, size: PhysicalSize<u32>) -> CameraUniform {
        let ppm = self.pixels_per_mm(size);
        CameraUniform {
            center_mm: [self.center_x_mm, self.center_y_mm],
            ndc_per_mm: [
                2.0 * ppm / size.width.max(1) as f32,
                -2.0 * ppm / size.height.max(1) as f32,
            ],
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
    camera_buffer: wgpu::Buffer,
    camera_bind_group: wgpu::BindGroup,
    page_buffer: wgpu::Buffer,
    page_count: u32,
    scene_buffer: wgpu::Buffer,
    scene_count: u32,
    camera: Camera,
    theme: Theme,
    grid_visible: bool,
    snap_enabled: bool,
    middle_dragging: bool,
    last_cursor: Option<PhysicalPosition<f64>>,
    raw_cursor_world: Option<Point>,
    snapped_cursor_world: Option<Point>,
    selection: SelectionInteraction,
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
            .expect("failed to create device");

        let size = window.inner_size();
        let mut config = surface
            .get_default_config(&adapter, size.width.max(1), size.height.max(1))
            .expect("surface config unavailable");
        config.present_mode = wgpu::PresentMode::AutoVsync;
        surface.configure(&device, &config);

        let camera = Camera::default();
        let camera_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("OpenE-CAD interaction-v2 camera"),
            contents: bytemuck::bytes_of(&camera.uniform(size)),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let camera_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("OpenE-CAD interaction-v2 camera layout"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
        });
        let camera_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("OpenE-CAD interaction-v2 camera bind group"),
            layout: &camera_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera_buffer.as_entire_binding(),
            }],
        });

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("OpenE-CAD interaction-v2 shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("../line.wgsl"))),
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("OpenE-CAD interaction-v2 pipeline layout"),
            bind_group_layouts: &[Some(&camera_layout)],
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
                    targets: &[Some(config.format.into())],
                    compilation_options: Default::default(),
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
            "OpenE-CAD interaction-v2 lines",
            wgpu::PrimitiveTopology::LineList,
        );
        let fill_pipeline = make_pipeline(
            "OpenE-CAD interaction-v2 fill",
            wgpu::PrimitiveTopology::TriangleList,
        );

        let theme = Theme::Light;
        let grid_visible = true;
        let page = page_vertices(theme);
        let scene = scene_vertices(theme, grid_visible);
        let page_buffer = vertex_buffer(&device, "OpenE-CAD interaction-v2 page", &page);
        let scene_buffer = vertex_buffer(&device, "OpenE-CAD interaction-v2 scene", &scene);

        Self {
            instance,
            window,
            device,
            queue,
            surface,
            config,
            line_pipeline,
            fill_pipeline,
            camera_buffer,
            camera_bind_group,
            page_buffer,
            page_count: page.len() as u32,
            scene_buffer,
            scene_count: scene.len() as u32,
            camera,
            theme,
            grid_visible,
            snap_enabled: true,
            middle_dragging: false,
            last_cursor: None,
            raw_cursor_world: None,
            snapped_cursor_world: None,
            selection: SelectionInteraction::default(),
        }
    }

    fn size(&self) -> PhysicalSize<u32> {
        PhysicalSize::new(self.config.width, self.config.height)
    }

    fn snap_settings(&self) -> SnapSettings {
        SnapSettings {
            enabled: self.snap_enabled,
            step_mm: GRID_MM,
        }
    }

    fn rebuild_scene(&mut self) {
        let page = page_vertices(self.theme);
        let scene = scene_vertices(self.theme, self.grid_visible);
        self.page_buffer = vertex_buffer(&self.device, "OpenE-CAD interaction-v2 page", &page);
        self.page_count = page.len() as u32;
        self.scene_buffer = vertex_buffer(&self.device, "OpenE-CAD interaction-v2 scene", &scene);
        self.scene_count = scene.len() as u32;
    }

    fn update_cursor_world(&mut self, position: PhysicalPosition<f64>) {
        let raw = self.camera.screen_to_world(position, self.size());
        let snapped = self.snap_settings().snap(raw);
        self.raw_cursor_world = Some(raw);
        self.snapped_cursor_world = Some(snapped);
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
        self.update_cursor_world(position);

        if self.selection.is_dragging() {
            if let Some(raw) = self.raw_cursor_world {
                self.selection.update_drag(raw, self.snap_settings());
            }
        }
    }

    fn handle_wheel(&mut self, delta: MouseScrollDelta) {
        let amount = match delta {
            MouseScrollDelta::LineDelta(_, y) => y,
            MouseScrollDelta::PixelDelta(p) => (p.y as f32 / 120.0).clamp(-4.0, 4.0),
        };
        let factor = 1.12_f32.powf(amount);
        if let Some(cursor) = self.last_cursor {
            self.camera.zoom_at(factor, cursor, self.size());
            self.update_cursor_world(cursor);
        }
    }

    fn left_pressed(&mut self) {
        let Some(raw) = self.raw_cursor_world else {
            return;
        };

        let ppm = self.camera.pixels_per_mm(self.size());
        if let Some(rect) = self.selection.rect {
            if let Some(handle) = rect.hit_handle(raw, ppm, HANDLE_HIT_RADIUS_PX) {
                self.selection.begin_resize(handle);
                return;
            }
        }

        self.selection.begin_create(raw, self.snap_settings());
    }

    fn left_released(&mut self) {
        if !self.selection.is_dragging() {
            return;
        }
        if let Some(raw) = self.raw_cursor_world {
            self.selection.finish_drag(raw, self.snap_settings());
        }
    }

    fn clear_selection(&mut self) {
        self.selection = SelectionInteraction::default();
    }

    fn render(&mut self) {
        let size = self.size();
        let camera_uniform = self.camera.uniform(size);
        self.queue
            .write_buffer(&self.camera_buffer, 0, bytemuck::bytes_of(&camera_uniform));

        let overlay = overlay_vertices(
            self.camera,
            size,
            self.snapped_cursor_world,
            self.selection.rect,
        );
        let overlay_buffer = (!overlay.is_empty()).then(|| {
            vertex_buffer(
                &self.device,
                "OpenE-CAD interaction-v2 overlay",
                &overlay,
            )
        });

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
            wgpu::CurrentSurfaceTexture::Validation => panic!("wgpu validation error"),
        };

        let view = frame.texture.create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("OpenE-CAD interaction-v2 encoder"),
            });

        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("OpenE-CAD interaction-v2 render pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    depth_slice: None,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(self.theme.workspace()),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });

            pass.set_bind_group(0, &self.camera_bind_group, &[]);
            pass.set_pipeline(&self.fill_pipeline);
            pass.set_vertex_buffer(0, self.page_buffer.slice(..));
            pass.draw(0..self.page_count, 0..1);

            pass.set_pipeline(&self.line_pipeline);
            pass.set_vertex_buffer(0, self.scene_buffer.slice(..));
            pass.draw(0..self.scene_count, 0..1);

            if let Some(buffer) = overlay_buffer.as_ref() {
                pass.set_vertex_buffer(0, buffer.slice(..));
                pass.draw(0..overlay.len() as u32, 0..1);
            }
        }

        self.queue.submit([encoder.finish()]);
        self.window.pre_present_notify();
        self.queue.present(frame);

        self.window.set_title(&format!(
            "OpenE-CAD S2 Interaction v2 — {:?} — Zoom {:.0}% — Grid {} — Snap {} — Handles: resize aktiv",
            self.theme,
            self.camera.zoom * 100.0,
            if self.grid_visible { "an" } else { "aus" },
            if self.snap_enabled { "an" } else { "aus" },
        ));
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
                        .with_title("OpenE-CAD S2 Interaction v2")
                        .with_inner_size(PhysicalSize::new(1440, 900)),
                )
                .expect("window creation failed"),
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
            WindowEvent::Resized(size) if size.width > 0 && size.height > 0 => {
                state.config.width = size.width;
                state.config.height = size.height;
                state.surface.configure(&state.device, &state.config);
            }
            WindowEvent::RedrawRequested => {
                state.render();
                state.window.request_redraw();
            }
            WindowEvent::CursorMoved { position, .. } => state.handle_cursor(position),
            WindowEvent::MouseWheel { delta, .. } => state.handle_wheel(delta),
            WindowEvent::MouseInput {
                state: button_state,
                button: MouseButton::Middle,
                ..
            } => state.middle_dragging = button_state == ElementState::Pressed,
            WindowEvent::MouseInput {
                state: ElementState::Pressed,
                button: MouseButton::Left,
                ..
            } => state.left_pressed(),
            WindowEvent::MouseInput {
                state: ElementState::Released,
                button: MouseButton::Left,
                ..
            } => state.left_released(),
            WindowEvent::KeyboardInput { event, .. } if event.state == ElementState::Pressed => {
                match event.physical_key {
                    PhysicalKey::Code(KeyCode::Digit1) => {
                        state.theme = Theme::Light;
                        state.rebuild_scene();
                    }
                    PhysicalKey::Code(KeyCode::Digit2) => {
                        state.theme = Theme::Dark;
                        state.rebuild_scene();
                    }
                    PhysicalKey::Code(KeyCode::KeyG) => {
                        state.grid_visible = !state.grid_visible;
                        state.rebuild_scene();
                    }
                    PhysicalKey::Code(KeyCode::KeyS) => {
                        state.snap_enabled = !state.snap_enabled;
                        if let Some(cursor) = state.last_cursor {
                            state.update_cursor_world(cursor);
                        }
                    }
                    PhysicalKey::Code(KeyCode::Delete) => state.clear_selection(),
                    PhysicalKey::Code(KeyCode::KeyR) => state.camera = Camera::default(),
                    PhysicalKey::Code(KeyCode::Escape) => {
                        if state.selection.is_dragging() {
                            state.selection.cancel_drag();
                        } else {
                            event_loop.exit();
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }
}

fn vertex_buffer(device: &wgpu::Device, label: &'static str, vertices: &[Vertex]) -> wgpu::Buffer {
    device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some(label),
        contents: bytemuck::cast_slice(vertices),
        usage: wgpu::BufferUsages::VERTEX,
    })
}

fn page_vertices(theme: Theme) -> Vec<Vertex> {
    [
        [0.0, 0.0],
        [PAGE_W_MM, 0.0],
        [PAGE_W_MM, PAGE_H_MM],
        [0.0, 0.0],
        [PAGE_W_MM, PAGE_H_MM],
        [0.0, PAGE_H_MM],
    ]
    .into_iter()
    .map(|position_mm| Vertex {
        position_mm,
        color: theme.page(),
    })
    .collect()
}

fn to_vertices(lines: Vec<Segment>) -> Vec<Vertex> {
    let mut out = Vec::with_capacity(lines.len() * 2);
    for line in lines {
        out.push(Vertex {
            position_mm: line.a,
            color: line.color,
        });
        out.push(Vertex {
            position_mm: line.b,
            color: line.color,
        });
    }
    out
}

fn scene_vertices(theme: Theme, grid_visible: bool) -> Vec<Vertex> {
    let mut lines = Vec::new();
    if grid_visible {
        let mut x = GRID_MM;
        while x < PAGE_W_MM {
            let major = ((x / 25.0).round() - x / 25.0).abs() < 0.001;
            lines.push(segment(
                [x, 0.0],
                [x, PAGE_H_MM],
                if major { theme.grid_major() } else { theme.grid_minor() },
            ));
            x += GRID_MM;
        }
        let mut y = GRID_MM;
        while y < PAGE_H_MM {
            let major = ((y / 25.0).round() - y / 25.0).abs() < 0.001;
            lines.push(segment(
                [0.0, y],
                [PAGE_W_MM, y],
                if major { theme.grid_major() } else { theme.grid_minor() },
            ));
            y += GRID_MM;
        }
    }

    let border = theme.border();
    lines.extend([
        segment([0.0, 0.0], [PAGE_W_MM, 0.0], border),
        segment([PAGE_W_MM, 0.0], [PAGE_W_MM, PAGE_H_MM], border),
        segment([PAGE_W_MM, PAGE_H_MM], [0.0, PAGE_H_MM], border),
        segment([0.0, PAGE_H_MM], [0.0, 0.0], border),
    ]);

    to_vertices(lines)
}

fn circle_segments(
    center: Point,
    radius_mm: f32,
    color: [f32; 3],
    steps: usize,
) -> Vec<Segment> {
    let mut lines = Vec::with_capacity(steps);
    for i in 0..steps {
        let a0 = i as f32 / steps as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / steps as f32 * std::f32::consts::TAU;
        lines.push(segment(
            [center.x + radius_mm * a0.cos(), center.y + radius_mm * a0.sin()],
            [center.x + radius_mm * a1.cos(), center.y + radius_mm * a1.sin()],
            color,
        ));
    }
    lines
}

fn overlay_vertices(
    camera: Camera,
    size: PhysicalSize<u32>,
    snapped_cursor: Option<Point>,
    selection: Option<opene_cad_editor_interaction_spike::SelectionRect>,
) -> Vec<Vertex> {
    let ppm = camera.pixels_per_mm(size).max(0.000_1);
    let cyan = [0.04, 0.72, 0.86];
    let orange = [1.0, 0.58, 0.08];
    let mut lines = Vec::new();

    if let Some(cursor) = snapped_cursor {
        let r = CURSOR_RADIUS_PX / ppm;
        lines.extend(circle_segments(cursor, r, orange, 24));
        lines.push(segment(
            [cursor.x - r * 1.5, cursor.y],
            [cursor.x + r * 1.5, cursor.y],
            cyan,
        ));
        lines.push(segment(
            [cursor.x, cursor.y - r * 1.5],
            [cursor.x, cursor.y + r * 1.5],
            cyan,
        ));
    }

    if let Some(rect) = selection {
        let min = rect.min;
        let max = rect.max;
        lines.extend([
            segment([min.x, min.y], [max.x, min.y], cyan),
            segment([max.x, min.y], [max.x, max.y], cyan),
            segment([max.x, max.y], [min.x, max.y], cyan),
            segment([min.x, max.y], [min.x, min.y], cyan),
        ]);

        let r = HANDLE_RADIUS_PX / ppm;
        for handle in opene_cad_editor_interaction_spike::RectHandle::ALL {
            lines.extend(circle_segments(rect.corner(handle), r, cyan, 20));
        }
    }

    to_vertices(lines)
}

fn main() {
    env_logger::init();
    let event_loop = EventLoop::new().expect("event loop creation failed");
    event_loop.set_control_flow(ControlFlow::Poll);
    let mut app = App::default();
    event_loop.run_app(&mut app).expect("event loop failed");
}
