// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, sync::Arc, time::Instant};

use bytemuck::{Pod, Zeroable};
use glyphon::{
    Attrs, Buffer, Cache, Color, Family, FontSystem, Metrics, Resolution, Shaping, SwashCache,
    TextArea, TextAtlas, TextBounds, TextRenderer, Viewport,
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
const HIT_RADIUS_PX: f32 = 11.0;
const JUNCTION_RADIUS_PX: f32 = 3.5;
const JUNCTION_HOVER_RADIUS_PX: f32 = 6.0;
const JUNCTION_SELECTED_RADIUS_PX: f32 = 7.0;
const BASE_TEXT_PX: f32 = 16.0;

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

    fn text_neutral(self) -> Color {
        match self {
            Self::Light => Color::rgb(24, 30, 36),
            Self::DarkCanvas => Color::rgb(225, 230, 234),
        }
    }

    fn text_muted(self) -> Color {
        match self {
            Self::Light => Color::rgb(95, 103, 110),
            Self::DarkCanvas => Color::rgb(160, 168, 176),
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

    fn world_to_screen(self, p: [f32; 2], size: PhysicalSize<u32>) -> [f32; 2] {
        let width = size.width.max(1) as f32;
        let height = size.height.max(1) as f32;
        let scale = self.pixels_per_mm(size);
        [
            width * 0.5 + (p[0] - self.center_x_mm) * scale,
            height * 0.5 + (p[1] - self.center_y_mm) * scale,
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
enum TextKind {
    Neutral,
    Muted,
    Blue,
    Green,
    Orange,
    Red,
}

impl TextKind {
    fn color(self, theme: Theme) -> Color {
        match self {
            Self::Neutral => theme.text_neutral(),
            Self::Muted => theme.text_muted(),
            Self::Blue => Color::rgb(22, 117, 209),
            Self::Green => Color::rgb(31, 140, 74),
            Self::Orange => Color::rgb(235, 110, 20),
            Self::Red => Color::rgb(211, 63, 71),
        }
    }
}

struct WorldText {
    buffer: Buffer,
    position_mm: [f32; 2],
    height_mm: f32,
    kind: TextKind,
    min_screen_px: f32,
}

impl WorldText {
    fn new(
        font_system: &mut FontSystem,
        text: &str,
        position_mm: [f32; 2],
        height_mm: f32,
        kind: TextKind,
        min_screen_px: f32,
    ) -> Self {
        let mut buffer = Buffer::new(font_system, Metrics::new(BASE_TEXT_PX, BASE_TEXT_PX * 1.25));
        buffer.set_size(Some(1000.0), Some(BASE_TEXT_PX * 2.0));
        buffer.set_text(
            text,
            &Attrs::new().family(Family::SansSerif),
            Shaping::Advanced,
            None,
        );
        buffer.shape_until_scroll(font_system, false);
        Self {
            buffer,
            position_mm,
            height_mm,
            kind,
            min_screen_px,
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
    page_buffer: wgpu::Buffer,
    page_count: u32,
    line_buffer: wgpu::Buffer,
    line_count: u32,
    camera: Camera,
    theme: Theme,
    density: Density,
    grid_visible: bool,
    vsync: bool,
    middle_dragging: bool,
    last_cursor: Option<PhysicalPosition<f64>>,
    hovered_junction: Option<usize>,
    selected_junction: Option<usize>,
    frame_meter: FrameMeter,
    font_system: FontSystem,
    swash_cache: SwashCache,
    text_viewport: Viewport,
    text_atlas: TextAtlas,
    text_renderer: TextRenderer,
    world_texts: Vec<WorldText>,
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
            label: Some("OpenE-CAD integrated camera"),
            contents: bytemuck::bytes_of(&camera_uniform),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let camera_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("OpenE-CAD integrated camera layout"),
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
            label: Some("OpenE-CAD integrated camera bind group"),
            layout: &camera_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera_buffer.as_entire_binding(),
            }],
        });

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("OpenE-CAD integrated geometry shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("../line.wgsl"))),
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("OpenE-CAD integrated pipeline layout"),
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
            "OpenE-CAD integrated line pipeline",
            wgpu::PrimitiveTopology::LineList,
        );
        let fill_pipeline = make_pipeline(
            "OpenE-CAD integrated fill pipeline",
            wgpu::PrimitiveTopology::TriangleList,
        );

        let theme = Theme::Light;
        let density = Density::Reference;
        let grid_visible = true;
        let page_vertices = build_page_vertices(theme);
        let line_vertices = build_scene_vertices(theme, density, grid_visible);
        let page_buffer = create_vertex_buffer(&device, "OpenE-CAD integrated page", &page_vertices);
        let line_buffer = create_vertex_buffer(&device, "OpenE-CAD integrated scene", &line_vertices);

        let mut font_system = FontSystem::new();
        let swash_cache = SwashCache::new();
        let text_cache = Cache::new(&device);
        let text_viewport = Viewport::new(&device, &text_cache);
        let mut text_atlas = TextAtlas::new(&device, &queue, &text_cache, config.format);
        let text_renderer = TextRenderer::new(
            &mut text_atlas,
            &device,
            wgpu::MultisampleState::default(),
            None,
        );
        let world_texts = build_world_texts(&mut font_system);

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
            line_buffer,
            line_count: line_vertices.len() as u32,
            camera,
            theme,
            density,
            grid_visible,
            vsync: true,
            middle_dragging: false,
            last_cursor: None,
            hovered_junction: None,
            selected_junction: None,
            frame_meter: FrameMeter::new(),
            font_system,
            swash_cache,
            text_viewport,
            text_atlas,
            text_renderer,
            world_texts,
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

    fn rebuild_scene(&mut self) {
        let page_vertices = build_page_vertices(self.theme);
        let line_vertices = build_scene_vertices(self.theme, self.density, self.grid_visible);
        self.page_buffer = create_vertex_buffer(&self.device, "OpenE-CAD integrated page", &page_vertices);
        self.page_count = page_vertices.len() as u32;
        self.line_buffer = create_vertex_buffer(&self.device, "OpenE-CAD integrated scene", &line_vertices);
        self.line_count = line_vertices.len() as u32;
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

    fn render(&mut self) {
        self.update_camera_uniform();
        self.text_viewport.update(
            &self.queue,
            Resolution {
                width: self.config.width,
                height: self.config.height,
            },
        );

        let size = self.size();
        let pixels_per_mm = self.camera.pixels_per_mm(size);
        let bounds = TextBounds {
            left: 0,
            top: 0,
            right: self.config.width as i32,
            bottom: self.config.height as i32,
        };
        let theme = self.theme;
        let text_areas: Vec<_> = self
            .world_texts
            .iter()
            .filter_map(|item| {
                let desired_px = item.height_mm * pixels_per_mm;
                if desired_px < item.min_screen_px {
                    return None;
                }
                let screen = self.camera.world_to_screen(item.position_mm, size);
                Some(TextArea {
                    buffer: &item.buffer,
                    left: screen[0],
                    top: screen[1],
                    scale: desired_px / BASE_TEXT_PX,
                    bounds,
                    default_color: item.kind.color(theme),
                    custom_glyphs: &[],
                })
            })
            .collect();
        self.text_renderer
            .prepare(
                &self.device,
                &self.queue,
                &mut self.font_system,
                &mut self.text_atlas,
                &self.text_viewport,
                text_areas,
                &mut self.swash_cache,
            )
            .expect("glyphon prepare failed");

        let marker_vertices = build_marker_vertices(
            self.theme,
            self.camera,
            size,
            self.hovered_junction,
            self.selected_junction,
        );
        let marker_buffer = create_vertex_buffer(
            &self.device,
            "OpenE-CAD integrated interaction overlay",
            &marker_vertices,
        );

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
        let view = frame
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("OpenE-CAD integrated encoder"),
            });

        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("OpenE-CAD integrated render pass"),
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
            pass.set_vertex_buffer(0, self.page_buffer.slice(..));
            pass.draw(0..self.page_count, 0..1);

            pass.set_pipeline(&self.line_pipeline);
            pass.set_vertex_buffer(0, self.line_buffer.slice(..));
            pass.draw(0..self.line_count, 0..1);

            pass.set_vertex_buffer(0, marker_buffer.slice(..));
            pass.draw(0..marker_vertices.len() as u32, 0..1);

            self.text_renderer
                .render(&self.text_atlas, &self.text_viewport, &mut pass)
                .expect("glyphon render failed");
        }

        self.queue.submit([encoder.finish()]);
        self.window.pre_present_notify();
        self.queue.present(frame);
        self.text_atlas.trim();

        if let Some(stats) = self.frame_meter.tick() {
            let hovered = self
                .hovered_junction
                .map(|i| format!("J{}", i + 1))
                .unwrap_or_else(|| "-".to_owned());
            let selected = self
                .selected_junction
                .map(|i| format!("J{}", i + 1))
                .unwrap_or_else(|| "-".to_owned());
            self.window.set_title(&format!(
                "OpenE-CAD S2 Integrated — {} Segmente — {:.0} FPS — p95 {:.2} ms — {:?} — Zoom {:.0}% — Grid {} — Text world-space — VSync {} — Hover {hovered} — Auswahl {selected}",
                self.line_count / 2,
                stats.fps,
                stats.p95_ms,
                self.theme,
                self.camera.zoom * 100.0,
                if self.grid_visible { "an" } else { "aus" },
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
        self.rebuild_scene();
    }

    fn set_density(&mut self, density: Density) {
        self.density = density;
        self.rebuild_scene();
        self.frame_meter = FrameMeter::new();
    }

    fn set_zoom(&mut self, zoom: f32) {
        self.camera.zoom = zoom;
        if let Some(cursor) = self.last_cursor {
            self.update_hover(cursor);
        }
    }

    fn toggle_grid(&mut self) {
        self.grid_visible = !self.grid_visible;
        self.rebuild_scene();
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
                        .with_title("OpenE-CAD S2 Integrated CAD + Text")
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
            } => state.middle_dragging = button_state == ElementState::Pressed,
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
                    PhysicalKey::Code(KeyCode::Digit5) => state.set_zoom(0.25),
                    PhysicalKey::Code(KeyCode::Digit6) => state.set_zoom(1.0),
                    PhysicalKey::Code(KeyCode::Digit7) => state.set_zoom(4.0),
                    PhysicalKey::Code(KeyCode::KeyG) => state.toggle_grid(),
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

fn create_vertex_buffer(device: &wgpu::Device, label: &'static str, vertices: &[Vertex]) -> wgpu::Buffer {
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

fn line(a: [f32; 2], b: [f32; 2], color: [f32; 3]) -> LineSegment {
    LineSegment { a, b, color }
}

fn build_scene_vertices(theme: Theme, density: Density, grid_visible: bool) -> Vec<Vertex> {
    let lines = build_scene(theme, density, grid_visible);
    let mut vertices = Vec::with_capacity(lines.len() * 2);
    for segment in lines {
        vertices.push(Vertex {
            position_mm: segment.a,
            color: segment.color,
        });
        vertices.push(Vertex {
            position_mm: segment.b,
            color: segment.color,
        });
    }
    vertices
}

fn circle_lines(center: [f32; 2], radius_mm: f32, color: [f32; 3]) -> Vec<LineSegment> {
    const STEPS: usize = 20;
    let mut result = Vec::with_capacity(STEPS);
    for i in 0..STEPS {
        let a0 = i as f32 / STEPS as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / STEPS as f32 * std::f32::consts::TAU;
        result.push(line(
            [center[0] + radius_mm * a0.cos(), center[1] + radius_mm * a0.sin()],
            [center[0] + radius_mm * a1.cos(), center[1] + radius_mm * a1.sin()],
            color,
        ));
    }
    result
}

fn build_marker_vertices(
    theme: Theme,
    camera: Camera,
    size: PhysicalSize<u32>,
    hovered: Option<usize>,
    selected: Option<usize>,
) -> Vec<Vertex> {
    let pixels_per_mm = camera.pixels_per_mm(size).max(0.000_1);
    let normal = theme.neutral();
    let hover_color = [0.98, 0.68, 0.08];
    let selected_color = [1.00, 0.36, 0.08];
    let mut lines = Vec::new();
    for (index, point) in JUNCTIONS.iter().copied().enumerate() {
        let (radius_px, color) = if selected == Some(index) {
            (JUNCTION_SELECTED_RADIUS_PX, selected_color)
        } else if hovered == Some(index) {
            (JUNCTION_HOVER_RADIUS_PX, hover_color)
        } else {
            (JUNCTION_RADIUS_PX, normal)
        };
        lines.extend(circle_lines(point, radius_px / pixels_per_mm, color));
    }
    let mut vertices = Vec::with_capacity(lines.len() * 2);
    for segment in lines {
        vertices.push(Vertex {
            position_mm: segment.a,
            color: segment.color,
        });
        vertices.push(Vertex {
            position_mm: segment.b,
            color: segment.color,
        });
    }
    vertices
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

fn build_world_texts(font_system: &mut FontSystem) -> Vec<WorldText> {
    vec![
        WorldText::new(font_system, "L1", [20.0, 31.0], 2.7, TextKind::Muted, 5.0),
        WorldText::new(font_system, "L2", [20.0, 38.0], 2.7, TextKind::Muted, 5.0),
        WorldText::new(font_system, "L3", [20.0, 45.0], 2.7, TextKind::Muted, 5.0),
        WorldText::new(font_system, "N", [20.0, 54.0], 2.7, TextKind::Blue, 5.0),
        WorldText::new(font_system, "PE", [20.0, 254.0], 2.7, TextKind::Green, 5.0),
        WorldText::new(font_system, "-Q1", [80.0, 78.0], 3.0, TextKind::Neutral, 7.0),
        WorldText::new(font_system, "-F10 B16", [149.0, 78.0], 3.0, TextKind::Neutral, 7.0),
        WorldText::new(font_system, "-K1", [279.0, 101.0], 3.0, TextKind::Neutral, 7.0),
        WorldText::new(font_system, "A1", [297.0, 104.0], 2.4, TextKind::Muted, 7.0),
        WorldText::new(font_system, "A2", [311.0, 158.0], 2.4, TextKind::Muted, 7.0),
        WorldText::new(font_system, "13", [299.0, 117.0], 2.4, TextKind::Muted, 7.0),
        WorldText::new(font_system, "14", [299.0, 145.0], 2.4, TextKind::Muted, 7.0),
        WorldText::new(font_system, "230 V AC", [309.0, 105.0], 2.4, TextKind::Red, 7.0),
        WorldText::new(font_system, "/2.8", [8.0, 28.0], 2.7, TextKind::Orange, 6.0),
        WorldText::new(font_system, "/4.1", [394.0, 28.0], 2.7, TextKind::Orange, 6.0),
        WorldText::new(font_system, "-X1:12", [251.0, 217.0], 3.0, TextKind::Neutral, 7.0),
        WorldText::new(font_system, "Schütz Motor Lüftung", [275.0, 170.0], 3.0, TextKind::Neutral, 8.0),
        WorldText::new(font_system, "Eaton DILM17 · 18 A · 7,5 kW", [275.0, 176.0], 2.5, TextKind::Muted, 8.0),
    ]
}

fn main() {
    env_logger::init();
    let event_loop = EventLoop::new().expect("failed to create event loop");
    event_loop.set_control_flow(ControlFlow::Poll);
    let mut app = App::default();
    event_loop.run_app(&mut app).expect("event loop failed");
}
