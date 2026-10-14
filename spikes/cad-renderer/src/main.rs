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
const HIT_RADIUS_PX: f32 = 11.0;
const JUNCTION_RADIUS_PX: f32 = 3.5;
const JUNCTION_HOVER_RADIUS_PX: f32 = 6.0;
const JUNCTION_SELECTED_RADIUS_PX: f32 = 7.0;
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
enum CacheMode {
    RebuildEveryFrame,
    CachedGpuBuffers,
}

impl CacheMode {
    fn label(self) -> &'static str {
        match self {
            Self::RebuildEveryFrame => "Rebuild",
            Self::CachedGpuBuffers => "Cached",
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

    fn uniform(self, size: PhysicalSize<u32>) -> CameraUniform {
        let width = size.width.max(1) as f32;
        let height = size.height.max(1) as f32;
        let pixels_per_mm = self.pixels_per_mm(size);

        CameraUniform {
            center_mm: [self.center_x_mm, self.center_y_mm],
            ndc_per_mm: [
                2.0 * pixels_per_mm / width,
                -2.0 * pixels_per_mm / height,
            ],
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct FrameStats {
    fps: f32,
    p95_ms: f32,
}

struct FrameMeter {
    window_started: Instant,
    last_frame: Instant,
    frame_times_ms: Vec<f32>,
}

impl FrameMeter {
    fn new() -> Self {
        let now = Instant::now();
        Self {
            window_started: now,
            last_frame: now,
            frame_times_ms: Vec::with_capacity(4096),
        }
    }

    fn tick(&mut self) -> Option<FrameStats> {
        let now = Instant::now();
        let dt_ms = (now - self.last_frame).as_secs_f32() * 1000.0;
        self.last_frame = now;
        if dt_ms.is_finite() && dt_ms > 0.0 {
            self.frame_times_ms.push(dt_ms);
        }

        let elapsed = (now - self.window_started).as_secs_f32();
        if elapsed < 1.0 || self.frame_times_ms.is_empty() {
            return None;
        }

        let fps = self.frame_times_ms.len() as f32 / elapsed;
        let mut sorted = self.frame_times_ms.clone();
        sorted.sort_by(|a, b| a.total_cmp(b));
        let p95_index = ((sorted.len() as f32 * 0.95).ceil() as usize)
            .saturating_sub(1)
            .min(sorted.len() - 1);
        let p95_ms = sorted[p95_index];

        self.window_started = now;
        self.frame_times_ms.clear();

        Some(FrameStats { fps, p95_ms })
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
    cached_page_buffer: wgpu::Buffer,
    cached_page_vertex_count: u32,
    cached_line_buffer: wgpu::Buffer,
    cached_line_vertex_count: u32,
    camera: Camera,
    theme: Theme,
    density: Density,
    cache_mode: CacheMode,
    grid_visible: bool,
    vsync: bool,
    middle_dragging: bool,
    last_cursor: Option<PhysicalPosition<f64>>,
    hovered_junction: Option<usize>,
    selected_junction: Option<usize>,
    frame_meter: FrameMeter,
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
        let mut config = surface
            .get_default_config(&adapter, size.width.max(1), size.height.max(1))
            .expect("surface has no default configuration");
        config.present_mode = wgpu::PresentMode::AutoVsync;
        surface.configure(&device, &config);

        let camera = Camera::default();
        let camera_uniform = camera.uniform(PhysicalSize::new(config.width, config.height));
        let camera_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("OpenE-CAD spike camera uniform"),
            contents: bytemuck::bytes_of(&camera_uniform),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let camera_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("OpenE-CAD spike camera bind group layout"),
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
            label: Some("OpenE-CAD spike camera bind group"),
            layout: &camera_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera_buffer.as_entire_binding(),
            }],
        });

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("OpenE-CAD spike geometry shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("line.wgsl"))),
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("OpenE-CAD spike geometry pipeline layout"),
            bind_group_layouts: &[Some(&camera_bind_group_layout)],
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

        let theme = Theme::Light;
        let density = Density::Reference;
        let grid_visible = true;
        let page_vertices = build_page_vertices(theme);
        let line_vertices = build_line_vertices(theme, density, grid_visible);
        let cached_page_buffer = create_vertex_buffer(
            &device,
            "OpenE-CAD spike cached page vertices",
            &page_vertices,
        );
        let cached_line_buffer = create_vertex_buffer(
            &device,
            "OpenE-CAD spike cached line vertices",
            &line_vertices,
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
            camera_buffer,
            camera_bind_group,
            cached_page_buffer,
            cached_page_vertex_count: page_vertices.len() as u32,
            cached_line_buffer,
            cached_line_vertex_count: line_vertices.len() as u32,
            camera,
            theme,
            density,
            cache_mode: CacheMode::CachedGpuBuffers,
            grid_visible,
            vsync: true,
            middle_dragging: false,
            last_cursor: None,
            hovered_junction: None,
            selected_junction: None,
            frame_meter: FrameMeter::new(),
        }
    }

    fn size(&self) -> PhysicalSize<u32> {
        PhysicalSize::new(self.config.width, self.config.height)
    }

    fn update_camera_uniform(&self) {
        let uniform = self.camera.uniform(self.size());
        self.queue
            .write_buffer(&self.camera_buffer, 0, bytemuck::bytes_of(&uniform));
    }

    fn rebuild_cached_scene(&mut self) {
        let page_vertices = build_page_vertices(self.theme);
        let line_vertices = build_line_vertices(self.theme, self.density, self.grid_visible);
        self.cached_page_buffer = create_vertex_buffer(
            &self.device,
            "OpenE-CAD spike cached page vertices",
            &page_vertices,
        );
        self.cached_page_vertex_count = page_vertices.len() as u32;
        self.cached_line_buffer = create_vertex_buffer(
            &self.device,
            "OpenE-CAD spike cached line vertices",
            &line_vertices,
        );
        self.cached_line_vertex_count = line_vertices.len() as u32;
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

    fn toggle_vsync(&mut self) {
        self.vsync = !self.vsync;
        self.config.present_mode = if self.vsync {
            wgpu::PresentMode::AutoVsync
        } else {
            wgpu::PresentMode::AutoNoVsync
        };
        self.surface.configure(&self.device, &self.config);
        self.frame_meter = FrameMeter::new();
    }

    fn toggle_cache_mode(&mut self) {
        self.cache_mode = match self.cache_mode {
            CacheMode::RebuildEveryFrame => CacheMode::CachedGpuBuffers,
            CacheMode::CachedGpuBuffers => CacheMode::RebuildEveryFrame,
        };
        self.frame_meter = FrameMeter::new();
    }

    fn render(&mut self) {
        self.update_camera_uniform();

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

        let temporary_buffers = if matches!(self.cache_mode, CacheMode::RebuildEveryFrame) {
            let page_vertices = build_page_vertices(self.theme);
            let line_vertices = build_line_vertices(self.theme, self.density, self.grid_visible);
            Some((
                create_vertex_buffer(
                    &self.device,
                    "OpenE-CAD spike rebuilt page vertices",
                    &page_vertices,
                ),
                page_vertices.len() as u32,
                create_vertex_buffer(
                    &self.device,
                    "OpenE-CAD spike rebuilt line vertices",
                    &line_vertices,
                ),
                line_vertices.len() as u32,
            ))
        } else {
            None
        };

        let (page_buffer, page_count, line_buffer, line_count) = match &temporary_buffers {
            Some((page_buffer, page_count, line_buffer, line_count)) => {
                (page_buffer, *page_count, line_buffer, *line_count)
            }
            None => (
                &self.cached_page_buffer,
                self.cached_page_vertex_count,
                &self.cached_line_buffer,
                self.cached_line_vertex_count,
            ),
        };

        // Interaction markers deliberately live in a separate overlay layer. Their radius is
        // defined in physical screen pixels, then converted to world millimetres for this frame.
        // This keeps hover/selection handles usable at every zoom without invalidating the
        // cached static CAD geometry.
        let overlay_vertices = build_junction_overlay_vertices(
            self.theme,
            self.camera,
            self.size(),
            self.hovered_junction,
            self.selected_junction,
        );
        let overlay_count = overlay_vertices.len() as u32;
        let overlay_buffer = create_vertex_buffer(
            &self.device,
            "OpenE-CAD spike junction overlay vertices",
            &overlay_vertices,
        );

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

            pass.set_bind_group(0, &self.camera_bind_group, &[]);

            pass.set_pipeline(&self.fill_pipeline);
            pass.set_vertex_buffer(0, page_buffer.slice(..));
            pass.draw(0..page_count, 0..1);

            pass.set_pipeline(&self.line_pipeline);
            pass.set_vertex_buffer(0, line_buffer.slice(..));
            pass.draw(0..line_count, 0..1);

            pass.set_vertex_buffer(0, overlay_buffer.slice(..));
            pass.draw(0..overlay_count, 0..1);
        }

        self.queue.submit([encoder.finish()]);
        self.window.pre_present_notify();
        self.queue.present(frame);

        if let Some(stats) = self.frame_meter.tick() {
            let segments = (line_count + overlay_count) / 2;
            let hovered = self
                .hovered_junction
                .map(|i| format!("J{}", i + 1))
                .unwrap_or_else(|| "-".to_owned());
            let selected = self
                .selected_junction
                .map(|i| format!("J{}", i + 1))
                .unwrap_or_else(|| "-".to_owned());
            self.window.set_title(&format!(
                "OpenE-CAD S2 — {segments} Segmente — {:.0} FPS — p95 {:.2} ms — {:?} — Zoom {:.0}% — Grid {} — {} — VSync {} — Hover {hovered} — Auswahl {selected}",
                stats.fps,
                stats.p95_ms,
                self.theme,
                self.camera.zoom * 100.0,
                if self.grid_visible { "an" } else { "aus" },
                self.cache_mode.label(),
                if self.vsync { "an" } else { "aus" },
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

    fn set_theme(&mut self, theme: Theme) {
        self.theme = theme;
        self.rebuild_cached_scene();
    }

    fn set_density(&mut self, density: Density) {
        self.density = density;
        self.rebuild_cached_scene();
        self.frame_meter = FrameMeter::new();
    }

    fn toggle_grid(&mut self) {
        self.grid_visible = !self.grid_visible;
        self.rebuild_cached_scene();
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
                    PhysicalKey::Code(KeyCode::Digit1) => state.set_theme(Theme::Light),
                    PhysicalKey::Code(KeyCode::Digit2) => state.set_theme(Theme::DarkCanvas),
                    PhysicalKey::Code(KeyCode::Digit3) => state.set_density(Density::Reference),
                    PhysicalKey::Code(KeyCode::Digit4) => state.set_density(Density::Stress),
                    PhysicalKey::Code(KeyCode::KeyG) => state.toggle_grid(),
                    PhysicalKey::Code(KeyCode::KeyC) => state.toggle_cache_mode(),
                    PhysicalKey::Code(KeyCode::KeyV) => state.toggle_vsync(),
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

fn create_vertex_buffer(
    device: &wgpu::Device,
    label: &'static str,
    vertices: &[Vertex],
) -> wgpu::Buffer {
    device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some(label),
        contents: bytemuck::cast_slice(vertices),
        usage: wgpu::BufferUsages::VERTEX,
    })
}

fn build_page_vertices(theme: Theme) -> Vec<Vertex> {
    let color = theme.page_color();
    [
        [0.0, 0.0],
        [PAGE_W_MM, 0.0],
        [PAGE_W_MM, PAGE_H_MM],
        [0.0, 0.0],
        [PAGE_W_MM, PAGE_H_MM],
        [0.0, PAGE_H_MM],
    ]
    .into_iter()
    .map(|position_mm| Vertex { position_mm, color })
    .collect()
}

fn build_line_vertices(theme: Theme, density: Density, grid_visible: bool) -> Vec<Vertex> {
    let lines = build_scene(theme, density, grid_visible);
    line_segments_to_vertices(lines)
}

fn build_junction_overlay_vertices(
    theme: Theme,
    camera: Camera,
    size: PhysicalSize<u32>,
    hovered_junction: Option<usize>,
    selected_junction: Option<usize>,
) -> Vec<Vertex> {
    let neutral = theme.neutral();
    let hover_color = [0.98, 0.68, 0.08];
    let selected_color = [1.00, 0.36, 0.08];
    let pixels_per_mm = camera.pixels_per_mm(size).max(0.000_1);
    let mut lines = Vec::with_capacity(JUNCTIONS.len() * 16);

    for (index, point) in JUNCTIONS.iter().copied().enumerate() {
        let (radius_px, color) = if selected_junction == Some(index) {
            (JUNCTION_SELECTED_RADIUS_PX, selected_color)
        } else if hovered_junction == Some(index) {
            (JUNCTION_HOVER_RADIUS_PX, hover_color)
        } else {
            (JUNCTION_RADIUS_PX, neutral)
        };
        let radius_mm = radius_px / pixels_per_mm;
        lines.extend(circle_lines(point, radius_mm, color));
    }

    line_segments_to_vertices(lines)
}

fn line_segments_to_vertices(lines: Vec<LineSegment>) -> Vec<Vertex> {
    let mut vertices = Vec::with_capacity(lines.len() * 2);
    for line in lines {
        vertices.push(Vertex {
            position_mm: line.a,
            color: line.color,
        });
        vertices.push(Vertex {
            position_mm: line.b,
            color: line.color,
        });
    }
    vertices
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

fn build_scene(theme: Theme, density: Density, grid_visible: bool) -> Vec<LineSegment> {
    let neutral = theme.neutral();
    let muted = theme.muted();
    let n_blue = [0.09, 0.46, 0.82];
    let pe_green = [0.12, 0.55, 0.29];
    let control_red = [0.83, 0.25, 0.28];
    let cross_ref = [0.92, 0.43, 0.08];

    let mut lines = Vec::new();

    if grid_visible {
        let mut x = 10.0;
        while x < PAGE_W_MM {
            let major = (x as i32) % 50 == 0;
            lines.push(line(
                [x, 5.0],
                [x, PAGE_H_MM - 5.0],
                if major {
                    theme.grid_major()
                } else {
                    theme.grid_minor()
                },
            ));
            x += 10.0;
        }

        let mut y = 10.0;
        while y < PAGE_H_MM {
            let major = (y as i32) % 50 == 0;
            lines.push(line(
                [5.0, y],
                [PAGE_W_MM - 5.0, y],
                if major {
                    theme.grid_major()
                } else {
                    theme.grid_minor()
                },
            ));
            y += 10.0;
        }
    }

    lines.extend([
        line([5.0, 5.0], [415.0, 5.0], muted),
        line([415.0, 5.0], [415.0, 292.0], muted),
        line([415.0, 292.0], [5.0, 292.0], muted),
        line([5.0, 292.0], [5.0, 5.0], muted),
    ]);

    for (y, color) in [
        (35.0, neutral),
        (42.0, neutral),
        (49.0, neutral),
        (58.0, n_blue),
    ] {
        lines.push(line([18.0, y], [402.0, y], color));
    }
    lines.push(line([18.0, 258.0], [402.0, 258.0], pe_green));

    for x in [85.0, 155.0, 225.0] {
        lines.push(line([x, 35.0], [x, 92.0], neutral));
        lines.push(line([x - 5.0, 92.0], [x + 5.0, 104.0], neutral));
        lines.push(line([x, 104.0], [x, 178.0], neutral));
    }

    lines.push(line([285.0, 58.0], [285.0, 110.0], n_blue));
    lines.push(line([285.0, 110.0], [305.0, 110.0], control_red));
    lines.push(line([305.0, 110.0], [305.0, 155.0], control_red));
    lines.push(line([305.0, 155.0], [330.0, 155.0], control_red));
    lines.push(line([330.0, 155.0], [330.0, 58.0], n_blue));

    for y in [35.0, 42.0, 49.0, 58.0, 258.0] {
        lines.push(line([12.0, y - 2.0], [18.0, y], cross_ref));
        lines.push(line([402.0, y], [408.0, y - 2.0], cross_ref));
    }

    for i in 0..8 {
        let x = 255.0 + i as f32 * 8.0;
        lines.push(line([x, 200.0], [x, 213.0], neutral));
        lines.push(line([x - 2.0, 203.0], [x + 2.0, 210.0], neutral));
    }

    if matches!(density, Density::Stress) {
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
