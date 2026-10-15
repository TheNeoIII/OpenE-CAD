// SPDX-License-Identifier: MPL-2.0

use std::sync::Arc;

use glyphon::{
    Attrs, Buffer, Cache, Color, Family, FontSystem, Metrics, Resolution, Shaping, SwashCache,
    TextArea, TextAtlas, TextBounds, TextRenderer, Viewport,
};
use opene_cad_text_lod_spike::{TextLodPolicy, TextPriority};
use winit::{
    application::ApplicationHandler,
    dpi::PhysicalSize,
    event::{ElementState, WindowEvent},
    event_loop::{ActiveEventLoop, EventLoop, OwnedDisplayHandle},
    keyboard::{KeyCode, PhysicalKey},
    window::{Window, WindowId},
};

const BASE_TEXT_PX: f32 = 16.0;

#[derive(Debug, Clone, Copy)]
enum Theme {
    Light,
    Dark,
}

impl Theme {
    fn background(self) -> wgpu::Color {
        match self {
            Self::Light => wgpu::Color {
                r: 0.97,
                g: 0.975,
                b: 0.98,
                a: 1.0,
            },
            Self::Dark => wgpu::Color {
                r: 0.055,
                g: 0.062,
                b: 0.070,
                a: 1.0,
            },
        }
    }

    fn foreground(self) -> Color {
        match self {
            Self::Light => Color::rgb(24, 30, 36),
            Self::Dark => Color::rgb(225, 230, 234),
        }
    }

    fn muted(self) -> Color {
        match self {
            Self::Light => Color::rgb(96, 104, 112),
            Self::Dark => Color::rgb(155, 164, 172),
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum TextColor {
    Neutral,
    Muted,
    Blue,
    Green,
    Orange,
}

impl TextColor {
    fn resolve(self, theme: Theme) -> Color {
        match self {
            Self::Neutral => theme.foreground(),
            Self::Muted => theme.muted(),
            Self::Blue => Color::rgb(22, 117, 209),
            Self::Green => Color::rgb(31, 140, 74),
            Self::Orange => Color::rgb(235, 110, 20),
        }
    }
}

struct Sample {
    buffer: Buffer,
    left: f32,
    top: f32,
    base_px: f32,
    priority: TextPriority,
    color: TextColor,
}

impl Sample {
    fn new(
        font_system: &mut FontSystem,
        text: &str,
        left: f32,
        top: f32,
        base_px: f32,
        priority: TextPriority,
        color: TextColor,
    ) -> Self {
        let mut buffer = Buffer::new(
            font_system,
            Metrics::new(BASE_TEXT_PX, BASE_TEXT_PX * 1.25),
        );
        buffer.set_size(Some(1600.0), Some(BASE_TEXT_PX * 2.0));
        buffer.set_text(
            text,
            &Attrs::new().family(Family::SansSerif),
            Shaping::Advanced,
            None,
        );
        buffer.shape_until_scroll(font_system, false);
        Self {
            buffer,
            left,
            top,
            base_px,
            priority,
            color,
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
    font_system: FontSystem,
    swash_cache: SwashCache,
    viewport: Viewport,
    atlas: TextAtlas,
    renderer: TextRenderer,
    samples: Vec<Sample>,
    zoom: f32,
    theme: Theme,
    policy: TextLodPolicy,
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
            .expect("surface configuration unavailable");
        surface.configure(&device, &config);

        let mut font_system = FontSystem::new();
        let swash_cache = SwashCache::new();
        let cache = Cache::new(&device);
        let viewport = Viewport::new(&device, &cache);
        let mut atlas = TextAtlas::new(&device, &queue, &cache, config.format);
        let renderer = TextRenderer::new(
            &mut atlas,
            &device,
            wgpu::MultisampleState::default(),
            None,
        );

        let samples = vec![
            Sample::new(
                &mut font_system,
                "-K1   -X1:12   A1/A2   13/14   N   PE   /4.1",
                55.0,
                120.0,
                42.0,
                TextPriority::Essential,
                TextColor::Neutral,
            ),
            Sample::new(
                &mut font_system,
                "Schütz Motor Lüftung   Motor M1   Steuerung 24 V DC",
                55.0,
                205.0,
                34.0,
                TextPriority::Normal,
                TextColor::Neutral,
            ),
            Sample::new(
                &mut font_system,
                "Eaton DILM17 · 18 A · 7,5 kW · Reihe 2 · +UV2",
                55.0,
                280.0,
                30.0,
                TextPriority::Detail,
                TextColor::Muted,
            ),
            Sample::new(
                &mut font_system,
                "N   Neutralleiter / N-Potential",
                55.0,
                390.0,
                32.0,
                TextPriority::Essential,
                TextColor::Blue,
            ),
            Sample::new(
                &mut font_system,
                "PE  Schutzleiter / Protective Earth",
                55.0,
                455.0,
                32.0,
                TextPriority::Essential,
                TextColor::Green,
            ),
            Sample::new(
                &mut font_system,
                "/4.1 Seitenfortsetzung / Querverweis",
                55.0,
                520.0,
                32.0,
                TextPriority::Essential,
                TextColor::Orange,
            ),
        ];

        Self {
            instance,
            window,
            device,
            queue,
            surface,
            config,
            font_system,
            swash_cache,
            viewport,
            atlas,
            renderer,
            samples,
            zoom: 1.0,
            theme: Theme::Light,
            policy: TextLodPolicy::default(),
        }
    }

    fn resize(&mut self, size: PhysicalSize<u32>) {
        if size.width == 0 || size.height == 0 {
            return;
        }
        self.config.width = size.width;
        self.config.height = size.height;
        self.surface.configure(&self.device, &self.config);
    }

    fn render(&mut self) {
        self.viewport.update(
            &self.queue,
            Resolution {
                width: self.config.width,
                height: self.config.height,
            },
        );

        let bounds = TextBounds {
            left: 0,
            top: 0,
            right: self.config.width as i32,
            bottom: self.config.height as i32,
        };
        let theme = self.theme;
        let zoom = self.zoom;
        let policy = self.policy;
        let text_areas: Vec<_> = self
            .samples
            .iter()
            .filter_map(|sample| {
                let screen_px = sample.base_px * zoom;
                if !policy.visible(zoom, screen_px, sample.priority) {
                    return None;
                }
                Some(TextArea {
                    buffer: &sample.buffer,
                    left: sample.left,
                    top: sample.top,
                    scale: screen_px / BASE_TEXT_PX,
                    bounds,
                    default_color: sample.color.resolve(theme),
                    custom_glyphs: &[],
                })
            })
            .collect();

        self.renderer
            .prepare(
                &self.device,
                &self.queue,
                &mut self.font_system,
                &mut self.atlas,
                &self.viewport,
                text_areas,
                &mut self.swash_cache,
            )
            .expect("text prepare failed");

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
                label: Some("OpenE-CAD text LOD preview encoder"),
            });
        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("OpenE-CAD text LOD preview pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    depth_slice: None,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(self.theme.background()),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });
            self.renderer
                .render(&self.atlas, &self.viewport, &mut pass)
                .expect("text render failed");
        }

        self.queue.submit([encoder.finish()]);
        self.window.pre_present_notify();
        self.queue.present(frame);
        self.atlas.trim();

        self.window.set_title(&format!(
            "OpenE-CAD S2 Text LOD v2 — Zoom {:.0}% — ab 20% alle Texte sichtbar — 1:100 2:75 3:25 4:20 5:15 6:10 — L/D Theme",
            self.zoom * 100.0
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
                        .with_title("OpenE-CAD S2 Text LOD v2")
                        .with_inner_size(PhysicalSize::new(1300, 760)),
                )
                .expect("window creation failed"),
        );
        self.state = Some(pollster::block_on(State::new(
            event_loop.owned_display_handle(),
            window.clone(),
        )));
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
            WindowEvent::KeyboardInput { event, .. } if event.state == ElementState::Pressed => {
                match event.physical_key {
                    PhysicalKey::Code(KeyCode::Digit1) => state.zoom = 1.00,
                    PhysicalKey::Code(KeyCode::Digit2) => state.zoom = 0.75,
                    PhysicalKey::Code(KeyCode::Digit3) => state.zoom = 0.25,
                    PhysicalKey::Code(KeyCode::Digit4) => state.zoom = 0.20,
                    PhysicalKey::Code(KeyCode::Digit5) => state.zoom = 0.15,
                    PhysicalKey::Code(KeyCode::Digit6) => state.zoom = 0.10,
                    PhysicalKey::Code(KeyCode::KeyL) => state.theme = Theme::Light,
                    PhysicalKey::Code(KeyCode::KeyD) => state.theme = Theme::Dark,
                    PhysicalKey::Code(KeyCode::Escape) => event_loop.exit(),
                    _ => {}
                }
            }
            _ => {}
        }
    }
}

fn main() {
    env_logger::init();
    let event_loop = EventLoop::new().expect("event loop creation failed");
    let mut app = App::default();
    event_loop.run_app(&mut app).expect("event loop failed");
}
