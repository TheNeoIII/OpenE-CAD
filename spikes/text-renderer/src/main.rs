// SPDX-License-Identifier: MPL-2.0

use std::sync::Arc;

use glyphon::{
    Attrs, Buffer, Cache, Color, Family, FontSystem, Metrics, Resolution, Shaping, SwashCache,
    TextArea, TextAtlas, TextBounds, TextRenderer, Viewport,
};
use winit::{
    application::ApplicationHandler,
    dpi::PhysicalSize,
    event::{ElementState, WindowEvent},
    event_loop::{ActiveEventLoop, EventLoop, OwnedDisplayHandle},
    keyboard::{KeyCode, PhysicalKey},
    window::{Window, WindowId},
};

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
            Self::Light => Color::rgb(90, 100, 110),
            Self::Dark => Color::rgb(150, 160, 170),
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum SampleColor {
    Foreground,
    Muted,
    Blue,
    Green,
    Orange,
    Red,
}

impl SampleColor {
    fn resolve(self, theme: Theme) -> Color {
        match self {
            Self::Foreground => theme.foreground(),
            Self::Muted => theme.muted(),
            Self::Blue => Color::rgb(22, 117, 209),
            Self::Green => Color::rgb(31, 140, 74),
            Self::Orange => Color::rgb(235, 110, 20),
            Self::Red => Color::rgb(211, 63, 71),
        }
    }
}

struct Sample {
    buffer: Buffer,
    left: f32,
    top: f32,
    color: SampleColor,
}

impl Sample {
    fn new(
        font_system: &mut FontSystem,
        text: &str,
        font_px: f32,
        left: f32,
        top: f32,
        color: SampleColor,
        family: Family<'static>,
    ) -> Self {
        let line_height = font_px * 1.25;
        let mut buffer = Buffer::new(font_system, Metrics::new(font_px, line_height));
        buffer.set_size(Some(1300.0), Some(line_height * 1.7));
        buffer.set_text(
            text,
            &Attrs::new().family(family),
            Shaping::Advanced,
            None,
        );
        buffer.shape_until_scroll(font_system, false);
        Self {
            buffer,
            left,
            top,
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
    text_renderer: TextRenderer,
    samples: Vec<Sample>,
    theme: Theme,
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

        let mut font_system = FontSystem::new();
        let swash_cache = SwashCache::new();
        let cache = Cache::new(&device);
        let viewport = Viewport::new(&device, &cache);
        let mut atlas = TextAtlas::new(&device, &queue, &cache, config.format);
        let text_renderer = TextRenderer::new(
            &mut atlas,
            &device,
            wgpu::MultisampleState::default(),
            None,
        );

        let samples = vec![
            Sample::new(
                &mut font_system,
                "OpenE-CAD – technischer Text / glyphon 0.12 + cosmic-text 0.19",
                22.0,
                28.0,
                24.0,
                SampleColor::Foreground,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "8 px   -K1  A1 A2  13 14  -X1:12  /4.1  %Q0.3",
                8.0,
                30.0,
                86.0,
                SampleColor::Foreground,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "9 px   -F10 B16  L1 L2 L3  N  PE  230 V AC  24 V DC",
                9.0,
                30.0,
                116.0,
                SampleColor::Foreground,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "10 px  Schütz Motor Lüftung · Eaton DILM17 · 18 A · 7,5 kW",
                10.0,
                30.0,
                148.0,
                SampleColor::Foreground,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "12 px  Ä Ö Ü ä ö ü ß · µ Ω Δ · IEC 81346 · Seite 3 / 10",
                12.0,
                30.0,
                182.0,
                SampleColor::Foreground,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "14 px  -K1  Schütz Motor Lüftung    +UV2    Reihe 2",
                14.0,
                30.0,
                220.0,
                SampleColor::Foreground,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "Monospace: -K1  DILM17-10(230V50HZ)  X 1440 · Y 560 mm",
                12.0,
                30.0,
                268.0,
                SampleColor::Muted,
                Family::Monospace,
            ),
            Sample::new(
                &mut font_system,
                "N   Neutralleiter / N-Potential",
                13.0,
                30.0,
                330.0,
                SampleColor::Blue,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "PE  Schutzleiter / Protective Earth",
                13.0,
                30.0,
                366.0,
                SampleColor::Green,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "/4.1  Seitenfortsetzung / Querverweis",
                13.0,
                30.0,
                402.0,
                SampleColor::Orange,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "Steuerpotential geschaltet / Hinweisfarbe",
                13.0,
                30.0,
                438.0,
                SampleColor::Red,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "Ctrl+K  Gerät, Artikel, Seite, Befehl …",
                16.0,
                30.0,
                510.0,
                SampleColor::Foreground,
                Family::SansSerif,
            ),
            Sample::new(
                &mut font_system,
                "Theme wechseln: 1 = Light · 2 = Dark · R = neu zeichnen · Esc = Ende",
                12.0,
                30.0,
                558.0,
                SampleColor::Muted,
                Family::SansSerif,
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
            text_renderer,
            samples,
            theme: Theme::Light,
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
        let text_areas: Vec<_> = self
            .samples
            .iter()
            .map(|sample| TextArea {
                buffer: &sample.buffer,
                left: sample.left,
                top: sample.top,
                scale: 1.0,
                bounds,
                default_color: sample.color.resolve(theme),
                custom_glyphs: &[],
            })
            .collect();

        self.text_renderer
            .prepare(
                &self.device,
                &self.queue,
                &mut self.font_system,
                &mut self.atlas,
                &self.viewport,
                text_areas,
                &mut self.swash_cache,
            )
            .expect("glyphon prepare failed");

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
                label: Some("OpenE-CAD glyphon spike encoder"),
            });

        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("OpenE-CAD glyphon spike render pass"),
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
            self.text_renderer
                .render(&self.atlas, &self.viewport, &mut pass)
                .expect("glyphon render failed");
        }

        self.queue.submit([encoder.finish()]);
        self.window.pre_present_notify();
        self.queue.present(frame);
        self.atlas.trim();
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
                        .with_title("OpenE-CAD S2 Text Spike – 1 Light · 2 Dark")
                        .with_inner_size(PhysicalSize::new(1200, 700)),
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
            WindowEvent::Resized(size) => {
                state.resize(size);
                state.window.request_redraw();
            }
            WindowEvent::RedrawRequested => state.render(),
            WindowEvent::KeyboardInput { event, .. } if event.state == ElementState::Pressed => {
                match event.physical_key {
                    PhysicalKey::Code(KeyCode::Digit1) => state.theme = Theme::Light,
                    PhysicalKey::Code(KeyCode::Digit2) => state.theme = Theme::Dark,
                    PhysicalKey::Code(KeyCode::KeyR) => {}
                    PhysicalKey::Code(KeyCode::Escape) => {
                        event_loop.exit();
                        return;
                    }
                    _ => return,
                }
                state.window.request_redraw();
            }
            _ => {}
        }
    }
}

fn main() {
    env_logger::init();
    let event_loop = EventLoop::new().expect("failed to create event loop");
    let mut app = App::default();
    event_loop.run_app(&mut app).expect("event loop failed");
}
