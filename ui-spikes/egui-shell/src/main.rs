// SPDX-License-Identifier: MPL-2.0

use eframe::egui::{self, Align, Color32, Key, Layout, RichText, Sense, Stroke, Vec2};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WorkspaceTab {
    Project,
    Schematic,
    Cabinet,
    Data,
    Documentation,
}

impl WorkspaceTab {
    const ALL: [Self; 5] = [
        Self::Project,
        Self::Schematic,
        Self::Cabinet,
        Self::Data,
        Self::Documentation,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::Project => "Projekt",
            Self::Schematic => "Stromlaufplan",
            Self::Cabinet => "Aufbau",
            Self::Data => "Daten",
            Self::Documentation => "Dokumentation",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum NavigatorTab {
    Pages,
    Devices,
    Terminals,
    Cables,
    Plc,
}

impl NavigatorTab {
    const ALL: [Self; 5] = [
        Self::Pages,
        Self::Devices,
        Self::Terminals,
        Self::Cables,
        Self::Plc,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::Pages => "Seiten",
            Self::Devices => "Betriebsmittel",
            Self::Terminals => "Klemmen",
            Self::Cables => "Kabel",
            Self::Plc => "SPS",
        }
    }
}

struct OpenEcadApp {
    workspace: WorkspaceTab,
    navigator: NavigatorTab,
    dark: bool,
    command_palette: bool,
    command_query: String,
    selected_page: usize,
    selected_data_row: usize,
    inspector_function: String,
    inspector_location: String,
    inspector_article: String,
    finding_only: bool,
    status_message: String,
}

impl OpenEcadApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        cc.egui_ctx.set_visuals(egui::Visuals::dark());
        Self {
            workspace: WorkspaceTab::Schematic,
            navigator: NavigatorTab::Pages,
            dark: true,
            command_palette: false,
            command_query: String::new(),
            selected_page: 2,
            selected_data_row: 0,
            inspector_function: "Schütz Motor Lüftung".to_owned(),
            inspector_location: "+UV2".to_owned(),
            inspector_article: "DILM17-10(230V50HZ)".to_owned(),
            finding_only: false,
            status_message: "gespeichert".to_owned(),
        }
    }

    fn process_shortcuts(&mut self, ctx: &egui::Context) {
        let (ctrl_k, escape, f2, delete, undo) = ctx.input(|i| {
            (
                i.modifiers.ctrl && i.key_pressed(Key::K),
                i.key_pressed(Key::Escape),
                i.key_pressed(Key::F2),
                i.key_pressed(Key::Delete),
                i.modifiers.ctrl && i.key_pressed(Key::Z),
            )
        });

        if ctrl_k {
            self.command_palette = true;
            self.command_query.clear();
        }
        if escape && self.command_palette {
            self.command_palette = false;
        }
        if f2 {
            self.status_message = "F2: Umbenennen/Bearbeiten".to_owned();
        }
        if delete {
            self.status_message = "Delete: Auswahl löschen".to_owned();
        }
        if undo {
            self.status_message = "Ctrl+Z: Undo".to_owned();
        }
    }

    fn apply_theme(&self, ctx: &egui::Context) {
        if self.dark {
            ctx.set_visuals(egui::Visuals::dark());
        } else {
            ctx.set_visuals(egui::Visuals::light());
        }
    }

    fn top_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("app_bar")
            .exact_height(36.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.spacing_mut().item_spacing.x = 6.0;
                    ui.label(RichText::new("⚡").size(18.0));
                    ui.vertical(|ui| {
                        ui.label(RichText::new("Lindenstraße 12").strong());
                        ui.label(RichText::new("+UV2 · Rev. B").small().weak());
                    });
                    ui.separator();

                    for tab in WorkspaceTab::ALL {
                        let selected = self.workspace == tab;
                        if ui.selectable_label(selected, tab.label()).clicked() {
                            self.workspace = tab;
                        }
                    }

                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if ui.button(if self.dark { "☀" } else { "☾" }).clicked() {
                            self.dark = !self.dark;
                            self.apply_theme(ctx);
                        }
                        ui.label("MK");
                        ui.separator();
                        ui.label(RichText::new("UX-Konzept").weak());
                    });
                });
            });

        egui::TopBottomPanel::top("context_toolbar")
            .exact_height(34.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    for tool in ["▣", "↖", "⌁", "T", "Symbol, Makro, Artikel …", "↶", "↷"] {
                        let _ = ui.small_button(tool);
                    }
                    ui.separator();
                    let palette = ui.add_sized(
                        [360.0, 23.0],
                        egui::Button::new("⌕  Gerät, Artikel, Seite, Befehl …        Ctrl K"),
                    );
                    if palette.clicked() {
                        self.command_palette = true;
                        self.command_query.clear();
                    }
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        ui.label(RichText::new("Seite 3 / 10").strong());
                        ui.label(RichText::new("-K1 Schütz Motor Lüftung").color(Color32::from_rgb(38, 190, 220)));
                    });
                });
            });
    }

    fn navigator(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("navigator")
            .resizable(true)
            .default_width(240.0)
            .width_range(170.0..=420.0)
            .show(ctx, |ui| {
                ui.horizontal_wrapped(|ui| {
                    for tab in NavigatorTab::ALL {
                        if ui.selectable_label(self.navigator == tab, tab.label()).clicked() {
                            self.navigator = tab;
                        }
                    }
                });
                ui.separator();
                ui.add(egui::TextEdit::singleline(&mut String::new()).hint_text("Filtern …"));
                ui.add_space(4.0);

                let row_height = 22.0;
                egui::ScrollArea::vertical().show_rows(ui, row_height, 1_000, |ui, range| {
                    for row in range {
                        let label = match self.navigator {
                            NavigatorTab::Pages => format!("{:>3}  Seite / Funktionsgruppe {:04}", row + 1, row + 1),
                            NavigatorTab::Devices => format!("-K{:04}  Betriebsmittel {:04}", row + 1, row + 1),
                            NavigatorTab::Terminals => format!("-X1:{:04}  Klemme", row + 1),
                            NavigatorTab::Cables => format!("-W{:04}  Kabel / Leitung", row + 1),
                            NavigatorTab::Plc => format!("%Q{}.{}  SPS-Kanal", row / 8, row % 8),
                        };
                        let selected = row == self.selected_page;
                        if ui.selectable_label(selected, label).clicked() {
                            self.selected_page = row;
                        }
                    }
                });
            });
    }

    fn inspector(&mut self, ctx: &egui::Context) {
        egui::SidePanel::right("inspector")
            .resizable(true)
            .default_width(300.0)
            .width_range(230.0..=500.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.selectable_label(true, "Eigenschaften");
                    ui.selectable_label(false, "Prüfung");
                    ui.label(RichText::new("10").color(Color32::from_rgb(220, 80, 70)));
                });
                ui.separator();
                ui.heading("-K1");
                ui.label(&self.inspector_function);
                ui.label(RichText::new("=ANL+UV2-K1 · Leistungsschütz 3S+1S").small().weak());
                ui.horizontal(|ui| {
                    let _ = ui.button("▦ Im Aufbau");
                    let _ = ui.button("⇄ Artikel tauschen");
                });
                ui.separator();

                egui::CollapsingHeader::new("KENNZEICHNUNG")
                    .default_open(true)
                    .show(ui, |ui| {
                        egui::Grid::new("designation_grid").num_columns(2).show(ui, |ui| {
                            ui.label("BMK");
                            ui.label("-K1");
                            ui.end_row();
                            ui.label("Funktion");
                            ui.text_edit_singleline(&mut self.inspector_function);
                            ui.end_row();
                            ui.label("Einbauort");
                            ui.text_edit_singleline(&mut self.inspector_location);
                            ui.end_row();
                            ui.label("Verteiler");
                            ui.label("UV2");
                            ui.end_row();
                            ui.label("Reihe");
                            ui.label("2");
                            ui.end_row();
                        });
                    });

                egui::CollapsingHeader::new("ARTIKEL")
                    .default_open(true)
                    .show(ui, |ui| {
                        egui::Grid::new("article_grid").num_columns(2).show(ui, |ui| {
                            ui.label("Hersteller");
                            ui.label("Eaton");
                            ui.end_row();
                            ui.label("Artikelnr.");
                            ui.text_edit_singleline(&mut self.inspector_article);
                            ui.end_row();
                            ui.label("Typ");
                            ui.label("Leistungsschütz 3S+1S");
                            ui.end_row();
                        });
                    });

                egui::CollapsingHeader::new("ELEKTRISCHE DATEN")
                    .default_open(true)
                    .show(ui, |ui| {
                        ui.label("Bemessungsstrom     18 A");
                        ui.label("Leistung AC-3        7,5 kW");
                        ui.label("Spulenspannung       230 V AC");
                        ui.label("Hilfskontakte        1 S (13–14)");
                    });

                egui::CollapsingHeader::new("MECHANISCHE DATEN")
                    .default_open(true)
                    .show(ui, |ui| {
                        ui.label("Breite               2,5 TE");
                        ui.label("B × H × T            45 × 85 × 102 mm");
                        ui.label("Position             Reihe 2 · 3 TE");
                    });
            });
    }

    fn central_canvas(&mut self, ctx: &egui::Context) {
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.workspace {
                WorkspaceTab::Data => self.data_view(ui),
                WorkspaceTab::Project => self.project_view(ui),
                WorkspaceTab::Cabinet => self.cabinet_view(ui),
                WorkspaceTab::Documentation => self.documentation_view(ui),
                WorkspaceTab::Schematic => self.schematic_placeholder(ui),
            }
        });
    }

    fn schematic_placeholder(&mut self, ui: &mut egui::Ui) {
        let available = ui.available_size();
        let (rect, response) = ui.allocate_exact_size(available, Sense::click_and_drag());
        let painter = ui.painter_at(rect);
        let bg = if self.dark { Color32::from_rgb(43, 46, 49) } else { Color32::from_rgb(220, 223, 226) };
        painter.rect_filled(rect, 0.0, bg);

        let margin = 28.0;
        let page = rect.shrink(margin);
        let page_bg = if self.dark { Color32::from_rgb(82, 86, 90) } else { Color32::WHITE };
        painter.rect_filled(page, 0.0, page_bg);
        painter.rect_stroke(page, 0.0, Stroke::new(1.0, Color32::GRAY), egui::StrokeKind::Inside);

        let minor = if self.dark { Color32::from_gray(100) } else { Color32::from_gray(230) };
        let major = if self.dark { Color32::from_gray(125) } else { Color32::from_gray(205) };
        let step = 24.0;
        let mut x = page.left();
        let mut col = 0usize;
        while x <= page.right() {
            painter.line_segment(
                [egui::pos2(x, page.top()), egui::pos2(x, page.bottom())],
                Stroke::new(1.0, if col % 5 == 0 { major } else { minor }),
            );
            x += step;
            col += 1;
        }
        let mut y = page.top();
        let mut row = 0usize;
        while y <= page.bottom() {
            painter.line_segment(
                [egui::pos2(page.left(), y), egui::pos2(page.right(), y)],
                Stroke::new(1.0, if row % 5 == 0 { major } else { minor }),
            );
            y += step;
            row += 1;
        }

        let neutral = if self.dark { Color32::from_gray(230) } else { Color32::from_gray(45) };
        let blue = Color32::from_rgb(30, 130, 225);
        let green = Color32::from_rgb(35, 150, 75);
        let red = Color32::from_rgb(215, 70, 75);
        let orange = Color32::from_rgb(235, 115, 20);
        let left = page.left() + 40.0;
        let right = page.right() - 40.0;
        for (idx, color) in [neutral, neutral, neutral, blue].into_iter().enumerate() {
            let yy = page.top() + 70.0 + idx as f32 * 18.0;
            painter.line_segment([egui::pos2(left, yy), egui::pos2(right, yy)], Stroke::new(1.2, color));
        }
        painter.line_segment(
            [egui::pos2(left, page.bottom() - 70.0), egui::pos2(right, page.bottom() - 70.0)],
            Stroke::new(1.2, green),
        );

        for i in 0..3 {
            let xx = left + 180.0 + i as f32 * 170.0;
            painter.line_segment(
                [egui::pos2(xx, page.top() + 70.0), egui::pos2(xx, page.center().y + 80.0)],
                Stroke::new(1.2, neutral),
            );
        }
        let cx = page.center().x + 190.0;
        painter.line_segment(
            [egui::pos2(cx, page.top() + 124.0), egui::pos2(cx, page.center().y - 20.0)],
            Stroke::new(1.2, blue),
        );
        painter.line_segment(
            [egui::pos2(cx, page.center().y - 20.0), egui::pos2(cx + 65.0, page.center().y - 20.0)],
            Stroke::new(1.2, red),
        );
        painter.text(
            egui::pos2(cx - 18.0, page.center().y - 42.0),
            egui::Align2::LEFT_TOP,
            "-K1",
            egui::FontId::proportional(12.0),
            neutral,
        );
        painter.text(
            egui::pos2(left, page.top() + 52.0),
            egui::Align2::LEFT_TOP,
            "/2.8",
            egui::FontId::proportional(11.0),
            orange,
        );
        painter.text(
            egui::pos2(right - 24.0, page.top() + 52.0),
            egui::Align2::LEFT_TOP,
            "/4.1",
            egui::FontId::proportional(11.0),
            orange,
        );

        if response.clicked() {
            self.status_message = "CAD-Platzhalter fokussiert".to_owned();
        }
    }

    fn data_view(&mut self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            for tab in ["Betriebsmittel", "Klemmen", "Verbindungen", "Kabel", "SPS / I/O", "Material", "Potentiale", "Texte"] {
                let _ = ui.selectable_label(tab == "Betriebsmittel", tab);
            }
        });
        ui.separator();
        ui.horizontal(|ui| {
            ui.checkbox(&mut self.finding_only, "Nur mit Befunden");
            let _ = ui.button("Spalten");
            let _ = ui.button("Suchen und Ersetzen");
            let _ = ui.button("Mehrfachänderung");
        });
        ui.separator();

        let row_height = 24.0;
        ui.horizontal(|ui| {
            ui.add_sized([80.0, row_height], egui::Label::new(RichText::new("BMK").strong()));
            ui.add_sized([170.0, row_height], egui::Label::new(RichText::new("Funktion").strong()));
            ui.add_sized([100.0, row_height], egui::Label::new(RichText::new("Ort").strong()));
            ui.add_sized([130.0, row_height], egui::Label::new(RichText::new("Hersteller").strong()));
            ui.add_sized([200.0, row_height], egui::Label::new(RichText::new("Artikel").strong()));
        });
        ui.separator();
        egui::ScrollArea::vertical().show_rows(ui, row_height, 10_000, |ui, range| {
            for row in range {
                let finding = row % 37 == 0;
                if self.finding_only && !finding {
                    continue;
                }
                let selected = row == self.selected_data_row;
                let fill = if finding {
                    Color32::from_rgba_unmultiplied(200, 80, 60, 35)
                } else {
                    Color32::TRANSPARENT
                };
                egui::Frame::NONE.fill(fill).show(ui, |ui| {
                    ui.horizontal(|ui| {
                        if ui
                            .selectable_label(selected, format!("-K{}", row + 1))
                            .clicked()
                        {
                            self.selected_data_row = row;
                        }
                        ui.add_sized([170.0, row_height], egui::Label::new(format!("Funktion {:05}", row + 1)));
                        ui.add_sized([100.0, row_height], egui::Label::new(format!("+UV{}", row % 12 + 1)));
                        ui.add_sized([130.0, row_height], egui::Label::new(if row % 3 == 0 { "Eaton" } else { "—" }));
                        ui.add_sized([200.0, row_height], egui::Label::new(format!("ART-{:06}", row + 1)));
                    });
                });
            }
        });
    }

    fn project_view(&mut self, ui: &mut egui::Ui) {
        ui.heading("Projektzentrum");
        ui.label("Zuletzt geöffnet · Vorlagen · Neues Projekt");
        ui.add_space(16.0);
        ui.columns(3, |columns| {
            for (idx, title) in ["Lindenstraße 12", "Maschine M-204", "UV Werkstatt"].into_iter().enumerate() {
                columns[idx].group(|ui| {
                    ui.heading(title);
                    ui.label("IEC / DIN · geändert heute");
                    let _ = ui.button("Öffnen");
                });
            }
        });
    }

    fn cabinet_view(&mut self, ui: &mut egui::Ui) {
        ui.heading("Verteilerfront / Aufbau");
        ui.label("4 Reihen · 36 TE je Reihe · Auto-Layout + manuelle Nachbearbeitung");
        ui.add_space(12.0);
        for row in 1..=4 {
            ui.group(|ui| {
                ui.horizontal(|ui| {
                    ui.strong(format!("Reihe {row}"));
                    let used = if row == 3 { 39 } else { 18 + row * 3 };
                    let color = if used > 36 { Color32::RED } else { Color32::LIGHT_GREEN };
                    ui.label(RichText::new(format!("{used} / 36 TE")).color(color));
                });
                let (rect, _) = ui.allocate_exact_size(Vec2::new(ui.available_width(), 54.0), Sense::hover());
                let painter = ui.painter_at(rect);
                painter.rect_stroke(rect, 2.0, Stroke::new(1.0, Color32::GRAY), egui::StrokeKind::Inside);
                let cell = rect.width() / 36.0;
                for i in 1..36 {
                    let x = rect.left() + i as f32 * cell;
                    painter.line_segment([egui::pos2(x, rect.top()), egui::pos2(x, rect.bottom())], Stroke::new(0.5, Color32::DARK_GRAY));
                }
            });
        }
    }

    fn documentation_view(&mut self, ui: &mut egui::Ui) {
        ui.heading("Dokumentation / PDF");
        ui.horizontal(|ui| {
            ui.vertical(|ui| {
                ui.set_width(220.0);
                for item in ["Deckblatt", "Inhaltsverzeichnis", "Aufbauplan", "Stromlaufpläne", "Stückliste", "Klemmenplan", "Kabelliste"] {
                    let _ = ui.selectable_label(item == "Stückliste", item);
                }
            });
            ui.separator();
            ui.vertical(|ui| {
                ui.heading("Vorschau – Stückliste");
                ui.label("A3 quer · Titelblock · Revision B");
                ui.add_space(10.0);
                egui::Grid::new("bom_preview").striped(true).show(ui, |ui| {
                    ui.strong("Pos."); ui.strong("BMK"); ui.strong("Hersteller"); ui.strong("Artikel"); ui.end_row();
                    for i in 1..=12 {
                        ui.label(i.to_string());
                        ui.label(format!("-K{i}"));
                        ui.label("Eaton");
                        ui.label(format!("DILM{:02}", 10 + i));
                        ui.end_row();
                    }
                });
            });
        });
    }

    fn status_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::bottom("status_bar")
            .exact_height(24.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label(RichText::new(format!("✓ {}", self.status_message)).color(Color32::from_rgb(70, 185, 110)));
                    ui.separator();
                    ui.label("X 1470 · Y 1010 mm");
                    ui.separator();
                    ui.label("Raster 5 mm · Fang an");
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        ui.label("de-DE · IEC 81346");
                        ui.label(RichText::new("● 3  ● 6").color(Color32::from_rgb(230, 150, 35)));
                    });
                });
            });
    }

    fn command_palette(&mut self, ctx: &egui::Context) {
        if !self.command_palette {
            return;
        }

        let mut open = self.command_palette;
        egui::Window::new("Befehlspalette")
            .open(&mut open)
            .collapsible(false)
            .resizable(false)
            .default_width(620.0)
            .anchor(egui::Align2::CENTER_TOP, [0.0, 90.0])
            .show(ctx, |ui| {
                let response = ui.add(
                    egui::TextEdit::singleline(&mut self.command_query)
                        .hint_text("Gerät, Artikel, Seite oder Befehl …")
                        .desired_width(f32::INFINITY),
                );
                response.request_focus();
                ui.separator();
                let query = self.command_query.to_lowercase();
                let commands = [
                    ("-K1", "Betriebsmittel · Schütz Motor Lüftung"),
                    ("DILM17", "Artikel · Eaton DILM17"),
                    ("Seite 23", "Seite öffnen"),
                    ("Frontansicht", "Aufbau öffnen"),
                    ("Stückliste erzeugen", "Dokumentation"),
                    ("Projekt prüfen", "Prüfung starten"),
                ];
                for (title, subtitle) in commands {
                    if query.is_empty() || title.to_lowercase().contains(&query) || subtitle.to_lowercase().contains(&query) {
                        if ui
                            .button(format!("{title}\n{subtitle}"))
                            .clicked()
                        {
                            self.status_message = format!("Befehl: {title}");
                            self.command_palette = false;
                        }
                    }
                }
            });
        self.command_palette = open;
    }
}

impl eframe::App for OpenEcadApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.process_shortcuts(ctx);
        self.top_bar(ctx);
        self.status_bar(ctx);
        self.navigator(ctx);
        self.inspector(ctx);
        self.central_canvas(ctx);
        self.command_palette(ctx);
    }
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([1600.0, 1000.0]),
        ..Default::default()
    };

    eframe::run_native(
        "OpenE-CAD S3 egui Shell",
        options,
        Box::new(|cc| Ok(Box::new(OpenEcadApp::new(cc)))),
    )
}
