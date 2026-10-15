// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, sync::Arc};

use bytemuck::{Pod, Zeroable};
use opene_cad_cad_primitives_spike::{
    Arc as CadArc, Circle, CubicBezier, Ellipse, Point2, TessellationOptions,
    tessellate_arc, tessellate_circle, tessellate_cubic_bezier, tessellate_ellipse,
};
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
const SNAP_RADIUS_PX: f32 = 7.0;
const HANDLE_RADIUS_PX: f32 = 5.0;

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
                r: 0.15,
                g: 0.16,
                b: 0.17,
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
            Self::Light => [0.98, 0.985, 0.99],
            Self::Dark => [0.09, 0.10, 0.11],
        }
    }

    fn neutral(self) -> [f32; 3] {
        match self {
            Self::Light => [0.10, 0.12, 0.14],
            Self::Dark => [0.84, 0.87, 0.89],
        }
    }

    fn border(self) -> [f32; 3] {
        match self {
            Self::Light => [0.63, 0.67, 0.70],
            Self::Dark => [0.38, 0.42, 0.45],
        }
    }

    fn grid_minor(self) -> [f32; 3] {
        match self {
            Self::Light => [0.91, 0.92, 0.93],
            Self::Dark => [0.15, 0.17, 0.19],
        }
    }

    fn grid_major(self) -> [f32; 3] {
        match self {
            Self::Light => [0.82, 0.84, 0.86],
            Self::Dark => [0.24, 0.26, 0.29],
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

    fn screen_to_world(self, p: PhysicalPosition<f64>, size: PhysicalSize<u32>) -> [f32; 2] {
        let scale = self.pixels_per_mm(size).max(0.000_1);
        [
            self.center_x_mm + (p.x as f32 - size.width as f32 * 0.5) / scale,
            self.center_y_mm + (p.y as f32 - size.height as f32 * 0.5) / scale,
        ]
    }

    fn zoom_at(&mut self, factor: f32, cursor: PhysicalPosition<f64>, size: PhysicalSize<u32>) {
        let before = self.screen_to_world(cursor, size);
        self.zoom = (self.zoom * factor).clamp(0.08, 24.0);
        let after = self.screen_to_world(cursor, size);
        self.center_x_mm += before[0] - after[0];
        self.center_y_mm += before[1] - after[1];
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

#[derive(Debug, Clone, Copy)]
enum RouteMode {
    HorizontalThenVertical,
    VerticalThenHorizontal,
}

impl RouteMode {
    fn toggle(&mut self) {
        *self = match *self {
            Self::HorizontalThenVertical => Self::VerticalThenHorizontal,
            Self::VerticalThenHorizontal => Self::HorizontalThenVertical,
        };
    }

    fn label(self) -> &'static str {
        match self {
            Self::HorizontalThenVertical => "H→V",
            Self::VerticalThenHorizontal => "V→H",
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
    selecting: bool,
    last_cursor: Option<PhysicalPosition<f64>>,
    cursor_world: Option<[f32; 2]>,
    selection_start: Option<[f32; 2]>,
    selection_end: Option<[f32; 2]>,
    wire_tool: bool,
    wire_start: Option<[f32; 2]>,
    route_mode: RouteMode,
    committed_wires: Vec<([f32; 2], [f32; 2])>,
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
            label: Some("OpenE-CAD primitives camera"),
            contents: bytemuck::bytes_of(&camera.uniform(size)),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let camera_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("OpenE-CAD primitives camera layout"),
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
            label: Some("OpenE-CAD primitives camera bind group"),
            layout: &camera_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera_buffer.as_entire_binding(),
            }],
        });

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("OpenE-CAD primitives shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("../line.wgsl"))),
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("OpenE-CAD primitives pipeline layout"),
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
            "OpenE-CAD primitives lines",
            wgpu::PrimitiveTopology::LineList,
        );
        let fill_pipeline = make_pipeline(
            "OpenE-CAD primitives fill",
            wgpu::PrimitiveTopology::TriangleList,
        );

        let theme = Theme::Light;
        let grid_visible = true;
        let page_vertices = page_vertices(theme);
        let scene_vertices = scene_vertices(theme, grid_visible, &[]);
        let page_buffer = vertex_buffer(&device, "OpenE-CAD primitives page", &page_vertices);
        let scene_buffer = vertex_buffer(&device, "OpenE-CAD primitives scene", &scene_vertices);

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
            page_count: page_vertices.len() as u32,
            scene_buffer,
            scene_count: scene_vertices.len() as u32,
            camera,
            theme,
            grid_visible,
            snap_enabled: true,
            middle_dragging: false,
            selecting: false,
            last_cursor: None,
            cursor_world: None,
            selection_start: None,
            selection_end: None,
            wire_tool: false,
            wire_start: None,
            route_mode: RouteMode::HorizontalThenVertical,
            committed_wires: Vec::new(),
        }
    }

    fn size(&self) -> PhysicalSize<u32> {
        PhysicalSize::new(self.config.width, self.config.height)
    }

    fn rebuild_scene(&mut self) {
        let page = page_vertices(self.theme);
        let scene = scene_vertices(self.theme, self.grid_visible, &self.committed_wires);
        self.page_buffer = vertex_buffer(&self.device, "OpenE-CAD primitives page", &page);
        self.page_count = page.len() as u32;
        self.scene_buffer = vertex_buffer(&self.device, "OpenE-CAD primitives scene", &scene);
        self.scene_count = scene.len() as u32;
    }

    fn snap(&self, point: [f32; 2]) -> [f32; 2] {
        if !self.snap_enabled {
            return point;
        }
        [
            (point[0] / GRID_MM).round() * GRID_MM,
            (point[1] / GRID_MM).round() * GRID_MM,
        ]
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
        let world = self.camera.screen_to_world(position, self.size());
        self.cursor_world = Some(self.snap(world));
        if self.selecting {
            self.selection_end = Some(world);
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
            let world = self.camera.screen_to_world(cursor, self.size());
            self.cursor_world = Some(self.snap(world));
        }
    }

    fn left_pressed(&mut self) {
        let Some(cursor) = self.cursor_world else {
            return;
        };
        if self.wire_tool {
            if let Some(start) = self.wire_start.take() {
                let route = orthogonal_route(start, cursor, self.route_mode);
                for pair in route.windows(2) {
                    self.committed_wires.push((pair[0], pair[1]));
                }
                self.rebuild_scene();
            } else {
                self.wire_start = Some(cursor);
            }
        } else {
            let raw = self
                .last_cursor
                .map(|p| self.camera.screen_to_world(p, self.size()))
                .unwrap_or(cursor);
            self.selection_start = Some(raw);
            self.selection_end = Some(raw);
            self.selecting = true;
        }
    }

    fn left_released(&mut self) {
        if !self.wire_tool {
            self.selecting = false;
        }
    }

    fn cancel_action(&mut self) -> bool {
        if self.wire_start.take().is_some() || self.selecting {
            self.selecting = false;
            self.selection_start = None;
            self.selection_end = None;
            return true;
        }
        false
    }

    fn render(&mut self) {
        let size = self.size();
        let uniform = self.camera.uniform(size);
        self.queue
            .write_buffer(&self.camera_buffer, 0, bytemuck::bytes_of(&uniform));

        let overlay = overlay_vertices(
            self.theme,
            self.camera,
            size,
            self.cursor_world,
            self.selection_start,
            self.selection_end,
            self.wire_tool,
            self.wire_start,
            self.route_mode,
        );
        let overlay_buffer = (!overlay.is_empty())
            .then(|| vertex_buffer(&self.device, "OpenE-CAD primitives overlay", &overlay));

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
                label: Some("OpenE-CAD primitives encoder"),
            });
        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("OpenE-CAD primitives pass"),
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
            "OpenE-CAD S2 Primitives — {:?} — Zoom {:.0}% — Grid {} — Snap {} — {} — Route {} — {} wires",
            self.theme,
            self.camera.zoom * 100.0,
            if self.grid_visible { "an" } else { "aus" },
            if self.snap_enabled { "an" } else { "aus" },
            if self.wire_tool { "Leitung" } else { "Auswahl" },
            self.route_mode.label(),
            self.committed_wires.len(),
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
                        .with_title("OpenE-CAD S2 Primitives")
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
                    PhysicalKey::Code(KeyCode::KeyS) => state.snap_enabled = !state.snap_enabled,
                    PhysicalKey::Code(KeyCode::KeyW) => {
                        state.wire_tool = !state.wire_tool;
                        state.wire_start = None;
                    }
                    PhysicalKey::Code(KeyCode::Tab) => state.route_mode.toggle(),
                    PhysicalKey::Code(KeyCode::Delete) => {
                        state.committed_wires.clear();
                        state.selection_start = None;
                        state.selection_end = None;
                        state.rebuild_scene();
                    }
                    PhysicalKey::Code(KeyCode::KeyR) => state.camera = Camera::default(),
                    PhysicalKey::Code(KeyCode::Escape) => {
                        if !state.cancel_action() {
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
    for l in lines {
        out.push(Vertex {
            position_mm: l.a,
            color: l.color,
        });
        out.push(Vertex {
            position_mm: l.b,
            color: l.color,
        });
    }
    out
}

fn polyline_segments(points: &[Point2], color: [f32; 3]) -> Vec<Segment> {
    points
        .windows(2)
        .map(|w| {
            segment(
                [w[0].x as f32, w[0].y as f32],
                [w[1].x as f32, w[1].y as f32],
                color,
            )
        })
        .collect()
}

fn scene_vertices(
    theme: Theme,
    grid_visible: bool,
    committed_wires: &[([f32; 2], [f32; 2])],
) -> Vec<Vertex> {
    let neutral = theme.neutral();
    let border = theme.border();
    let n_blue = [0.09, 0.46, 0.82];
    let pe_green = [0.12, 0.55, 0.29];
    let control_red = [0.83, 0.25, 0.28];
    let cross = [0.92, 0.43, 0.08];
    let mut lines = Vec::new();

    if grid_visible {
        let mut x = GRID_MM;
        while x < PAGE_W_MM {
            let major = ((x / 25.0).round() - x / 25.0).abs() < 0.001;
            lines.push(segment(
                [x, 5.0],
                [x, PAGE_H_MM - 5.0],
                if major { theme.grid_major() } else { theme.grid_minor() },
            ));
            x += GRID_MM;
        }
        let mut y = GRID_MM;
        while y < PAGE_H_MM {
            let major = ((y / 25.0).round() - y / 25.0).abs() < 0.001;
            lines.push(segment(
                [5.0, y],
                [PAGE_W_MM - 5.0, y],
                if major { theme.grid_major() } else { theme.grid_minor() },
            ));
            y += GRID_MM;
        }
    }

    lines.extend([
        segment([5.0, 5.0], [415.0, 5.0], border),
        segment([415.0, 5.0], [415.0, 292.0], border),
        segment([415.0, 292.0], [5.0, 292.0], border),
        segment([5.0, 292.0], [5.0, 5.0], border),
        segment([20.0, 35.0], [395.0, 35.0], neutral),
        segment([20.0, 42.0], [395.0, 42.0], neutral),
        segment([20.0, 49.0], [395.0, 49.0], neutral),
        segment([20.0, 58.0], [395.0, 58.0], n_blue),
        segment([20.0, 258.0], [395.0, 258.0], pe_green),
    ]);

    // Motor circle: analytic primitive, tessellated only for this render cache.
    lines.extend(polyline_segments(
        &tessellate_circle(
            Circle {
                center: Point2::new(92.0, 165.0),
                radius_mm: 13.0,
            },
            TessellationOptions::default(),
        ),
        neutral,
    ));
    lines.push(segment([92.0, 58.0], [92.0, 152.0], neutral));
    lines.push(segment([92.0, 178.0], [92.0, 258.0], pe_green));

    // Arc primitive, useful for rotary/mechanical/schematic symbol parts.
    lines.extend(polyline_segments(
        &tessellate_arc(
            CadArc {
                center: Point2::new(180.0, 155.0),
                radius_mm: 22.0,
                start_deg: 205.0,
                sweep_deg: 250.0,
            },
            TessellationOptions::default(),
        ),
        cross,
    ));
    lines.push(segment([180.0, 58.0], [180.0, 125.0], neutral));

    // Rotated ellipse primitive.
    lines.extend(polyline_segments(
        &tessellate_ellipse(
            Ellipse {
                center: Point2::new(260.0, 165.0),
                radius_x_mm: 20.0,
                radius_y_mm: 9.0,
                rotation_deg: 25.0,
            },
            64,
        ),
        control_red,
    ));
    lines.push(segment([260.0, 58.0], [260.0, 140.0], n_blue));

    // Cubic Bézier is included for future symbol/title-block/path needs.
    lines.extend(polyline_segments(
        &tessellate_cubic_bezier(
            CubicBezier {
                p0: Point2::new(315.0, 145.0),
                p1: Point2::new(330.0, 115.0),
                p2: Point2::new(355.0, 205.0),
                p3: Point2::new(375.0, 165.0),
            },
            0.05,
            16,
        ),
        cross,
    ));

    for &(a, b) in committed_wires {
        lines.push(segment(a, b, [0.04, 0.65, 0.78]));
    }

    to_vertices(lines)
}

fn orthogonal_route(start: [f32; 2], end: [f32; 2], mode: RouteMode) -> Vec<[f32; 2]> {
    if (start[0] - end[0]).abs() < 0.000_1 || (start[1] - end[1]).abs() < 0.000_1 {
        return vec![start, end];
    }
    let corner = match mode {
        RouteMode::HorizontalThenVertical => [end[0], start[1]],
        RouteMode::VerticalThenHorizontal => [start[0], end[1]],
    };
    vec![start, corner, end]
}

fn world_circle(
    center: [f32; 2],
    radius_mm: f32,
    color: [f32; 3],
    segments: usize,
) -> Vec<Segment> {
    let points = tessellate_circle(
        Circle {
            center: Point2::new(center[0] as f64, center[1] as f64),
            radius_mm: radius_mm as f64,
        },
        TessellationOptions {
            min_segments_full_circle: segments,
            max_segments_full_circle: segments,
            chord_error_mm: 0.01,
        },
    );
    polyline_segments(&points, color)
}

fn overlay_vertices(
    _theme: Theme,
    camera: Camera,
    size: PhysicalSize<u32>,
    cursor: Option<[f32; 2]>,
    selection_start: Option<[f32; 2]>,
    selection_end: Option<[f32; 2]>,
    wire_tool: bool,
    wire_start: Option<[f32; 2]>,
    route_mode: RouteMode,
) -> Vec<Vertex> {
    let ppm = camera.pixels_per_mm(size).max(0.000_1);
    let cyan = [0.04, 0.65, 0.78];
    let orange = [1.0, 0.55, 0.05];
    let mut lines = Vec::new();

    if let Some(cursor) = cursor {
        let r = SNAP_RADIUS_PX / ppm;
        lines.extend(world_circle(cursor, r, if wire_tool { orange } else { cyan }, 24));
        lines.push(segment([cursor[0] - r * 1.4, cursor[1]], [cursor[0] + r * 1.4, cursor[1]], cyan));
        lines.push(segment([cursor[0], cursor[1] - r * 1.4], [cursor[0], cursor[1] + r * 1.4], cyan));

        if let Some(start) = wire_start {
            let route = orthogonal_route(start, cursor, route_mode);
            for pair in route.windows(2) {
                lines.push(segment(pair[0], pair[1], orange));
            }
            lines.extend(world_circle(start, HANDLE_RADIUS_PX / ppm, orange, 20));
        }
    }

    if let (Some(a), Some(b)) = (selection_start, selection_end) {
        let min_x = a[0].min(b[0]);
        let max_x = a[0].max(b[0]);
        let min_y = a[1].min(b[1]);
        let max_y = a[1].max(b[1]);
        lines.extend([
            segment([min_x, min_y], [max_x, min_y], cyan),
            segment([max_x, min_y], [max_x, max_y], cyan),
            segment([max_x, max_y], [min_x, max_y], cyan),
            segment([min_x, max_y], [min_x, min_y], cyan),
        ]);
        for corner in [
            [min_x, min_y],
            [max_x, min_y],
            [max_x, max_y],
            [min_x, max_y],
        ] {
            lines.extend(world_circle(corner, HANDLE_RADIUS_PX / ppm, cyan, 20));
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
