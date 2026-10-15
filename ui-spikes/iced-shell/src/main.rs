// SPDX-License-Identifier: MPL-2.0

use iced::alignment;
use iced::mouse;
use iced::theme;
use iced::widget::canvas::{self, Canvas};
use iced::widget::{
    button, checkbox, column, container, horizontal_rule, row, scrollable, text, text_input,
    Space,
};
use iced::{
    Center, Color, Element, Fill, Font, Length, Pixels, Point, Rectangle, Renderer, Size, Theme,
};

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
enum DisplayMode {
    Light,
    DarkPaper,
    DarkCanvas,
}

impl DisplayMode {
    fn next(self) -> Self {
        match self {
            Self::Light => Self::DarkPaper,
            Self::DarkPaper => Self::DarkCanvas,
            Self::DarkCanvas => Self::Light,
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Light => "Hell",
            Self::DarkPaper => "Dunkel + heller Plan",
            Self::DarkCanvas => "Dunkler Plan",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DataTab {
    Devices,
    Terminals,
    Connections,
    Cables,
    Plc,
    Material,
    Potentials,
    Texts,
}

impl DataTab {
    const ALL: [Self; 8] = [
        Self::Devices,
        Self::Terminals,
        Self::Connections,
        Self::Cables,
        Self::Plc,
        Self::Material,
        Self::Potentials,
        Self::Texts,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::Devices => "Betriebsmittel",
            Self::Terminals => "Klemmen",
            Self::Connections => "Verbindungen",
            Self::Cables => "Kabel",
            Self::Plc => "SPS / I/O",
            Self::Material => "Material",
            Self::Potentials => "Potentiale",
            Self::Texts => "Texte",
        }
    }
}

#[derive(Debug, Clone)]
enum Message {
    Workspace(WorkspaceTab),
    Navigator(NavigatorTab),
    DataTab(DataTab),
    CycleDisplayMode,
    TogglePalette,
    CommandChanged(String),
    CommandSelected(String),
    ProjectFilterChanged(String),
    NavigatorFilterChanged(String),
    InspectorFunctionChanged(String),
    InspectorLocationChanged(String),
    InspectorArticleChanged(String),
    FindingOnly(bool),
    SelectPage(usize),
    SelectProject(usize),
    SelectDataRow(usize),
    NoOp,
}

struct App {
    workspace: WorkspaceTab,
    navigator: NavigatorTab,
    display_mode: DisplayMode,
    data_tab: DataTab,
    command_palette: bool,
    command_query: String,
    project_filter: String,
    navigator_filter: String,
    selected_page: usize,
    selected_project: usize,
    selected_data_row: usize,
    inspector_function: String,
    inspector_location: String,
    inspector_article: String,
    finding_only: bool,
    status_message: String,
}

impl Default for App {
    fn default() -> Self {
        Self {
            workspace: WorkspaceTab::Project,
            navigator: NavigatorTab::Pages,
            display_mode: DisplayMode::DarkPaper,
            data_tab: DataTab::Devices,
            command_palette: false,
            command_query: String::new(),
            project_filter: String::new(),
            navigator_filter: String::new(),
            selected_page: 2,
            selected_project: 0,
            selected_data_row: 0,
            inspector_function: "Schütz Motor Lüftung".to_owned(),
            inspector_location: "+UV2".to_owned(),
            inspector_article: "DILM17-10(230V50HZ)".to_owned(),
            finding_only: false,
            status_message: "gespeichert".to_owned(),
        }
    }
}

impl App {
    fn update(&mut self, message: Message) {
        match message {
            Message::Workspace(tab) => self.workspace = tab,
            Message::Navigator(tab) => self.navigator = tab,
            Message::DataTab(tab) => self.data_tab = tab,
            Message::CycleDisplayMode => self.display_mode = self.display_mode.next(),
            Message::TogglePalette => self.command_palette = !self.command_palette,
            Message::CommandChanged(value) => self.command_query = value,
            Message::CommandSelected(value) => {
                self.status_message = format!("Befehl: {value}");
                self.command_palette = false;
            }
            Message::ProjectFilterChanged(value) => self.project_filter = value,
            Message::NavigatorFilterChanged(value) => self.navigator_filter = value,
            Message::InspectorFunctionChanged(value) => self.inspector_function = value,
            Message::InspectorLocationChanged(value) => self.inspector_location = value,
            Message::InspectorArticleChanged(value) => self.inspector_article = value,
            Message::FindingOnly(value) => self.finding_only = value,
            Message::SelectPage(index) => self.selected_page = index,
            Message::SelectProject(index) => self.selected_project = index,
            Message::SelectDataRow(index) => self.selected_data_row = index,
            Message::NoOp => {}
        }
    }

    fn theme(&self) -> Theme {
        match self.display_mode {
            DisplayMode::Light => Theme::Light,
            DisplayMode::DarkPaper | DisplayMode::DarkCanvas => Theme::custom(
                String::from("OpenE-CAD Dark"),
                theme::palette::Seed {
                    background: Color::from_rgb8(24, 27, 29),
                    primary: Color::from_rgb8(23, 177, 211),
                    text: Color::from_rgb8(224, 229, 232),
                    success: Color::from_rgb8(63, 180, 112),
                    warning: Color::from_rgb8(235, 168, 49),
                    danger: Color::from_rgb8(226, 83, 77),
                },
            ),
        }
    }

    fn view(&self) -> Element<'_, Message> {
        let top = self.top_bar();
        let body = match self.workspace {
            WorkspaceTab::Project => self.project_workspace(),
            WorkspaceTab::Schematic => self.schematic_workspace(),
            WorkspaceTab::Cabinet => self.cabinet_workspace(),
            WorkspaceTab::Data => self.data_workspace(),
            WorkspaceTab::Documentation => self.documentation_workspace(),
        };

        let base = column![top, body, self.status_bar()].height(Fill);

        if self.command_palette {
            column![base, self.command_palette_view()].into()
        } else {
            base.into()
        }
    }

    fn top_bar(&self) -> Element<'_, Message> {
        let brand = column![
            text("⚡  Lindenstraße 12").size(15),
            text("+UV2 · Rev. B").size(10),
        ]
        .spacing(0)
        .width(140);

        let mut tabs = row![brand].spacing(4).align_y(Center);
        for tab in WorkspaceTab::ALL {
            let selected = self.workspace == tab;
            tabs = tabs.push(
                button(text(tab.label()).size(13))
                    .style(if selected { button::primary } else { button::text })
                    .on_press(Message::Workspace(tab)),
            );
        }

        let search = button(
            row![
                text("⌕  Gerät, Artikel, Seite, Befehl …").size(12),
                Space::new().width(Fill),
                text("Ctrl K").size(10),
            ]
            .width(410),
        )
        .style(button::secondary)
        .on_press(Message::TogglePalette);

        let right = row![
            text("UX-Konzept").size(11),
            button(text(self.display_mode.label()).size(11))
                .style(button::secondary)
                .on_press(Message::CycleDisplayMode),
            text("MK").size(12),
        ]
        .spacing(8)
        .align_y(Center);

        let bar = row![tabs, Space::new().width(Fill), search, Space::new().width(Fill), right]
            .spacing(8)
            .align_y(Center)
            .padding([5, 8]);

        container(bar).width(Fill).into()
    }

    fn context_toolbar(&self) -> Element<'_, Message> {
        let tools = row![
            button("▣").style(button::secondary).on_press(Message::NoOp),
            button("↖").style(button::secondary).on_press(Message::NoOp),
            button("⌁").style(button::secondary).on_press(Message::NoOp),
            button("T").style(button::secondary).on_press(Message::NoOp),
            button("Symbol, Makro, Artikel …")
                .style(button::secondary)
                .on_press(Message::NoOp),
            button("↶").style(button::secondary).on_press(Message::NoOp),
            button("↷").style(button::secondary).on_press(Message::NoOp),
        ]
        .spacing(4)
        .align_y(Center);

        let page = row![
            text("-K1 Schütz Motor Lüftung").size(11),
            text("‹").size(14),
            text("Seite 3 / 10").size(12),
            text("›").size(14),
        ]
        .spacing(10)
        .align_y(Center);

        container(
            row![tools, Space::new().width(Fill), page]
                .spacing(8)
                .align_y(Center)
                .padding([4, 8]),
        )
        .width(Fill)
        .into()
    }

    fn project_workspace(&self) -> Element<'_, Message> {
        let left = self.project_list();
        let center = self.project_center();
        let right = self.project_findings();

        row![left, center, right].height(Fill).into()
    }

    fn project_list(&self) -> Element<'_, Message> {
        let projects = [
            ("Lindenstraße 12 · Wohn- und Geschäftshaus", "UV2 · Rev. B · 10 Seiten", "vor 4 min"),
            ("Halle 3 · Lüftungssteuerung", "SV1 · Rev. D · 34 Seiten", "gestern"),
            ("Praxis Dr. Seidel · Zählerschrank", "ZS1 · Rev. A · 8 Seiten", "12.10.2026"),
            ("EFH Brandt · Hausverteiler", "HV · Rev. C · 6 Seiten", "08.10.2026"),
            ("Werkstatt Kühn · Maschinen-UV", "UV1 · Rev. A · 14 Seiten", "01.10.2026"),
        ];

        let mut list = column![text("PROJEKTE").size(11),
            text_input("Projekte durchsuchen", &self.project_filter)
                .on_input(Message::ProjectFilterChanged)
                .size(12)
        ]
        .spacing(8);

        for (index, (name, meta, time)) in projects.into_iter().enumerate() {
            if !self.project_filter.is_empty()
                && !name.to_lowercase().contains(&self.project_filter.to_lowercase())
            {
                continue;
            }
            let content = column![
                text(name).size(12),
                row![text(meta).size(10), Space::new().width(Fill), text(time).size(10)],
            ]
            .spacing(2)
            .width(Fill);
            list = list.push(
                button(content)
                    .width(Fill)
                    .style(if self.selected_project == index { button::primary } else { button::text })
                    .on_press(Message::SelectProject(index)),
            );
        }

        let templates = column![
            text("NEU AUS VORLAGE").size(10),
            button(column![text("Wohnungsverteiler").size(11), text("1–4 Reihen · FI/LS, Zähler").size(9)])
                .width(Fill)
                .style(button::text)
                .on_press(Message::NoOp),
            button(column![text("Gewerbe-Unterverteilung").size(11), text("NH, SPD, Schütze").size(9)])
                .width(Fill)
                .style(button::text)
                .on_press(Message::NoOp),
            button(column![text("Steuerung mit SPS").size(11), text("easyE4, 24 V DC, I/O-Listen").size(9)])
                .width(Fill)
                .style(button::text)
                .on_press(Message::NoOp),
        ]
        .spacing(4);

        container(column![scrollable(list).height(Fill), horizontal_rule(1), templates].spacing(8))
            .padding(8)
            .width(305)
            .height(Fill)
            .style(container::bordered_box)
            .into()
    }

    fn project_center(&self) -> Element<'_, Message> {
        let header = column![
            text("=ANL  ·  +UV2  ·  Rev. B  ·  zuletzt bearbeitet vor 4 min von M. Krüger").size(10),
            text("Lindenstraße 12 · Wohn- und Geschäftshaus").size(20),
            text("Unterverteilung EG Gewerbe · 400/230 V TN-S · Referenzhersteller Eaton").size(11),
            row![
                button("Weiterarbeiten · Seite 3 →").style(button::primary).on_press(Message::Workspace(WorkspaceTab::Schematic)),
                button("▦ Aufbau +UV2").style(button::secondary).on_press(Message::Workspace(WorkspaceTab::Cabinet)),
                button("▤ Datenmanager").style(button::secondary).on_press(Message::Workspace(WorkspaceTab::Data)),
                button("⌕ Suchen   Ctrl K").style(button::text).on_press(Message::TogglePalette),
            ]
            .spacing(6),
        ]
        .spacing(8);

        let metrics = row![
            self.metric("Seiten", "10"),
            self.metric("Betriebsmittel", "77"),
            self.metric("Klemmen", "10"),
            self.metric("Prüfung", "3 Fehler · 6 Warn."),
        ]
        .spacing(6);

        let pages = [
            (1, "Deckblatt", false),
            (2, "Einspeisung HAK → UV2", false),
            (3, "Verteilung +UV2 · Abgänge EG", false),
            (4, "Verteilung +UV2 · Abgänge OG", false),
            (5, "Steuerung Lüftung 24 V DC", true),
            (6, "easyE4 · Ein-/Ausgänge", true),
            (7, "Abgänge Büro", false),
            (8, "Abgänge Lager / Außen", false),
            (20, "Aufbauplan +UV2", true),
            (21, "Klemmenplan -X1", false),
        ];
        let mut page_list = column![text("SEITEN").size(10)].spacing(2);
        for (number, title, finding) in pages {
            page_list = page_list.push(
                button(
                    row![
                        text(format!("{number:>2}")).size(11).width(30),
                        text(title).size(11),
                        Space::new().width(Fill),
                        text(if finding { "●" } else { "—" }).size(11),
                    ]
                    .align_y(Center),
                )
                .width(Fill)
                .style(button::text)
                .on_press(Message::NoOp),
            );
        }

        container(column![header, metrics, horizontal_rule(1), page_list].spacing(12))
            .padding(14)
            .width(Fill)
            .height(Fill)
            .into()
    }

    fn project_findings(&self) -> Element<'_, Message> {
        let findings = column![
            text("OFFENE PUNKTE").size(10),
            text("FEHLER 3").size(10),
            self.finding("●", "Reihe 3: 39 / 36 TE", "Aufbau · Verteilerreihe +UV2 überbelegt um 3 TE"),
            self.finding("●", "BMK doppelt: -F30", "Kennzeichnung · Licht Büro / Steckdosen Büro"),
            self.finding("●", "Potentialkonflikt Seite 6.4", "24 V DC direkt mit N verbunden"),
            text("WARNUNGEN 6").size(10),
            self.finding("●", "Artikel fehlt: -E1", "Artikel · Leuchte Werkstatt"),
            self.finding("●", "Nicht in Frontansicht platziert: -K9", "Aufbau · Schütz Torantrieb"),
            self.finding("●", "Gerätebreite fehlt: -F60", "Aufbau · TE erforderlich"),
            text("HINWEISE 1").size(10),
            self.finding("●", "Klemme -X1:9 ohne Belegung", "Als Reserve kennzeichnen oder entfernen"),
            Space::new().height(Fill),
            text("SCHNELLSTART").size(10),
            text("Suchen / Befehl                Ctrl K").size(10),
            text("Einfügen                              I").size(10),
            text("Leitung                               W").size(10),
            text("Rückgängig                      Ctrl Z").size(10),
            text("Ansicht wechseln              Alt 1–5").size(10),
        ]
        .spacing(8);

        container(findings)
            .padding(10)
            .width(340)
            .height(Fill)
            .style(container::bordered_box)
            .into()
    }

    fn metric(&self, label: &'static str, value: &'static str) -> Element<'_, Message> {
        container(column![text(label).size(10), text(value).size(16)].spacing(4))
            .padding(10)
            .width(Length::FillPortion(1))
            .style(container::bordered_box)
            .into()
    }

    fn finding(&self, dot: &'static str, title: &'static str, subtitle: &'static str) -> Element<'_, Message> {
        row![
            text(dot).size(12),
            column![text(title).size(11), text(subtitle).size(9)].spacing(2),
        ]
        .spacing(6)
        .into()
    }

    fn schematic_workspace(&self) -> Element<'_, Message> {
        let nav = self.navigator_view();
        let center = column![
            self.context_toolbar(),
            Canvas::new(SchematicCanvas {
                mode: self.display_mode,
            })
            .width(Fill)
            .height(Fill),
        ]
        .height(Fill)
        .width(Fill);
        let inspector = self.inspector_view();
        row![nav, center, inspector].height(Fill).into()
    }

    fn navigator_view(&self) -> Element<'_, Message> {
        let mut tabs = row![].spacing(2);
        for tab in NavigatorTab::ALL {
            tabs = tabs.push(
                button(text(tab.label()).size(10))
                    .style(if self.navigator == tab { button::primary } else { button::text })
                    .on_press(Message::Navigator(tab)),
            );
        }

        let mut list = column![tabs,
            text_input("Seiten filtern", &self.navigator_filter)
                .on_input(Message::NavigatorFilterChanged)
                .size(11),
            text("⌄ =ANL Lindenstraße 12").size(11),
            text("   ⌄ +UV2 Unterverteilung EG").size(11),
        ]
        .spacing(4);

        let real_pages = [
            "1   Deckblatt",
            "2   Einspeisung HAK → UV2",
            "3   Verteilung +UV2 · Abgänge EG",
            "4   Verteilung +UV2 · Abgänge OG",
            "5   Steuerung Lüftung 24 V DC      ●",
            "6   easyE4 · Ein-/Ausgänge          ●",
            "7   Abgänge Büro",
            "8   Abgänge Lager / Außen",
            "20  Aufbauplan +UV2                ●",
            "21  Klemmenplan -X1",
        ];
        for (index, item) in real_pages.into_iter().enumerate() {
            list = list.push(
                button(text(item).size(10))
                    .width(Fill)
                    .style(if index == self.selected_page { button::primary } else { button::text })
                    .on_press(Message::SelectPage(index)),
            );
        }
        list = list.push(horizontal_rule(1));
        for row_index in 0..1_000usize {
            if row_index < 40 {
                let label = match self.navigator {
                    NavigatorTab::Pages => format!("{:>3}  Seite / Funktionsgruppe {:04}", row_index + 1, row_index + 1),
                    NavigatorTab::Devices => format!("-K{:04}  Betriebsmittel {:04}", row_index + 1, row_index + 1),
                    NavigatorTab::Terminals => format!("-X1:{:04}  Klemme", row_index + 1),
                    NavigatorTab::Cables => format!("-W{:04}  Kabel / Leitung", row_index + 1),
                    NavigatorTab::Plc => format!("%Q{}.{}  SPS-Kanal", row_index / 8, row_index % 8),
                };
                list = list.push(text(label).size(9));
            }
        }

        container(scrollable(list).height(Fill))
            .padding(6)
            .width(250)
            .height(Fill)
            .style(container::bordered_box)
            .into()
    }

    fn inspector_view(&self) -> Element<'_, Message> {
        let content = column![
            row![
                button("Eigenschaften").style(button::primary).on_press(Message::NoOp),
                button("Prüfung  10").style(button::text).on_press(Message::NoOp),
            ]
            .spacing(4),
            horizontal_rule(1),
            text("-K1").size(18),
            text("Schütz Motor Lüftung").size(12),
            text("=ANL+UV2-K1 · Leistungsschütz 3S+1S").size(9),
            row![
                button("▦ Im Aufbau").style(button::secondary).on_press(Message::Workspace(WorkspaceTab::Cabinet)),
                button("⇄ Artikel tauschen").style(button::secondary).on_press(Message::NoOp),
            ]
            .spacing(4),
            horizontal_rule(1),
            text("⌄ KENNZEICHNUNG").size(10),
            self.edit_row("BMK", "-K1", None),
            self.edit_row("Funktion", &self.inspector_function, Some(Message::InspectorFunctionChanged)),
            self.edit_row("Einbauort", &self.inspector_location, Some(Message::InspectorLocationChanged)),
            self.edit_row("Verteiler", "UV2", None),
            self.edit_row("Reihe", "2", None),
            horizontal_rule(1),
            text("⌄ ARTIKEL").size(10),
            self.edit_row("Hersteller", "Eaton", None),
            self.edit_row("Artikelnr.", &self.inspector_article, Some(Message::InspectorArticleChanged)),
            self.edit_row("Typ", "Leistungsschütz 3S+1S", None),
            horizontal_rule(1),
            text("⌄ ELEKTRISCHE DATEN").size(10),
            self.value_row("Bemessungsstrom", "18 A"),
            self.value_row("Leistung AC-3", "7,5 kW"),
            self.value_row("Spulenspannung", "230 V AC"),
            self.value_row("Hilfskontakte", "1 S (13–14)"),
            horizontal_rule(1),
            text("⌄ MECHANISCHE DATEN").size(10),
            self.value_row("Breite", "2,5 TE"),
            self.value_row("B × H × T", "45 × 85 × 102 mm"),
            self.value_row("Position", "Reihe 2 · 3 TE"),
            horizontal_rule(1),
            text("⌄ GERÄT ERSCHEINT IN").size(10),
            text("▣ -K1   ›   DILM17-10(230V50HZ)").size(10),
        ]
        .spacing(6);

        container(scrollable(content).height(Fill))
            .padding(8)
            .width(310)
            .height(Fill)
            .style(container::bordered_box)
            .into()
    }

    fn edit_row<'a>(
        &'a self,
        label: &'static str,
        value: &'a str,
        message: Option<fn(String) -> Message>,
    ) -> Element<'a, Message> {
        let editor: Element<'a, Message> = if let Some(on_input) = message {
            text_input("", value).on_input(on_input).size(10).into()
        } else {
            text(value).size(10).into()
        };
        row![text(label).size(10).width(105), editor].align_y(Center).into()
    }

    fn value_row(&self, label: &'static str, value: &'static str) -> Element<'_, Message> {
        row![text(label).size(10).width(120), text(value).size(10)].into()
    }

    fn cabinet_workspace(&self) -> Element<'_, Message> {
        let left = column![
            text("AUFBAU +UV2").size(11),
            text("Verteiler · 4 Reihen · 36 TE").size(10),
            horizontal_rule(1),
            text("Reihe 1    21 / 36 TE").size(11),
            text("Reihe 2    24 / 36 TE").size(11),
            text("Reihe 3    39 / 36 TE  ●").size(11),
            text("Reihe 4    30 / 36 TE").size(11),
            Space::new().height(8),
            text("NICHT PLATZIERT").size(10),
            text("-K9 Schütz Torantrieb").size(10),
            text("-F60 Leitungsschutz").size(10),
        ]
        .spacing(6);

        let front = Canvas::new(CabinetCanvas {
            dark: self.display_mode != DisplayMode::Light,
        })
        .width(Fill)
        .height(Fill);

        let right = column![
            text("EIGENSCHAFTEN").size(10),
            text("-F13").size(18),
            text("Leitungsschutz Büro").size(11),
            horizontal_rule(1),
            self.value_row("Hersteller", "Eaton"),
            self.value_row("Breite", "1 TE"),
            self.value_row("Reihe", "3"),
            self.value_row("Position", "17 TE"),
            horizontal_rule(1),
            text("PRÜFUNG").size(10),
            text("● Reihe 3 überbelegt: 39 / 36 TE").size(10),
            text("● 2 Geräte noch nicht platziert").size(10),
        ]
        .spacing(6);

        row![
            container(left).padding(10).width(250).height(Fill).style(container::bordered_box),
            column![self.context_toolbar(), front].width(Fill).height(Fill),
            container(right).padding(10).width(310).height(Fill).style(container::bordered_box),
        ]
        .height(Fill)
        .into()
    }

    fn data_workspace(&self) -> Element<'_, Message> {
        let mut tabs = row![].spacing(3);
        for tab in DataTab::ALL {
            tabs = tabs.push(
                button(text(tab.label()).size(10))
                    .style(if self.data_tab == tab { button::primary } else { button::text })
                    .on_press(Message::DataTab(tab)),
            );
        }

        let controls = row![
            checkbox(self.finding_only).label("Nur mit Befunden").on_toggle(Message::FindingOnly),
            button("Spalten").style(button::secondary).on_press(Message::NoOp),
            button("Suchen und Ersetzen").style(button::secondary).on_press(Message::NoOp),
            button("Mehrfachänderung").style(button::secondary).on_press(Message::NoOp),
        ]
        .spacing(8)
        .align_y(Center);

        let header = row![
            text("BMK").size(10).width(80),
            text("Funktion").size(10).width(220),
            text("Ort").size(10).width(100),
            text("Hersteller").size(10).width(120),
            text("Artikel").size(10).width(200),
            text("Status").size(10).width(100),
        ];

        let mut rows = column![header, horizontal_rule(1)].spacing(1);
        for index in 0..250usize {
            let finding = index % 37 == 0;
            if self.finding_only && !finding {
                continue;
            }
            rows = rows.push(
                button(
                    row![
                        text(format!("-K{}", index + 1)).size(9).width(80),
                        text(format!("Funktion {:05}", index + 1)).size(9).width(220),
                        text(format!("+UV{}", index % 12 + 1)).size(9).width(100),
                        text(if index % 3 == 0 { "Eaton" } else { "—" }).size(9).width(120),
                        text(format!("ART-{:06}", index + 1)).size(9).width(200),
                        text(if finding { "● Befund" } else { "✓ OK" }).size(9).width(100),
                    ],
                )
                .width(Fill)
                .style(if self.selected_data_row == index { button::primary } else { button::text })
                .on_press(Message::SelectDataRow(index)),
            );
        }

        let right = column![
            text("PROJEKTPRÜFUNG").size(10),
            text("3 Fehler · 6 Warnungen").size(14),
            horizontal_rule(1),
            self.finding("●", "BMK doppelt: -F30", "Kennzeichnung"),
            self.finding("●", "Potentialkonflikt Seite 6.4", "Verbindung"),
            self.finding("●", "Artikel fehlt: -E1", "Material"),
            self.finding("●", "Reihe 3 überbelegt", "Aufbau"),
        ]
        .spacing(8);

        row![
            container(column![tabs, controls, horizontal_rule(1), scrollable(rows).height(Fill)].spacing(8))
                .padding(8)
                .width(Fill)
                .height(Fill),
            container(right).padding(10).width(310).height(Fill).style(container::bordered_box),
        ]
        .height(Fill)
        .into()
    }

    fn documentation_workspace(&self) -> Element<'_, Message> {
        let structure = column![
            text("DOKUMENTSTRUKTUR").size(10),
            button("Deckblatt").style(button::text).on_press(Message::NoOp),
            button("Inhaltsverzeichnis").style(button::text).on_press(Message::NoOp),
            button("Aufbauplan").style(button::text).on_press(Message::NoOp),
            button("Stromlaufpläne").style(button::text).on_press(Message::NoOp),
            button("Stückliste").style(button::primary).on_press(Message::NoOp),
            button("Klemmenplan").style(button::text).on_press(Message::NoOp),
            button("Kabelliste").style(button::text).on_press(Message::NoOp),
        ]
        .spacing(4);

        let preview = column![
            text("Vorschau · Stückliste").size(15),
            text("A3 quer · Titelblock · Revision B").size(10),
            horizontal_rule(1),
            row![text("Pos.").size(10).width(50), text("BMK").size(10).width(90), text("Hersteller").size(10).width(150), text("Artikel").size(10).width(220)],
            horizontal_rule(1),
            text("1      -K1          Eaton                 DILM17-10").size(10),
            text("2      -Q1          Eaton                 PKE32").size(10),
            text("3      -S0          Eaton                 M22-PV").size(10),
            text("4      -S1          Eaton                 M22-D-G").size(10),
        ]
        .spacing(8);

        let export = column![
            text("EXPORTEINSTELLUNGEN").size(10),
            self.value_row("Format", "PDF"),
            self.value_row("Papier", "A3 quer"),
            self.value_row("Farben", "Farbig"),
            self.value_row("Titelblock", "Standard IEC"),
            self.value_row("Revision", "B"),
            Space::new().height(8),
            button("PDF erzeugen").style(button::primary).on_press(Message::NoOp),
        ]
        .spacing(7);

        row![
            container(structure).padding(10).width(250).height(Fill).style(container::bordered_box),
            container(preview).padding(18).width(Fill).height(Fill),
            container(export).padding(10).width(310).height(Fill).style(container::bordered_box),
        ]
        .height(Fill)
        .into()
    }

    fn status_bar(&self) -> Element<'_, Message> {
        container(
            row![
                text(format!("✓ {}", self.status_message)).size(10),
                text("X 1470 · Y 1010 mm").size(10),
                text("Raster 5 mm · Fang an").size(10),
                Space::new().width(Fill),
                text("● 3   ● 6").size(10),
                text("de-DE · IEC 81346").size(10),
            ]
            .spacing(14)
            .align_y(Center)
            .padding([3, 8]),
        )
        .width(Fill)
        .into()
    }

    fn command_palette_view(&self) -> Element<'_, Message> {
        let query = self.command_query.to_lowercase();
        let commands = [
            ("-K1", "Betriebsmittel · Schütz Motor Lüftung"),
            ("DILM17", "Artikel · Eaton DILM17"),
            ("Seite 23", "Seite öffnen"),
            ("Frontansicht", "Aufbau öffnen"),
            ("Stückliste erzeugen", "Dokumentation"),
            ("Projekt prüfen", "Prüfung starten"),
        ];

        let mut results = column![
            row![
                text_input("Gerät, Artikel, Seite oder Befehl …", &self.command_query)
                    .on_input(Message::CommandChanged)
                    .width(Fill),
                button("×").style(button::secondary).on_press(Message::TogglePalette),
            ]
            .spacing(6),
            horizontal_rule(1),
        ]
        .spacing(4);

        for (title, subtitle) in commands {
            if query.is_empty()
                || title.to_lowercase().contains(&query)
                || subtitle.to_lowercase().contains(&query)
            {
                results = results.push(
                    button(column![text(title).size(12), text(subtitle).size(9)].spacing(1))
                        .width(Fill)
                        .style(button::text)
                        .on_press(Message::CommandSelected(title.to_owned())),
                );
            }
        }

        container(results)
            .padding(10)
            .width(Fill)
            .style(container::bordered_box)
            .into()
    }
}

#[derive(Debug, Clone, Copy)]
struct SchematicCanvas {
    mode: DisplayMode,
}

impl canvas::Program<Message> for SchematicCanvas {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> Vec<canvas::Geometry> {
        let mut frame = canvas::Frame::new(renderer, bounds.size());
        let workspace = match self.mode {
            DisplayMode::Light => Color::from_rgb8(218, 222, 226),
            DisplayMode::DarkPaper | DisplayMode::DarkCanvas => Color::from_rgb8(18, 20, 22),
        };
        let page_bg = match self.mode {
            DisplayMode::DarkCanvas => Color::from_rgb8(31, 34, 37),
            _ => Color::from_rgb8(250, 251, 252),
        };
        let ink = if self.mode == DisplayMode::DarkCanvas {
            Color::from_rgb8(230, 234, 236)
        } else {
            Color::from_rgb8(38, 43, 48)
        };
        let grid_minor = if self.mode == DisplayMode::DarkCanvas {
            Color::from_rgb8(49, 54, 58)
        } else {
            Color::from_rgb8(235, 238, 240)
        };
        let grid_major = if self.mode == DisplayMode::DarkCanvas {
            Color::from_rgb8(67, 73, 78)
        } else {
            Color::from_rgb8(214, 219, 223)
        };
        let blue = Color::from_rgb8(34, 145, 230);
        let green = Color::from_rgb8(39, 161, 87);
        let red = Color::from_rgb8(218, 83, 87);
        let orange = Color::from_rgb8(236, 126, 31);

        frame.fill_rectangle(Point::ORIGIN, bounds.size(), workspace);
        let margin = 26.0;
        let page_pos = Point::new(margin, margin);
        let page_size = Size::new((bounds.width - margin * 2.0).max(10.0), (bounds.height - margin * 2.0).max(10.0));
        frame.fill_rectangle(page_pos, page_size, page_bg);
        let border = canvas::Path::rectangle(page_pos, page_size);
        frame.stroke(&border, canvas::Stroke::default().with_color(Color::from_rgb8(132, 139, 145)).with_width(1.0));

        let step = 24.0;
        let mut x = page_pos.x;
        let mut index = 0usize;
        while x <= page_pos.x + page_size.width {
            let color = if index % 5 == 0 { grid_major } else { grid_minor };
            frame.stroke(
                &canvas::Path::line(Point::new(x, page_pos.y), Point::new(x, page_pos.y + page_size.height)),
                canvas::Stroke::default().with_color(color).with_width(0.7),
            );
            x += step;
            index += 1;
        }
        let mut y = page_pos.y;
        index = 0;
        while y <= page_pos.y + page_size.height {
            let color = if index % 5 == 0 { grid_major } else { grid_minor };
            frame.stroke(
                &canvas::Path::line(Point::new(page_pos.x, y), Point::new(page_pos.x + page_size.width, y)),
                canvas::Stroke::default().with_color(color).with_width(0.7),
            );
            y += step;
            index += 1;
        }

        let left = page_pos.x + 40.0;
        let right = page_pos.x + page_size.width - 40.0;
        for (i, color) in [ink, ink, ink, blue].into_iter().enumerate() {
            let yy = page_pos.y + 64.0 + i as f32 * 20.0;
            frame.stroke(
                &canvas::Path::line(Point::new(left, yy), Point::new(right, yy)),
                canvas::Stroke::default().with_color(color).with_width(1.2),
            );
        }
        frame.stroke(
            &canvas::Path::line(
                Point::new(left, page_pos.y + page_size.height - 72.0),
                Point::new(right, page_pos.y + page_size.height - 72.0),
            ),
            canvas::Stroke::default().with_color(green).with_width(1.2),
        );

        for i in 0..3 {
            let xx = left + 180.0 + i as f32 * 170.0;
            frame.stroke(
                &canvas::Path::line(Point::new(xx, page_pos.y + 64.0), Point::new(xx, page_pos.y + 420.0)),
                canvas::Stroke::default().with_color(ink).with_width(1.1),
            );
            frame.stroke(
                &canvas::Path::line(Point::new(xx - 8.0, page_pos.y + 220.0), Point::new(xx + 14.0, page_pos.y + 245.0)),
                canvas::Stroke::default().with_color(ink).with_width(1.1),
            );
        }

        let cx = (page_pos.x + page_size.width * 0.67).min(right - 80.0);
        frame.stroke(
            &canvas::Path::line(Point::new(cx, page_pos.y + 124.0), Point::new(cx, page_pos.y + 305.0)),
            canvas::Stroke::default().with_color(blue).with_width(1.2),
        );
        frame.stroke(
            &canvas::Path::line(Point::new(cx, page_pos.y + 305.0), Point::new(cx + 72.0, page_pos.y + 305.0)),
            canvas::Stroke::default().with_color(red).with_width(1.2),
        );
        frame.stroke(
            &canvas::Path::line(Point::new(cx + 72.0, page_pos.y + 305.0), Point::new(cx + 72.0, page_pos.y + 180.0)),
            canvas::Stroke::default().with_color(blue).with_width(1.2),
        );

        let draw_text = |frame: &mut canvas::Frame, content: &str, pos: Point, size: f32, color: Color| {
            frame.fill_text(canvas::Text {
                content: content.to_owned(),
                position: pos,
                color,
                size: Pixels(size),
                font: Font::DEFAULT,
                align_x: text::Alignment::Left,
                align_y: alignment::Vertical::Top,
                ..canvas::Text::default()
            });
        };

        draw_text(&mut frame, "/2.8", Point::new(left - 18.0, page_pos.y + 46.0), 10.0, orange);
        draw_text(&mut frame, "/4.1", Point::new(right - 12.0, page_pos.y + 46.0), 10.0, orange);
        draw_text(&mut frame, "L1", Point::new(left, page_pos.y + 48.0), 9.0, ink);
        draw_text(&mut frame, "L2", Point::new(left, page_pos.y + 68.0), 9.0, ink);
        draw_text(&mut frame, "L3", Point::new(left, page_pos.y + 88.0), 9.0, ink);
        draw_text(&mut frame, "N", Point::new(left, page_pos.y + 108.0), 9.0, blue);
        draw_text(&mut frame, "PE", Point::new(left, page_pos.y + page_size.height - 90.0), 9.0, green);
        draw_text(&mut frame, "-K1", Point::new(cx - 20.0, page_pos.y + 286.0), 10.0, ink);
        draw_text(&mut frame, "A1", Point::new(cx + 18.0, page_pos.y + 289.0), 8.0, ink);
        draw_text(&mut frame, "230 V AC", Point::new(cx + 82.0, page_pos.y + 291.0), 8.0, red);
        draw_text(&mut frame, "Schütz Motor Lüftung", Point::new(cx - 34.0, page_pos.y + 350.0), 10.0, ink);
        draw_text(&mut frame, "-X1:12", Point::new(page_pos.x + page_size.width * 0.57, page_pos.y + 535.0), 9.0, ink);

        vec![frame.into_geometry()]
    }
}

#[derive(Debug, Clone, Copy)]
struct CabinetCanvas {
    dark: bool,
}

impl canvas::Program<Message> for CabinetCanvas {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> Vec<canvas::Geometry> {
        let mut frame = canvas::Frame::new(renderer, bounds.size());
        let bg = if self.dark { Color::from_rgb8(18, 20, 22) } else { Color::from_rgb8(226, 229, 232) };
        let panel = if self.dark { Color::from_rgb8(34, 38, 41) } else { Color::WHITE };
        let ink = if self.dark { Color::from_rgb8(226, 231, 233) } else { Color::from_rgb8(38, 43, 48) };
        let cyan = Color::from_rgb8(28, 183, 216);
        let red = Color::from_rgb8(226, 83, 77);

        frame.fill_rectangle(Point::ORIGIN, bounds.size(), bg);
        let margin = 70.0;
        let pos = Point::new(margin, margin);
        let size = Size::new((bounds.width - margin * 2.0).max(100.0), (bounds.height - margin * 2.0).max(100.0));
        frame.fill_rectangle(pos, size, panel);
        let outer = canvas::Path::rectangle(pos, size);
        frame.stroke(&outer, canvas::Stroke::default().with_color(ink).with_width(1.5));

        let row_h = size.height / 5.2;
        for row_index in 0..4usize {
            let y = pos.y + 50.0 + row_index as f32 * row_h;
            let row_rect = canvas::Path::rectangle(Point::new(pos.x + 35.0, y), Size::new(size.width - 70.0, row_h - 18.0));
            frame.stroke(&row_rect, canvas::Stroke::default().with_color(if row_index == 2 { red } else { ink }).with_width(1.0));
            let cell = (size.width - 70.0) / 36.0;
            for te in 1..36usize {
                let x = pos.x + 35.0 + te as f32 * cell;
                frame.stroke(
                    &canvas::Path::line(Point::new(x, y), Point::new(x, y + row_h - 18.0)),
                    canvas::Stroke::default().with_color(Color::from_rgb8(93, 101, 106)).with_width(0.5),
                );
            }
            for device in 0..6usize {
                let x = pos.x + 35.0 + (device * 4 + row_index) as f32 * cell;
                let w = cell * if device % 2 == 0 { 2.0 } else { 3.0 };
                let device_rect = canvas::Path::rectangle(Point::new(x, y + 7.0), Size::new(w, row_h - 32.0));
                frame.stroke(&device_rect, canvas::Stroke::default().with_color(cyan).with_width(1.2));
            }
            frame.fill_text(canvas::Text {
                content: format!("Reihe {}   {} / 36 TE", row_index + 1, if row_index == 2 { 39 } else { 21 + row_index * 3 }),
                position: Point::new(pos.x + 35.0, y - 16.0),
                color: if row_index == 2 { red } else { ink },
                size: Pixels(10.0),
                ..canvas::Text::default()
            });
        }

        vec![frame.into_geometry()]
    }
}

fn main() -> iced::Result {
    iced::application(App::default, App::update, App::view)
        .theme(App::theme)
        .window_size((1600.0, 1000.0))
        .run()
}
