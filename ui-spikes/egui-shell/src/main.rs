// SPDX-License-Identifier: MPL-2.0

use eframe::egui::{self, Align, Color32, Key, Layout, RichText, Sense, Stroke, Vec2};

const ACCENT: Color32 = Color32::from_rgb(29, 174, 205);
const ERROR: Color32 = Color32::from_rgb(241, 93, 91);
const WARNING: Color32 = Color32::from_rgb(231, 163, 49);
const OK: Color32 = Color32::from_rgb(66, 187, 115);

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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ThemeMode {
    Light,
    Dark,
    DarkLightDrawing,
}

impl ThemeMode {
    fn ui_dark(self) -> bool {
        !matches!(self, Self::Light)
    }

    fn drawing_dark(self) -> bool {
        matches!(self, Self::Dark)
    }
}

struct OpenEcadApp {
    workspace: WorkspaceTab,
    navigator: NavigatorTab,
    theme: ThemeMode,
    command_palette: bool,
    command_query: String,
    navigator_filter: String,
    project_filter: String,
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
        let app = Self {
            workspace: WorkspaceTab::Schematic,
            navigator: NavigatorTab::Pages,
            theme: ThemeMode::Dark,
            command_palette: false,
            command_query: String::new(),
            navigator_filter: String::new(),
            project_filter: String::new(),
            selected_page: 2,
            selected_data_row: 0,
            inspector_function: "Schütz Motor Lüftung".to_owned(),
            inspector_location: "+UV2".to_owned(),
            inspector_article: "DILM17-10(230V50HZ)".to_owned(),
            finding_only: false,
            status_message: "gespeichert".to_owned(),
        };
        app.apply_theme(&cc.egui_ctx);
        app
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
        let mut visuals = if self.theme.ui_dark() {
            egui::Visuals::dark()
        } else {
            egui::Visuals::light()
        };

        if self.theme.ui_dark() {
            visuals.panel_fill = Color32::from_rgb(25, 27, 28);
            visuals.window_fill = Color32::from_rgb(29, 31, 32);
            visuals.extreme_bg_color = Color32::from_rgb(15, 17, 18);
            visuals.faint_bg_color = Color32::from_rgb(31, 34, 35);
            visuals.widgets.noninteractive.bg_fill = Color32::from_rgb(25, 27, 28);
            visuals.widgets.inactive.bg_fill = Color32::from_rgb(34, 37, 38);
            visuals.widgets.hovered.bg_fill = Color32::from_rgb(42, 47, 49);
            visuals.widgets.active.bg_fill = Color32::from_rgb(18, 76, 91);
            visuals.selection.bg_fill = Color32::from_rgb(19, 96, 116);
            visuals.selection.stroke = Stroke::new(1.0, Color32::from_rgb(98, 217, 238));
        } else {
            visuals.panel_fill = Color32::from_rgb(248, 249, 250);
            visuals.window_fill = Color32::WHITE;
            visuals.extreme_bg_color = Color32::from_rgb(238, 240, 242);
            visuals.faint_bg_color = Color32::from_rgb(243, 245, 246);
            visuals.widgets.inactive.bg_fill = Color32::from_rgb(239, 242, 244);
            visuals.widgets.hovered.bg_fill = Color32::from_rgb(225, 237, 241);
            visuals.widgets.active.bg_fill = Color32::from_rgb(190, 225, 234);
            visuals.selection.bg_fill = Color32::from_rgb(174, 222, 233);
            visuals.selection.stroke = Stroke::new(1.0, Color32::from_rgb(0, 116, 145));
        }

        ctx.set_visuals(visuals);
        ctx.style_mut(|style| {
            style.spacing.item_spacing = Vec2::new(6.0, 5.0);
            style.spacing.button_padding = Vec2::new(7.0, 3.0);
            style.spacing.interact_size.y = 24.0;
        });
    }

    fn top_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("app_bar")
            .exact_height(50.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.spacing_mut().item_spacing.x = 8.0;
                    ui.label(RichText::new("⚡").size(18.0));
                    ui.vertical(|ui| {
                        ui.label(RichText::new("Lindenstraße 12").strong());
                        ui.label(RichText::new("+UV2 · Rev. B").size(10.0).weak());
                    });
                    ui.separator();

                    for tab in WorkspaceTab::ALL {
                        let selected = self.workspace == tab;
                        if ui.selectable_label(selected, tab.label()).clicked() {
                            self.workspace = tab;
                        }
                    }

                    ui.add_space(12.0);
                    let palette = ui.add_sized(
                        [390.0, 26.0],
                        egui::Button::new("⌕  Gerät, Artikel, Seite, Befehl …                 Ctrl K"),
                    );
                    if palette.clicked() {
                        self.command_palette = true;
                        self.command_query.clear();
                    }

                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        ui.label(RichText::new("MK").strong());
                        ui.separator();

                        let light = ui
                            .selectable_label(self.theme == ThemeMode::Light, "☀")
                            .on_hover_text("Helle Oberfläche + helle Zeichnung");
                        if light.clicked() {
                            self.theme = ThemeMode::Light;
                            self.apply_theme(ctx);
                        }

                        let dark = ui
                            .selectable_label(self.theme == ThemeMode::Dark, "◐")
                            .on_hover_text("Dunkle Oberfläche + dunkle Zeichnung");
                        if dark.clicked() {
                            self.theme = ThemeMode::Dark;
                            self.apply_theme(ctx);
                        }

                        let dark_light = ui
                            .selectable_label(self.theme == ThemeMode::DarkLightDrawing, "◩")
                            .on_hover_text("Dunkle Oberfläche + helle Zeichnung");
                        if dark_light.clicked() {
                            self.theme = ThemeMode::DarkLightDrawing;
                            self.apply_theme(ctx);
                        }

                        ui.label(RichText::new("UX-Konzept").weak());
                    });
                });
            });

        if self.workspace != WorkspaceTab::Project {
            egui::TopBottomPanel::top("context_toolbar")
                .exact_height(38.0)
                .show(ctx, |ui| {
                    ui.horizontal(|ui| {
                        let _ = ui.selectable_label(true, "▣").on_hover_text("Navigator");
                        let _ = ui.selectable_label(true, "↖").on_hover_text("Auswahl");
                        let _ = ui.small_button("⌁").on_hover_text("Leitung");
                        let _ = ui.small_button("T").on_hover_text("Text");
                        let _ = ui.add_sized([190.0, 24.0], egui::Button::new("◇  Symbol, Makro, Artikel …"));
                        ui.separator();
                        let _ = ui.small_button("↻");
                        let _ = ui.small_button("⌁");
                        let _ = ui.small_button("⌫");
                        ui.separator();
                        let _ = ui.small_button("↶");
                        let _ = ui.small_button("↷");
                        let _ = ui.selectable_label(true, "▦").on_hover_text("Raster");
                        let _ = ui.selectable_label(true, "◎").on_hover_text("Fang");

                        ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                            ui.label(RichText::new("Seite 3 / 10").strong());
                            ui.label(
                                RichText::new("-K1 Schütz Motor Lüftung")
                                    .color(ACCENT),
                            );
                        });
                    });
                });
        }
    }

    fn left_panel(&mut self, ctx: &egui::Context) {
        if self.workspace == WorkspaceTab::Project {
            self.project_sidebar(ctx);
        } else {
            self.navigator(ctx);
        }
    }

    fn right_panel(&mut self, ctx: &egui::Context) {
        if self.workspace == WorkspaceTab::Project {
            self.project_findings(ctx);
        } else {
            self.inspector(ctx);
        }
    }

    fn project_sidebar(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("project_sidebar")
            .resizable(true)
            .default_width(305.0)
            .width_range(260.0..=420.0)
            .show(ctx, |ui| {
                ui.add_space(4.0);
                ui.label(RichText::new("PROJEKTE").size(11.0).strong().weak());
                ui.add_space(8.0);
                ui.add(
                    egui::TextEdit::singleline(&mut self.project_filter)
                        .hint_text("⌕  Projekte durchsuchen"),
                );
                ui.add_space(8.0);

                let projects = [
                    ("Lindenstraße 12 · Wohn- und Geschäftshaus", "UV2 · Rev. B · 10 Seiten", "vor 4 min"),
                    ("Halle 3 · Lüftungssteuerung", "SV1 · Rev. D · 34 Seiten", "gestern"),
                    ("Praxis Dr. Seidel · Zählerschrank", "ZS1 · Rev. A · 8 Seiten", "12.10.2026"),
                    ("EFH Brandt · Hausverteiler", "HV · Rev. C · 6 Seiten", "08.10.2026"),
                    ("Werkstatt Kühn · Maschinen-UV", "UV1 · Rev. A · 14 Seiten", "01.10.2026"),
                ];

                let query = self.project_filter.to_lowercase();
                for (index, (title, meta, date)) in projects.into_iter().enumerate() {
                    if !query.is_empty()
                        && !title.to_lowercase().contains(&query)
                        && !meta.to_lowercase().contains(&query)
                    {
                        continue;
                    }
                    let selected = index == 0;
                    let response = ui.selectable_label(selected, RichText::new(title).strong());
                    ui.horizontal(|ui| {
                        ui.add_space(10.0);
                        ui.label(RichText::new(meta).size(10.0).weak());
                        ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                            ui.label(RichText::new(date).size(10.0).weak());
                        });
                    });
                    if response.clicked() {
                        self.status_message = format!("Projekt gewählt: {title}");
                    }
                    ui.add_space(7.0);
                }

                ui.add_space(18.0);
                ui.separator();
                ui.label(RichText::new("NEU AUS VORLAGE").size(10.0).strong().weak());
                ui.add_space(6.0);
                for (title, subtitle) in [
                    ("Wohnungsverteiler", "1–4 Reihen · FI/LS, Zähler"),
                    ("Gewerbe-Unterverteilung", "NH, SPD, Schütze"),
                    ("Steuerung mit SPS", "easyE4, 24 V DC, I/O-Listen"),
                ] {
                    if ui.button(format!("⊕  {title}\n     {subtitle}")).clicked() {
                        self.status_message = format!("Vorlage: {title}");
                    }
                }
            });
    }

    fn project_findings(&mut self, ctx: &egui::Context) {
        egui::SidePanel::right("project_findings")
            .resizable(true)
            .default_width(330.0)
            .width_range(280.0..=480.0)
            .show(ctx, |ui| {
                ui.add_space(4.0);
                ui.label(RichText::new("OFFENE PUNKTE").size(11.0).strong().weak());
                ui.add_space(8.0);

                Self::finding_section(ui, "FEHLER  3", ERROR);
                Self::finding_item(ui, ERROR, "Reihe 3: 39 / 36 TE", "Aufbau · Verteilerreihe +UV2 überbelegt um 3 TE");
                Self::finding_item(ui, ERROR, "BMK doppelt: -F30", "Kennzeichnung · Licht Büro / Steckdosen Büro");
                Self::finding_item(ui, ERROR, "Potentialkonflikt Seite 6.4", "Potential · 24 VDC (M) direkt mit N verbunden");

                ui.add_space(10.0);
                Self::finding_section(ui, "WARNUNGEN  6", WARNING);
                Self::finding_item(ui, WARNING, "Artikel fehlt: -E1", "Artikel · Leuchte Werkstatt");
                Self::finding_item(ui, WARNING, "Nicht in Frontansicht platziert: -K9", "Aufbau · Schütz Torantrieb · keine Reihe zugeordnet");
                Self::finding_item(ui, WARNING, "Artikel fehlt: -F60", "Artikel · Abgang Garage");
                Self::finding_item(ui, WARNING, "Gerätebreite fehlt: -F60", "Aufbau · Breite in TE erforderlich für Aufbauplan");
                Self::finding_item(ui, WARNING, "Einbauort fehlt: -A7", "Aufbau · Router / Netzwerk");
                Self::finding_item(ui, WARNING, "Anschluss offen: -K1:22", "Verbindung · Hilfskontakt 21–22 auf Seite 5.2 ohne Ziel");

                ui.add_space(10.0);
                Self::finding_section(ui, "HINWEISE  1", ACCENT);
                Self::finding_item(ui, ACCENT, "Klemme -X1:9 ohne Belegung", "Klemmen · Als Reserve kennzeichnen oder entfernen");

                ui.add_space(18.0);
                ui.separator();
                ui.label(RichText::new("SCHNELLSTART").size(10.0).strong().weak());
                for (label, key) in [
                    ("Suchen / Befehl", "Ctrl K"),
                    ("Einfügen", "I"),
                    ("Leitung", "W"),
                    ("Rückgängig", "Ctrl Z"),
                    ("Ansicht wechseln", "Alt 1–5"),
                ] {
                    ui.horizontal(|ui| {
                        ui.label(RichText::new(label).weak());
                        ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                            ui.label(RichText::new(key).monospace().size(10.0));
                        });
                    });
                }
            });
    }

    fn finding_section(ui: &mut egui::Ui, label: &str, color: Color32) {
        ui.label(RichText::new(label).size(10.0).strong().color(color));
        ui.add_space(3.0);
    }

    fn finding_item(ui: &mut egui::Ui, color: Color32, title: &str, subtitle: &str) {
        ui.horizontal_top(|ui| {
            ui.label(RichText::new("●").color(color).size(10.0));
            ui.vertical(|ui| {
                ui.label(RichText::new(title).strong());
                ui.label(RichText::new(subtitle).size(10.0).weak());
            });
        });
        ui.add_space(7.0);
    }

    fn navigator(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("navigator")
            .resizable(true)
            .default_width(235.0)
            .width_range(190.0..=420.0)
            .show(ctx, |ui| {
                ui.horizontal_wrapped(|ui| {
                    for tab in NavigatorTab::ALL {
                        if ui.selectable_label(self.navigator == tab, tab.label()).clicked() {
                            self.navigator = tab;
                        }
                    }
                });
                ui.separator();
                ui.add(
                    egui::TextEdit::singleline(&mut self.navigator_filter)
                        .hint_text("⌕  Seiten filtern"),
                );
                ui.add_space(5.0);

                if self.navigator == NavigatorTab::Pages {
                    egui::CollapsingHeader::new("=ANL  Lindenstraße 12")
                        .default_open(true)
                        .show(ui, |ui| {
                            egui::CollapsingHeader::new("+UV2  Unterverteilung EG")
                                .default_open(true)
                                .show(ui, |ui| {
                                    self.page_rows(ui);
                                });
                        });
                } else {
                    self.generic_navigator_rows(ui);
                }
            });
    }

    fn page_rows(&mut self, ui: &mut egui::Ui) {
        let names = [
            "Deckblatt",
            "Einspeisung HAK → UV2",
            "Verteilung +UV2 · Abgänge EG",
            "Verteilung +UV2 · Abgänge OG",
            "Steuerung Lüftung 24 V DC",
            "easyE4 · Ein-/Ausgänge",
            "Abgänge Büro",
            "Abgänge Lager / Außen",
            "Aufbauplan +UV2",
            "Klemmenplan -X1",
        ];
        let row_height = 24.0;
        egui::ScrollArea::vertical().show_rows(ui, row_height, 1_000, |ui, range| {
            for row in range {
                let (number, name) = if row < names.len() {
                    let page_no = if row < 8 { row + 1 } else { row + 12 };
                    (page_no, names[row].to_owned())
                } else {
                    (row + 12, format!("Reserve / Funktionsgruppe {:04}", row + 1))
                };
                let selected = row == self.selected_page;
                ui.horizontal(|ui| {
                    ui.label(RichText::new(format!("{number:>2}")).size(10.0).weak());
                    let response = ui.selectable_label(selected, name);
                    if response.clicked() {
                        self.selected_page = row;
                    }
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if row == 4 {
                            ui.label(RichText::new("●").color(WARNING));
                        } else if row == 5 || row == 8 {
                            ui.label(RichText::new("●").color(ERROR));
                        }
                    });
                });
            }
        });
    }

    fn generic_navigator_rows(&mut self, ui: &mut egui::Ui) {
        let row_height = 22.0;
        egui::ScrollArea::vertical().show_rows(ui, row_height, 1_000, |ui, range| {
            for row in range {
                let label = match self.navigator {
                    NavigatorTab::Pages => unreachable!(),
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
    }

    fn inspector(&mut self, ctx: &egui::Context) {
        egui::SidePanel::right("inspector")
            .resizable(true)
            .default_width(315.0)
            .width_range(250.0..=500.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.selectable_label(true, "Eigenschaften");
                    ui.selectable_label(false, "Prüfung");
                    ui.label(RichText::new("10").color(ERROR));
                });
                ui.separator();
                ui.label(RichText::new("-K1").size(19.0).strong());
                ui.label(RichText::new(&self.inspector_function).strong());
                ui.label(RichText::new("=ANL+UV2-K1 · Leistungsschütz 3S+1S").size(10.0).weak());
                ui.horizontal(|ui| {
                    let _ = ui.button("▦  Im Aufbau");
                    let _ = ui.button("⇄  Artikel tauschen");
                });
                ui.separator();

                egui::CollapsingHeader::new("KENNZEICHNUNG")
                    .default_open(true)
                    .show(ui, |ui| {
                        egui::Grid::new("designation_grid")
                            .num_columns(2)
                            .spacing([10.0, 5.0])
                            .show(ui, |ui| {
                                ui.label(RichText::new("BMK").weak());
                                ui.label("-K1");
                                ui.end_row();
                                ui.label(RichText::new("Funktion").weak());
                                ui.text_edit_singleline(&mut self.inspector_function);
                                ui.end_row();
                                ui.label(RichText::new("Einbauort").weak());
                                ui.text_edit_singleline(&mut self.inspector_location);
                                ui.end_row();
                                ui.label(RichText::new("Verteiler").weak());
                                ui.label("UV2");
                                ui.end_row();
                                ui.label(RichText::new("Reihe").weak());
                                ui.label("2");
                                ui.end_row();
                            });
                    });

                egui::CollapsingHeader::new("ARTIKEL")
                    .default_open(true)
                    .show(ui, |ui| {
                        egui::Grid::new("article_grid")
                            .num_columns(2)
                            .spacing([10.0, 5.0])
                            .show(ui, |ui| {
                                ui.label(RichText::new("Hersteller").weak());
                                ui.label("Eaton");
                                ui.end_row();
                                ui.label(RichText::new("Artikelnr.").weak());
                                ui.text_edit_singleline(&mut self.inspector_article);
                                ui.end_row();
                                ui.label(RichText::new("Typ").weak());
                                ui.label("Leistungsschütz 3S+1S");
                                ui.end_row();
                            });
                    });

                egui::CollapsingHeader::new("ELEKTRISCHE DATEN")
                    .default_open(true)
                    .show(ui, |ui| {
                        egui::Grid::new("electrical_grid").num_columns(2).show(ui, |ui| {
                            for (key, value) in [
                                ("Bemessungsstrom", "18 A"),
                                ("Leistung AC-3", "7,5 kW"),
                                ("Spulenspannung", "230 V AC"),
                                ("Hilfskontakte", "1 S (13–14)"),
                            ] {
                                ui.label(RichText::new(key).weak());
                                ui.label(value);
                                ui.end_row();
                            }
                        });
                    });

                egui::CollapsingHeader::new("MECHANISCHE DATEN")
                    .default_open(true)
                    .show(ui, |ui| {
                        egui::Grid::new("mechanical_grid").num_columns(2).show(ui, |ui| {
                            for (key, value) in [
                                ("Breite", "2,5 TE"),
                                ("B × H × T", "45 × 85 × 102 mm"),
                                ("Position", "Reihe 2 · 3 TE"),
                            ] {
                                ui.label(RichText::new(key).weak());
                                ui.label(value);
                                ui.end_row();
                            }
                        });
                    });

                egui::CollapsingHeader::new("GERÄT ERSCHEINT IN")
                    .default_open(true)
                    .show(ui, |ui| {
                        ui.label("◇  -K1   ›   DILM17-10(230V50HZ)");
                    });
            });
    }

    fn central_canvas(&mut self, ctx: &egui::Context) {
        egui::CentralPanel::default().show(ctx, |ui| match self.workspace {
            WorkspaceTab::Data => self.data_view(ui),
            WorkspaceTab::Project => self.project_view(ui),
            WorkspaceTab::Cabinet => self.cabinet_view(ui),
            WorkspaceTab::Documentation => self.documentation_view(ui),
            WorkspaceTab::Schematic => self.schematic_placeholder(ui),
        });
    }

    fn project_view(&mut self, ui: &mut egui::Ui) {
        ui.add_space(8.0);
        ui.label(RichText::new("=ANL  ·  +UV2  ·  Rev. B  ·  zuletzt bearbeitet vor 4 min von M. Krüger").size(10.0).weak());
        ui.add_space(6.0);
        ui.label(RichText::new("Lindenstraße 12 · Wohn- und Geschäftshaus").size(22.0).strong());
        ui.label(RichText::new("Unterverteilung EG Gewerbe · 400/230 V TN-S · Referenzhersteller Eaton").weak());
        ui.add_space(10.0);

        ui.horizontal(|ui| {
            if ui.button("Weiterarbeiten · Seite 3  →").clicked() {
                self.workspace = WorkspaceTab::Schematic;
            }
            let _ = ui.button("▦  Aufbau +UV2");
            let _ = ui.button("▤  Datenmanager");
            if ui.button("⌕  Suchen   Ctrl K").clicked() {
                self.command_palette = true;
            }
        });

        ui.add_space(12.0);
        ui.columns(4, |cols| {
            let stats = [
                ("Seiten", "10", Color32::TRANSPARENT),
                ("Betriebsmittel", "77", Color32::TRANSPARENT),
                ("Klemmen", "10", Color32::TRANSPARENT),
                ("Prüfung", "3 Fehler  ·  6 Warn.", ERROR),
            ];
            for (col, (label, value, color)) in cols.iter_mut().zip(stats) {
                egui::Frame::NONE
                    .fill(if self.theme.ui_dark() { Color32::from_rgb(28, 31, 32) } else { Color32::from_rgb(245, 247, 248) })
                    .stroke(Stroke::new(1.0, if self.theme.ui_dark() { Color32::from_rgb(51, 55, 57) } else { Color32::from_rgb(214, 218, 221) }))
                    .show(col, |ui| {
                        ui.add_space(7.0);
                        ui.label(RichText::new(label).size(10.0).weak());
                        if color == Color32::TRANSPARENT {
                            ui.label(RichText::new(value).size(17.0).strong());
                        } else {
                            ui.label(RichText::new(value).size(15.0).strong().color(color));
                        }
                        ui.add_space(7.0);
                    });
            }
        });

        ui.add_space(16.0);
        ui.label(RichText::new("SEITEN").size(11.0).strong().weak());
        ui.add_space(5.0);

        let pages = [
            (1, "Deckblatt", None),
            (2, "Einspeisung HAK → UV2", None),
            (3, "Verteilung +UV2 · Abgänge EG", None),
            (4, "Verteilung +UV2 · Abgänge OG", None),
            (5, "Steuerung Lüftung 24 V DC", Some(WARNING)),
            (6, "easyE4 · Ein-/Ausgänge", Some(ERROR)),
            (7, "Abgänge Büro", None),
            (8, "Abgänge Lager / Außen", None),
            (20, "Aufbauplan +UV2", Some(ERROR)),
            (21, "Klemmenplan -X1", None),
        ];
        for (number, title, state) in pages {
            egui::Frame::NONE
                .fill(if self.theme.ui_dark() { Color32::from_rgb(27, 30, 31) } else { Color32::from_rgb(250, 251, 252) })
                .stroke(Stroke::new(1.0, if self.theme.ui_dark() { Color32::from_rgb(51, 55, 57) } else { Color32::from_rgb(220, 223, 225) }))
                .show(ui, |ui| {
                    ui.horizontal(|ui| {
                        ui.add_sized([34.0, 24.0], egui::Label::new(RichText::new(number.to_string()).weak()));
                        ui.label(RichText::new("◇").weak());
                        if ui.selectable_label(false, RichText::new(title).strong()).clicked() {
                            self.workspace = WorkspaceTab::Schematic;
                            self.selected_page = number.saturating_sub(1);
                        }
                        ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                            if let Some(color) = state {
                                ui.label(RichText::new("●").color(color));
                            } else {
                                ui.label(RichText::new("—").weak());
                            }
                        });
                    });
                });
        }
    }

    fn schematic_placeholder(&mut self, ui: &mut egui::Ui) {
        let available = ui.available_size();
        let (rect, response) = ui.allocate_exact_size(available, Sense::click_and_drag());
        let painter = ui.painter_at(rect);

        let workspace_bg = if self.theme.ui_dark() {
            Color32::from_rgb(31, 34, 36)
        } else {
            Color32::from_rgb(229, 232, 234)
        };
        painter.rect_filled(rect, 0.0, workspace_bg);

        let margin = 20.0;
        let page = rect.shrink(margin);
        let page_bg = if self.theme.drawing_dark() {
            Color32::from_rgb(24, 27, 28)
        } else {
            Color32::from_rgb(250, 251, 252)
        };
        painter.rect_filled(page, 0.0, page_bg);
        painter.rect_stroke(
            page,
            0.0,
            Stroke::new(1.0, if self.theme.drawing_dark() { Color32::from_rgb(68, 73, 76) } else { Color32::from_rgb(189, 194, 198) }),
            egui::StrokeKind::Inside,
        );

        let (minor, major, neutral) = if self.theme.drawing_dark() {
            (
                Color32::from_rgb(42, 47, 49),
                Color32::from_rgb(52, 58, 61),
                Color32::from_rgb(222, 226, 229),
            )
        } else {
            (
                Color32::from_rgb(235, 238, 240),
                Color32::from_rgb(218, 222, 225),
                Color32::from_rgb(45, 50, 54),
            )
        };

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

        let blue = Color32::from_rgb(35, 138, 215);
        let green = Color32::from_rgb(38, 145, 79);
        let red = Color32::from_rgb(211, 79, 76);
        let orange = Color32::from_rgb(232, 126, 28);
        let left = page.left() + 40.0;
        let right = page.right() - 40.0;

        for (idx, color) in [neutral, neutral, neutral, blue].into_iter().enumerate() {
            let yy = page.top() + 70.0 + idx as f32 * 18.0;
            painter.line_segment(
                [egui::pos2(left, yy), egui::pos2(right, yy)],
                Stroke::new(1.2, color),
            );
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
                        if ui.selectable_label(selected, format!("-K{}", row + 1)).clicked() {
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

    fn cabinet_view(&mut self, ui: &mut egui::Ui) {
        ui.heading("Verteilerfront / Aufbau");
        ui.label("4 Reihen · 36 TE je Reihe · Auto-Layout + manuelle Nachbearbeitung");
        ui.add_space(12.0);
        for row in 1..=4 {
            ui.group(|ui| {
                ui.horizontal(|ui| {
                    ui.strong(format!("Reihe {row}"));
                    let used = if row == 3 { 39 } else { 18 + row * 3 };
                    let color = if used > 36 { ERROR } else { OK };
                    ui.label(RichText::new(format!("{used} / 36 TE")).color(color));
                });
                let (rect, _) = ui.allocate_exact_size(Vec2::new(ui.available_width(), 54.0), Sense::hover());
                let painter = ui.painter_at(rect);
                painter.rect_stroke(rect, 2.0, Stroke::new(1.0, Color32::GRAY), egui::StrokeKind::Inside);
                let cell = rect.width() / 36.0;
                for i in 1..36 {
                    let x = rect.left() + i as f32 * cell;
                    painter.line_segment(
                        [egui::pos2(x, rect.top()), egui::pos2(x, rect.bottom())],
                        Stroke::new(0.5, Color32::DARK_GRAY),
                    );
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
                    ui.strong("Pos.");
                    ui.strong("BMK");
                    ui.strong("Hersteller");
                    ui.strong("Artikel");
                    ui.end_row();
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
                    ui.label(RichText::new(format!("✓ {}", self.status_message)).color(OK));
                    ui.separator();
                    ui.label("X 1470 · Y 1010 mm");
                    ui.separator();
                    ui.label("Raster 5 mm · Fang an");
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        ui.label("de-DE · IEC 81346");
                        ui.label(RichText::new("● 3   ● 6").color(WARNING));
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
                    if query.is_empty()
                        || title.to_lowercase().contains(&query)
                        || subtitle.to_lowercase().contains(&query)
                    {
                        if ui.button(format!("{title}\n{subtitle}")).clicked() {
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
        self.left_panel(ctx);
        self.right_panel(ctx);
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
