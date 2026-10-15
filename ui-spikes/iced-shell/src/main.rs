// SPDX-License-Identifier: MPL-2.0

use iced::alignment;
use iced::mouse;
use iced::widget::canvas::{self, Canvas};
use iced::widget::{button, checkbox, column, container, row, rule, scrollable, text, text_input, Space};
use iced::{Center, Color, Element, Fill, Font, Length, Pixels, Point, Rectangle, Renderer, Size, Theme};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WorkspaceTab { Project, Schematic, Cabinet, Data, Documentation }
impl WorkspaceTab {
    const ALL: [Self; 5] = [Self::Project, Self::Schematic, Self::Cabinet, Self::Data, Self::Documentation];
    fn label(self) -> &'static str { match self { Self::Project => "Projekt", Self::Schematic => "Stromlaufplan", Self::Cabinet => "Aufbau", Self::Data => "Daten", Self::Documentation => "Dokumentation" } }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum NavigatorTab { Pages, Devices, Terminals, Cables, Plc }
impl NavigatorTab {
    const ALL: [Self; 5] = [Self::Pages, Self::Devices, Self::Terminals, Self::Cables, Self::Plc];
    fn label(self) -> &'static str { match self { Self::Pages => "Seiten", Self::Devices => "Betriebsmittel", Self::Terminals => "Klemmen", Self::Cables => "Kabel", Self::Plc => "SPS" } }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DisplayMode { Light, DarkPaper, DarkCanvas }
impl DisplayMode {
    fn next(self) -> Self { match self { Self::Light => Self::DarkPaper, Self::DarkPaper => Self::DarkCanvas, Self::DarkCanvas => Self::Light } }
    fn label(self) -> &'static str { match self { Self::Light => "Hell", Self::DarkPaper => "Dunkel + heller Plan", Self::DarkCanvas => "Dunkler Plan" } }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DataTab { Devices, Terminals, Connections, Cables, Plc, Material, Potentials, Texts }
impl DataTab {
    const ALL: [Self; 8] = [Self::Devices, Self::Terminals, Self::Connections, Self::Cables, Self::Plc, Self::Material, Self::Potentials, Self::Texts];
    fn label(self) -> &'static str { match self { Self::Devices => "Betriebsmittel", Self::Terminals => "Klemmen", Self::Connections => "Verbindungen", Self::Cables => "Kabel", Self::Plc => "SPS / I/O", Self::Material => "Material", Self::Potentials => "Potentiale", Self::Texts => "Texte" } }
}

#[derive(Debug, Clone)]
enum Message {
    Workspace(WorkspaceTab), Navigator(NavigatorTab), DataTab(DataTab), CycleDisplayMode,
    TogglePalette, CommandChanged(String), CommandSelected(String),
    ProjectFilterChanged(String), NavigatorFilterChanged(String),
    InspectorFunctionChanged(String), InspectorLocationChanged(String), InspectorArticleChanged(String),
    FindingOnly(bool), SelectPage(usize), SelectProject(usize), SelectDataRow(usize), NoOp,
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
            inspector_function: "Schütz Motor Lüftung".into(),
            inspector_location: "+UV2".into(),
            inspector_article: "DILM17-10(230V50HZ)".into(),
            finding_only: false,
            status_message: "gespeichert".into(),
        }
    }
}

impl App {
    fn update(&mut self, msg: Message) {
        match msg {
            Message::Workspace(v) => self.workspace = v,
            Message::Navigator(v) => self.navigator = v,
            Message::DataTab(v) => self.data_tab = v,
            Message::CycleDisplayMode => self.display_mode = self.display_mode.next(),
            Message::TogglePalette => self.command_palette = !self.command_palette,
            Message::CommandChanged(v) => self.command_query = v,
            Message::CommandSelected(v) => { self.status_message = format!("Befehl: {v}"); self.command_palette = false; }
            Message::ProjectFilterChanged(v) => self.project_filter = v,
            Message::NavigatorFilterChanged(v) => self.navigator_filter = v,
            Message::InspectorFunctionChanged(v) => self.inspector_function = v,
            Message::InspectorLocationChanged(v) => self.inspector_location = v,
            Message::InspectorArticleChanged(v) => self.inspector_article = v,
            Message::FindingOnly(v) => self.finding_only = v,
            Message::SelectPage(v) => self.selected_page = v,
            Message::SelectProject(v) => self.selected_project = v,
            Message::SelectDataRow(v) => self.selected_data_row = v,
            Message::NoOp => {}
        }
    }

    fn theme(&self) -> Theme {
        match self.display_mode { DisplayMode::Light => Theme::Light, _ => Theme::Dark }
    }

    fn view(&self) -> Element<'_, Message> {
        let body = match self.workspace {
            WorkspaceTab::Project => self.project_workspace(),
            WorkspaceTab::Schematic => self.schematic_workspace(),
            WorkspaceTab::Cabinet => self.cabinet_workspace(),
            WorkspaceTab::Data => self.data_workspace(),
            WorkspaceTab::Documentation => self.documentation_workspace(),
        };
        let base = column![self.top_bar(), body, self.status_bar()].height(Fill);
        if self.command_palette { column![base, self.command_palette_view()].into() } else { base.into() }
    }

    fn top_bar(&self) -> Element<'_, Message> {
        let brand = column![text("⚡ Lindenstraße 12").size(14), text("+UV2 · Rev. B").size(9)].spacing(0).width(145);
        let mut tabs = row![brand].spacing(3).align_y(Center);
        for tab in WorkspaceTab::ALL {
            tabs = tabs.push(button(text(tab.label()).size(12)).style(if self.workspace == tab { button::primary } else { button::text }).on_press(Message::Workspace(tab)));
        }
        let search = button(row![text("⌕ Gerät, Artikel, Seite, Befehl …").size(11), Space::new().width(Fill), text("Ctrl K").size(9)].width(390))
            .style(button::secondary).on_press(Message::TogglePalette);
        let right = row![text("UX-Konzept").size(10), button(text(self.display_mode.label()).size(10)).style(button::secondary).on_press(Message::CycleDisplayMode), text("MK").size(11)].spacing(6).align_y(Center);
        container(row![tabs, Space::new().width(Fill), search, Space::new().width(Fill), right].spacing(8).align_y(Center).padding([4, 7])).width(Fill).into()
    }

    fn context_toolbar(&self) -> Element<'_, Message> {
        let tools = row![
            button("▣").style(button::secondary).on_press(Message::NoOp), button("↖").style(button::secondary).on_press(Message::NoOp),
            button("⌁").style(button::secondary).on_press(Message::NoOp), button("T").style(button::secondary).on_press(Message::NoOp),
            button("Symbol, Makro, Artikel …").style(button::secondary).on_press(Message::NoOp), button("↶").style(button::secondary).on_press(Message::NoOp), button("↷").style(button::secondary).on_press(Message::NoOp)
        ].spacing(3).align_y(Center);
        let page = row![text("-K1 Schütz Motor Lüftung").size(10), text("‹"), text("Seite 3 / 10").size(11), text("›")].spacing(8).align_y(Center);
        container(row![tools, Space::new().width(Fill), page].padding([3, 6]).align_y(Center)).width(Fill).into()
    }

    fn project_workspace(&self) -> Element<'_, Message> {
        row![self.project_list(), self.project_center(), self.project_findings()].height(Fill).into()
    }

    fn project_list(&self) -> Element<'_, Message> {
        let projects = [
            ("Lindenstraße 12 · Wohn- und Geschäftshaus", "UV2 · Rev. B · 10 Seiten", "vor 4 min"),
            ("Halle 3 · Lüftungssteuerung", "SV1 · Rev. D · 34 Seiten", "gestern"),
            ("Praxis Dr. Seidel · Zählerschrank", "ZS1 · Rev. A · 8 Seiten", "12.10.2026"),
            ("EFH Brandt · Hausverteiler", "HV · Rev. C · 6 Seiten", "08.10.2026"),
            ("Werkstatt Kühn · Maschinen-UV", "UV1 · Rev. A · 14 Seiten", "01.10.2026"),
        ];
        let mut list = column![text("PROJEKTE").size(10), text_input("Projekte durchsuchen", &self.project_filter).on_input(Message::ProjectFilterChanged).size(11)].spacing(6);
        for (i, (name, meta, time)) in projects.into_iter().enumerate() {
            if !self.project_filter.is_empty() && !name.to_lowercase().contains(&self.project_filter.to_lowercase()) { continue; }
            let item = column![text(name).size(11), row![text(meta).size(9), Space::new().width(Fill), text(time).size(9)]].spacing(1).width(Fill);
            list = list.push(button(item).width(Fill).style(if self.selected_project == i { button::primary } else { button::text }).on_press(Message::SelectProject(i)));
        }
        let templates = column![text("NEU AUS VORLAGE").size(9), text("▱ Wohnungsverteiler").size(10), text("▱ Gewerbe-Unterverteilung").size(10), text("▱ Steuerung mit SPS").size(10)].spacing(5);
        container(column![scrollable(list).height(Fill), rule::horizontal(1), templates].spacing(7)).padding(7).width(305).height(Fill).style(container::bordered_box).into()
    }

    fn project_center(&self) -> Element<'_, Message> {
        let header = column![
            text("=ANL · +UV2 · Rev. B · zuletzt bearbeitet vor 4 min von M. Krüger").size(9),
            text("Lindenstraße 12 · Wohn- und Geschäftshaus").size(19),
            text("Unterverteilung EG Gewerbe · 400/230 V TN-S · Referenzhersteller Eaton").size(10),
            row![
                button("Weiterarbeiten · Seite 3 →").style(button::primary).on_press(Message::Workspace(WorkspaceTab::Schematic)),
                button("▦ Aufbau +UV2").style(button::secondary).on_press(Message::Workspace(WorkspaceTab::Cabinet)),
                button("▤ Datenmanager").style(button::secondary).on_press(Message::Workspace(WorkspaceTab::Data)),
                button("⌕ Suchen  Ctrl K").style(button::text).on_press(Message::TogglePalette)
            ].spacing(5)
        ].spacing(7);
        let metrics = row![self.metric("Seiten", "10"), self.metric("Betriebsmittel", "77"), self.metric("Klemmen", "10"), self.metric("Prüfung", "3 Fehler · 6 Warn.")].spacing(5);
        let pages = [(1,"Deckblatt",false),(2,"Einspeisung HAK → UV2",false),(3,"Verteilung +UV2 · Abgänge EG",false),(4,"Verteilung +UV2 · Abgänge OG",false),(5,"Steuerung Lüftung 24 V DC",true),(6,"easyE4 · Ein-/Ausgänge",true),(7,"Abgänge Büro",false),(8,"Abgänge Lager / Außen",false),(20,"Aufbauplan +UV2",true),(21,"Klemmenplan -X1",false)];
        let mut rows = column![text("SEITEN").size(9)].spacing(1);
        for (n, title, finding) in pages {
            rows = rows.push(button(row![text(format!("{n:>2}")).size(10).width(30), text(title).size(10), Space::new().width(Fill), text(if finding { "●" } else { "—" }).size(10)]).width(Fill).style(button::text).on_press(Message::NoOp));
        }
        container(column![header, metrics, rule::horizontal(1), rows].spacing(10)).padding(12).width(Fill).height(Fill).into()
    }

    fn metric(&self, label: &'static str, value: &'static str) -> Element<'_, Message> {
        container(column![text(label).size(9), text(value).size(15)].spacing(3)).padding(8).width(Length::FillPortion(1)).style(container::bordered_box).into()
    }

    fn finding(&self, title: &'static str, subtitle: &'static str) -> Element<'_, Message> {
        row![text("●").size(11), column![text(title).size(10), text(subtitle).size(8)].spacing(1)].spacing(5).into()
    }

    fn project_findings(&self) -> Element<'_, Message> {
        let list = column![
            text("OFFENE PUNKTE").size(9), text("FEHLER 3").size(9),
            self.finding("Reihe 3: 39 / 36 TE", "Aufbau · Verteilerreihe +UV2 überbelegt um 3 TE"),
            self.finding("BMK doppelt: -F30", "Kennzeichnung · Licht Büro / Steckdosen Büro"),
            self.finding("Potentialkonflikt Seite 6.4", "24 V DC direkt mit N verbunden"),
            text("WARNUNGEN 6").size(9), self.finding("Artikel fehlt: -E1", "Artikel · Leuchte Werkstatt"),
            self.finding("Nicht in Frontansicht platziert: -K9", "Aufbau · Schütz Torantrieb"),
            self.finding("Gerätebreite fehlt: -F60", "Aufbau · TE erforderlich"),
            Space::new().height(Fill), text("SCHNELLSTART").size(9), text("Suchen / Befehl              Ctrl K").size(9), text("Einfügen                            I").size(9), text("Leitung                             W").size(9), text("Rückgängig                    Ctrl Z").size(9)
        ].spacing(7);
        container(list).padding(9).width(340).height(Fill).style(container::bordered_box).into()
    }

    fn schematic_workspace(&self) -> Element<'_, Message> {
        row![self.navigator_view(), column![self.context_toolbar(), Canvas::new(SchematicCanvas { mode: self.display_mode }).width(Fill).height(Fill)].width(Fill).height(Fill), self.inspector_view()].height(Fill).into()
    }

    fn navigator_view(&self) -> Element<'_, Message> {
        let mut tabs = row![].spacing(1);
        for tab in NavigatorTab::ALL { tabs = tabs.push(button(text(tab.label()).size(9)).style(if self.navigator == tab { button::primary } else { button::text }).on_press(Message::Navigator(tab))); }
        let mut list = column![tabs, text_input("Seiten filtern", &self.navigator_filter).on_input(Message::NavigatorFilterChanged).size(10), text("⌄ =ANL Lindenstraße 12").size(10), text("   ⌄ +UV2 Unterverteilung EG").size(10)].spacing(3);
        let pages = ["1   Deckblatt","2   Einspeisung HAK → UV2","3   Verteilung +UV2 · Abgänge EG","4   Verteilung +UV2 · Abgänge OG","5   Steuerung Lüftung 24 V DC    ●","6   easyE4 · Ein-/Ausgänge        ●","7   Abgänge Büro","8   Abgänge Lager / Außen","20  Aufbauplan +UV2              ●","21  Klemmenplan -X1"];
        for (i, item) in pages.into_iter().enumerate() { list = list.push(button(text(item).size(9)).width(Fill).style(if i == self.selected_page { button::primary } else { button::text }).on_press(Message::SelectPage(i))); }
        list = list.push(rule::horizontal(1));
        for i in 0..40usize {
            let s = match self.navigator { NavigatorTab::Pages => format!("{:>3} Seite / Funktionsgruppe {:04}", i+1,i+1), NavigatorTab::Devices => format!("-K{:04} Betriebsmittel {:04}",i+1,i+1), NavigatorTab::Terminals => format!("-X1:{:04} Klemme",i+1), NavigatorTab::Cables => format!("-W{:04} Kabel / Leitung",i+1), NavigatorTab::Plc => format!("%Q{}.{} SPS-Kanal",i/8,i%8) };
            list = list.push(text(s).size(8));
        }
        container(scrollable(list).height(Fill)).padding(5).width(250).height(Fill).style(container::bordered_box).into()
    }

    fn inspector_view(&self) -> Element<'_, Message> {
        let body = column![
            row![button("Eigenschaften").style(button::primary).on_press(Message::NoOp), button("Prüfung 10").style(button::text).on_press(Message::NoOp)].spacing(3), rule::horizontal(1),
            text("-K1").size(17), text("Schütz Motor Lüftung").size(11), text("=ANL+UV2-K1 · Leistungsschütz 3S+1S").size(8),
            row![button("▦ Im Aufbau").style(button::secondary).on_press(Message::Workspace(WorkspaceTab::Cabinet)), button("⇄ Artikel tauschen").style(button::secondary).on_press(Message::NoOp)].spacing(3),
            rule::horizontal(1), text("⌄ KENNZEICHNUNG").size(9),
            self.value_row("BMK", "-K1"),
            row![text("Funktion").size(9).width(100), text_input("", &self.inspector_function).on_input(Message::InspectorFunctionChanged).size(9)],
            row![text("Einbauort").size(9).width(100), text_input("", &self.inspector_location).on_input(Message::InspectorLocationChanged).size(9)],
            self.value_row("Verteiler", "UV2"), self.value_row("Reihe", "2"), rule::horizontal(1), text("⌄ ARTIKEL").size(9), self.value_row("Hersteller", "Eaton"),
            row![text("Artikelnr.").size(9).width(100), text_input("", &self.inspector_article).on_input(Message::InspectorArticleChanged).size(9)],
            self.value_row("Typ", "Leistungsschütz 3S+1S"), rule::horizontal(1), text("⌄ ELEKTRISCHE DATEN").size(9), self.value_row("Bemessungsstrom", "18 A"), self.value_row("Leistung AC-3", "7,5 kW"), self.value_row("Spulenspannung", "230 V AC"), self.value_row("Hilfskontakte", "1 S (13–14)"),
            rule::horizontal(1), text("⌄ MECHANISCHE DATEN").size(9), self.value_row("Breite", "2,5 TE"), self.value_row("B × H × T", "45 × 85 × 102 mm"), self.value_row("Position", "Reihe 2 · 3 TE"),
            rule::horizontal(1), text("⌄ GERÄT ERSCHEINT IN").size(9), text("▣ -K1  ›  DILM17-10(230V50HZ)").size(9)
        ].spacing(5);
        container(scrollable(body).height(Fill)).padding(7).width(310).height(Fill).style(container::bordered_box).into()
    }

    fn value_row(&self, label: &'static str, value: &'static str) -> Element<'_, Message> { row![text(label).size(9).width(115), text(value).size(9)].into() }

    fn cabinet_workspace(&self) -> Element<'_, Message> {
        let left = column![text("AUFBAU +UV2").size(10), text("Verteiler · 4 Reihen · 36 TE").size(9), rule::horizontal(1), text("Reihe 1  21 / 36 TE").size(10), text("Reihe 2  24 / 36 TE").size(10), text("Reihe 3  39 / 36 TE  ●").size(10), text("Reihe 4  30 / 36 TE").size(10), Space::new().height(8), text("NICHT PLATZIERT").size(9), text("-K9 Schütz Torantrieb").size(9), text("-F60 Leitungsschutz").size(9)].spacing(5);
        let right = column![text("EIGENSCHAFTEN").size(9), text("-F13").size(17), text("Leitungsschutz Büro").size(10), rule::horizontal(1), self.value_row("Hersteller", "Eaton"), self.value_row("Breite", "1 TE"), self.value_row("Reihe", "3"), self.value_row("Position", "17 TE"), rule::horizontal(1), text("PRÜFUNG").size(9), text("● Reihe 3 überbelegt: 39 / 36 TE").size(9), text("● 2 Geräte noch nicht platziert").size(9)].spacing(6);
        row![container(left).padding(9).width(250).height(Fill).style(container::bordered_box), column![self.context_toolbar(), Canvas::new(CabinetCanvas { dark: self.display_mode != DisplayMode::Light }).width(Fill).height(Fill)].width(Fill).height(Fill), container(right).padding(9).width(310).height(Fill).style(container::bordered_box)].height(Fill).into()
    }

    fn data_workspace(&self) -> Element<'_, Message> {
        let mut tabs = row![].spacing(2);
        for tab in DataTab::ALL { tabs = tabs.push(button(text(tab.label()).size(9)).style(if self.data_tab == tab { button::primary } else { button::text }).on_press(Message::DataTab(tab))); }
        let controls = row![checkbox(self.finding_only).label("Nur mit Befunden").on_toggle(Message::FindingOnly), button("Spalten").style(button::secondary).on_press(Message::NoOp), button("Suchen und Ersetzen").style(button::secondary).on_press(Message::NoOp), button("Mehrfachänderung").style(button::secondary).on_press(Message::NoOp)].spacing(6).align_y(Center);
        let mut rows = column![row![text("BMK").size(9).width(80), text("Funktion").size(9).width(220), text("Ort").size(9).width(100), text("Hersteller").size(9).width(120), text("Artikel").size(9).width(190), text("Status").size(9).width(90)], rule::horizontal(1)].spacing(1);
        for i in 0..250usize {
            let finding = i % 37 == 0; if self.finding_only && !finding { continue; }
            rows = rows.push(button(row![text(format!("-K{}",i+1)).size(8).width(80), text(format!("Funktion {:05}",i+1)).size(8).width(220), text(format!("+UV{}",i%12+1)).size(8).width(100), text(if i%3==0 {"Eaton"} else {"—"}).size(8).width(120), text(format!("ART-{:06}",i+1)).size(8).width(190), text(if finding {"● Befund"} else {"✓ OK"}).size(8).width(90)]).width(Fill).style(if self.selected_data_row==i {button::primary} else {button::text}).on_press(Message::SelectDataRow(i)));
        }
        let right = column![text("PROJEKTPRÜFUNG").size(9), text("3 Fehler · 6 Warnungen").size(13), rule::horizontal(1), self.finding("BMK doppelt: -F30", "Kennzeichnung"), self.finding("Potentialkonflikt Seite 6.4", "Verbindung"), self.finding("Artikel fehlt: -E1", "Material"), self.finding("Reihe 3 überbelegt", "Aufbau")].spacing(7);
        row![container(column![tabs, controls, rule::horizontal(1), scrollable(rows).height(Fill)].spacing(7)).padding(7).width(Fill).height(Fill), container(right).padding(9).width(310).height(Fill).style(container::bordered_box)].height(Fill).into()
    }

    fn documentation_workspace(&self) -> Element<'_, Message> {
        let left = column![text("DOKUMENTSTRUKTUR").size(9), button("Deckblatt").style(button::text).on_press(Message::NoOp), button("Inhaltsverzeichnis").style(button::text).on_press(Message::NoOp), button("Aufbauplan").style(button::text).on_press(Message::NoOp), button("Stromlaufpläne").style(button::text).on_press(Message::NoOp), button("Stückliste").style(button::primary).on_press(Message::NoOp), button("Klemmenplan").style(button::text).on_press(Message::NoOp), button("Kabelliste").style(button::text).on_press(Message::NoOp)].spacing(3);
        let preview = column![text("Vorschau · Stückliste").size(15), text("A3 quer · Titelblock · Revision B").size(9), rule::horizontal(1), text("Pos.   BMK          Hersteller          Artikel").size(10), rule::horizontal(1), text("1      -K1          Eaton               DILM17-10").size(9), text("2      -Q1          Eaton               PKE32").size(9), text("3      -S0          Eaton               M22-PV").size(9), text("4      -S1          Eaton               M22-D-G").size(9)].spacing(7);
        let right = column![text("EXPORTEINSTELLUNGEN").size(9), self.value_row("Format", "PDF"), self.value_row("Papier", "A3 quer"), self.value_row("Farben", "Farbig"), self.value_row("Titelblock", "Standard IEC"), self.value_row("Revision", "B"), Space::new().height(8), button("PDF erzeugen").style(button::primary).on_press(Message::NoOp)].spacing(6);
        row![container(left).padding(9).width(250).height(Fill).style(container::bordered_box), container(preview).padding(16).width(Fill).height(Fill), container(right).padding(9).width(310).height(Fill).style(container::bordered_box)].height(Fill).into()
    }

    fn status_bar(&self) -> Element<'_, Message> {
        container(row![text(format!("✓ {}",self.status_message)).size(9), text("X 1470 · Y 1010 mm").size(9), text("Raster 5 mm · Fang an").size(9), Space::new().width(Fill), text("● 3  ● 6").size(9), text("de-DE · IEC 81346").size(9)].spacing(12).align_y(Center).padding([2,7])).width(Fill).into()
    }

    fn command_palette_view(&self) -> Element<'_, Message> {
        let q = self.command_query.to_lowercase();
        let commands = [("-K1","Betriebsmittel · Schütz Motor Lüftung"),("DILM17","Artikel · Eaton DILM17"),("Seite 23","Seite öffnen"),("Frontansicht","Aufbau öffnen"),("Stückliste erzeugen","Dokumentation"),("Projekt prüfen","Prüfung starten")];
        let mut list = column![row![text_input("Gerät, Artikel, Seite oder Befehl …", &self.command_query).on_input(Message::CommandChanged).width(Fill), button("×").style(button::secondary).on_press(Message::TogglePalette)].spacing(5), rule::horizontal(1)].spacing(3);
        for (title, sub) in commands { if q.is_empty() || title.to_lowercase().contains(&q) || sub.to_lowercase().contains(&q) { list = list.push(button(column![text(title).size(11), text(sub).size(8)].spacing(1)).width(Fill).style(button::text).on_press(Message::CommandSelected(title.into()))); } }
        container(list).padding(8).width(Fill).style(container::bordered_box).into()
    }
}

#[derive(Debug, Clone, Copy)]
struct SchematicCanvas { mode: DisplayMode }
impl canvas::Program<Message> for SchematicCanvas {
    type State = ();
    fn draw(&self, _state: &Self::State, renderer: &Renderer, _theme: &Theme, bounds: Rectangle, _cursor: mouse::Cursor) -> Vec<canvas::Geometry> {
        let mut frame = canvas::Frame::new(renderer, bounds.size());
        let workspace = if self.mode == DisplayMode::Light { Color::from_rgb8(218,222,226) } else { Color::from_rgb8(17,19,21) };
        let page_bg = if self.mode == DisplayMode::DarkCanvas { Color::from_rgb8(31,34,37) } else { Color::from_rgb8(250,251,252) };
        let ink = if self.mode == DisplayMode::DarkCanvas { Color::from_rgb8(230,234,236) } else { Color::from_rgb8(38,43,48) };
        let minor = if self.mode == DisplayMode::DarkCanvas { Color::from_rgb8(49,54,58) } else { Color::from_rgb8(235,238,240) };
        let major = if self.mode == DisplayMode::DarkCanvas { Color::from_rgb8(67,73,78) } else { Color::from_rgb8(214,219,223) };
        let blue=Color::from_rgb8(34,145,230); let green=Color::from_rgb8(39,161,87); let red=Color::from_rgb8(218,83,87); let orange=Color::from_rgb8(236,126,31);
        frame.fill_rectangle(Point::ORIGIN,bounds.size(),workspace);
        let m=26.0; let p=Point::new(m,m); let s=Size::new((bounds.width-2.0*m).max(20.0),(bounds.height-2.0*m).max(20.0));
        frame.fill_rectangle(p,s,page_bg); frame.stroke(&canvas::Path::rectangle(p,s),canvas::Stroke::default().with_color(Color::from_rgb8(135,142,148)).with_width(1.0));
        let mut x=p.x; let mut n=0; while x<=p.x+s.width { frame.stroke(&canvas::Path::line(Point::new(x,p.y),Point::new(x,p.y+s.height)),canvas::Stroke::default().with_color(if n%5==0{major}else{minor}).with_width(0.7)); x+=24.0; n+=1; }
        let mut y=p.y; n=0; while y<=p.y+s.height { frame.stroke(&canvas::Path::line(Point::new(p.x,y),Point::new(p.x+s.width,y)),canvas::Stroke::default().with_color(if n%5==0{major}else{minor}).with_width(0.7)); y+=24.0; n+=1; }
        let l=p.x+40.0; let r=p.x+s.width-40.0; for (i,c) in [ink,ink,ink,blue].into_iter().enumerate(){let yy=p.y+64.0+i as f32*20.0; frame.stroke(&canvas::Path::line(Point::new(l,yy),Point::new(r,yy)),canvas::Stroke::default().with_color(c).with_width(1.2));}
        frame.stroke(&canvas::Path::line(Point::new(l,p.y+s.height-72.0),Point::new(r,p.y+s.height-72.0)),canvas::Stroke::default().with_color(green).with_width(1.2));
        for i in 0..3 { let xx=l+180.0+i as f32*170.0; frame.stroke(&canvas::Path::line(Point::new(xx,p.y+64.0),Point::new(xx,p.y+420.0)),canvas::Stroke::default().with_color(ink).with_width(1.1)); frame.stroke(&canvas::Path::line(Point::new(xx-8.0,p.y+220.0),Point::new(xx+14.0,p.y+245.0)),canvas::Stroke::default().with_color(ink).with_width(1.1)); }
        let cx=(p.x+s.width*0.67).min(r-80.0); frame.stroke(&canvas::Path::line(Point::new(cx,p.y+124.0),Point::new(cx,p.y+305.0)),canvas::Stroke::default().with_color(blue).with_width(1.2)); frame.stroke(&canvas::Path::line(Point::new(cx,p.y+305.0),Point::new(cx+72.0,p.y+305.0)),canvas::Stroke::default().with_color(red).with_width(1.2)); frame.stroke(&canvas::Path::line(Point::new(cx+72.0,p.y+305.0),Point::new(cx+72.0,p.y+180.0)),canvas::Stroke::default().with_color(blue).with_width(1.2));
        let mut label=|content:&str,pos:Point,size:f32,color:Color| frame.fill_text(canvas::Text{content:content.into(),position:pos,color,size:Pixels(size),font:Font::DEFAULT,align_x:text::Alignment::Left,align_y:alignment::Vertical::Top,..canvas::Text::default()});
        label("/2.8",Point::new(l-18.0,p.y+46.0),10.0,orange); label("/4.1",Point::new(r-12.0,p.y+46.0),10.0,orange); label("L1",Point::new(l,p.y+48.0),9.0,ink); label("L2",Point::new(l,p.y+68.0),9.0,ink); label("L3",Point::new(l,p.y+88.0),9.0,ink); label("N",Point::new(l,p.y+108.0),9.0,blue); label("PE",Point::new(l,p.y+s.height-90.0),9.0,green); label("-K1",Point::new(cx-20.0,p.y+286.0),10.0,ink); label("230 V AC",Point::new(cx+82.0,p.y+291.0),8.0,red); label("Schütz Motor Lüftung",Point::new(cx-34.0,p.y+350.0),10.0,ink); label("-X1:12",Point::new(p.x+s.width*0.57,p.y+535.0),9.0,ink);
        vec![frame.into_geometry()]
    }
}

#[derive(Debug, Clone, Copy)]
struct CabinetCanvas { dark: bool }
impl canvas::Program<Message> for CabinetCanvas {
    type State=();
    fn draw(&self,_:&Self::State,renderer:&Renderer,_:&Theme,bounds:Rectangle,_:mouse::Cursor)->Vec<canvas::Geometry>{
        let mut f=canvas::Frame::new(renderer,bounds.size()); let bg=if self.dark{Color::from_rgb8(18,20,22)}else{Color::from_rgb8(226,229,232)}; let panel=if self.dark{Color::from_rgb8(34,38,41)}else{Color::WHITE}; let ink=if self.dark{Color::from_rgb8(226,231,233)}else{Color::from_rgb8(38,43,48)}; let cyan=Color::from_rgb8(28,183,216); let red=Color::from_rgb8(226,83,77);
        f.fill_rectangle(Point::ORIGIN,bounds.size(),bg); let m=70.0; let p=Point::new(m,m); let s=Size::new((bounds.width-2.0*m).max(100.0),(bounds.height-2.0*m).max(100.0)); f.fill_rectangle(p,s,panel); f.stroke(&canvas::Path::rectangle(p,s),canvas::Stroke::default().with_color(ink).with_width(1.5)); let rh=s.height/5.2;
        for row_i in 0..4usize { let y=p.y+50.0+row_i as f32*rh; let rr=canvas::Path::rectangle(Point::new(p.x+35.0,y),Size::new(s.width-70.0,rh-18.0)); f.stroke(&rr,canvas::Stroke::default().with_color(if row_i==2{red}else{ink}).with_width(1.0)); let cell=(s.width-70.0)/36.0; for te in 1..36usize{let x=p.x+35.0+te as f32*cell; f.stroke(&canvas::Path::line(Point::new(x,y),Point::new(x,y+rh-18.0)),canvas::Stroke::default().with_color(Color::from_rgb8(93,101,106)).with_width(0.5));} for d in 0..6usize{let x=p.x+35.0+(d*4+row_i) as f32*cell; let w=cell*if d%2==0{2.0}else{3.0}; f.stroke(&canvas::Path::rectangle(Point::new(x,y+7.0),Size::new(w,rh-32.0)),canvas::Stroke::default().with_color(cyan).with_width(1.2));} f.fill_text(canvas::Text{content:format!("Reihe {}   {} / 36 TE",row_i+1,if row_i==2{39}else{21+row_i*3}),position:Point::new(p.x+35.0,y-16.0),color:if row_i==2{red}else{ink},size:Pixels(10.0),..canvas::Text::default()}); }
        vec![f.into_geometry()]
    }
}

fn main()->iced::Result{ iced::application(App::default,App::update,App::view).theme(App::theme).window_size((1600.0,1000.0)).run() }
