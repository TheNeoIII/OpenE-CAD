# Fortschritt

## 14.10.2026 – P0 fachlich abgeschlossen / Lizenzentscheidung offen

### Letzte P0-Spezifikationen

- [x] `docs/TITLE_BLOCK_TEMPLATE_MODEL.md` erstellt
- [x] FrameTemplate und TitleBlockTemplate als versionierte Vorlagen definiert
- [x] sichere deklarative Datenbindungen wie `{project.name}` und `{sheet.page_label}` vorgesehen
- [x] einfache Formatfilter, bedingte Sichtbarkeit und Revisionstabellen vorgesehen
- [x] eingebettete Scripts/Dateisystem-/Netzwerkzugriff in Templates ausgeschlossen
- [x] CompanyProfile, LogoSlots, Template-Snapshots und Templateprüfung spezifiziert
- [x] Screen- und PDF-Ausgabe auf dasselbe Template-Modell ausgerichtet

- [x] `docs/PLC_IO_MODEL.md` erstellt
- [x] PLCSystem, Station, Module und Channel herstellerneutral modelliert
- [x] SPS-Adresse strikt von BMK und stabiler Objekt-ID getrennt
- [x] PLCAddressProfile als hersteller-/plattformabhängige Format-/Parserregel vorgesehen
- [x] automatische/manuelle Adressierung getrennt und Preview/Undo vorbereitet
- [x] PLCChannels in denselben elektrischen ConnectionPoint-/Netzgraph integriert
- [x] I/O-Navigator, Datenmanager, I/O-Liste und spätere Import-/Sync-Adapter spezifiziert
- [x] Safety-I/O semantisch vorbereitet, ohne Sicherheitsnachweis zu behaupten

### Offener P0-Punkt

- [ ] **endgültige Projektlizenz durch Projektowner festlegen**
  - aktuelle Empfehlung: MPL-2.0
  - Alternative für stärkeren Copyleft-Schutz: GPL-3.0-or-later

Die Lizenzentscheidung blockiert die fachliche Architektur nicht, soll aber vor dem ersten Produktivcode getroffen werden.

### Nächster technischer Schritt

P1 kann nun mit **isoliertem Spike-/Wegwerfcode** beginnen:

1. S1 Core Types / Geometry
2. S2 wgpu CAD Renderer
3. danach UI-Shell-Vergleich Slint / egui / iced

Der Spike-Code wird klar von Produktivcode getrennt und unter `spikes/` abgelegt.

---

## 14.10.2026 – P1 vorbereitet

### Technische Grundentscheidungen

- [x] `docs/CORE_TECH_DECISIONS.md` erstellt
- [x] **UUIDv7** als persistente Standard-ID für neue Domänenobjekte festgelegt
- [x] persistente CAD-Geometrie als **`i64` in µm** festgelegt
- [x] Paper Space, Model Space und Screen Space semantisch getrennt
- [x] TE-Werte als ganzzahlige milli-TE statt Float vorgesehen
- [x] freie Rotation als Fixed-Point-Winkel und fachlicher Maßstab rational vorgesehen
- [x] GPU-/Screen-Floats ausdrücklich als Cache/View-Daten statt Projektwahrheit festgelegt

### Rust-Zielarchitektur

- [x] `docs/TECHNICAL_ARCHITECTURE.md` erstellt
- [x] Domain Core von UI, Renderer, Persistenz, Validation und Katalog getrennt
- [x] Mutation ausschließlich über Commands/Transactions vorgesehen
- [x] Read-only Queries/Projections für UI vorgesehen
- [x] RenderScene als renderoptimierter Cache zwischen Domain und GPU vorgesehen
- [x] wgpu als aktueller CAD-Renderer-Favorit für den Spike festgelegt
- [x] UI-Framework bleibt austauschbar bis zum Vergleich
- [x] Slint, egui und iced als Spike-Kandidaten festgelegt
- [x] Bildschirmrendering und PDF/SVG-Vektorexport als getrennte Backends vorgesehen

### Technischer Spike-Plan

- [x] `docs/TECHNICAL_SPIKE_PLAN.md` erstellt
- [x] Spike-Reihenfolge S1–S8 definiert
- [x] Core-Geometrie-/Roundtrip-Test definiert
- [x] wgpu-CAD-Renderer-Test mit kleinen, großen und Stress-Szenen definiert
- [x] Light/Dark/Full-Dark-Rendererzustände aufgenommen
- [x] identische v0-Shell für Slint, egui und iced als Vergleichstest festgelegt
- [x] Framework-Bewertungsmatrix mit Gewichtungen definiert
- [x] große Datenmanager-Tabelle mit 10.000 Zeilen als UI-Testfall vorgesehen
- [x] Cross-platform-/DPI-Matrix vorbereitet
- [x] Persistence-/Migration-/Roundtrip-Spike definiert
- [x] Referenzprojekt für Spikes ausdrücklich synthetisch/anonym vorgesehen

### Lizenzstrategie

- [x] `docs/LICENSE_STRATEGY.md` erstellt
- [x] aktuelle Lizenzbedingungen relevanter UI-/Renderer-Kandidaten geprüft
- [x] MPL-2.0 als **vorläufiger Favorit** dokumentiert
- [x] Hersteller-/Katalogdaten von der Code-Lizenz getrennt

---

## 14.10.2026 – Fachliche Kernmodelle spezifiziert

### Symbol / Funktionen / Anschlüsse

- [x] `docs/SYMBOL_FUNCTION_MODEL.md`
- [x] FunctionTemplates, ConnectionTemplates und PortBindings
- [x] SymbolDefinition strikt von Device/Function getrennt
- [x] Artikelwechsel als kontrollierte Funktionsmigration
- [x] Makros als Platzierungs-/Schaltungsrezepte
- [x] mechanische Frontdarstellung getrennt vom Stromlaufplansymbol
- [x] Bibliotheksversionierung und Projekt-Snapshots

### Referenzkennzeichen / BMK

- [x] `docs/REFERENCE_DESIGNATION_MODEL.md`
- [x] stabile IDs unabhängig von sichtbaren BMK
- [x] IEC-81346-orientiertes, profilbasiertes Aspektmodell
- [x] Strukturvererbung, Overrides, manuelle/automatische Kennzeichen
- [x] Nummerierungssequenzen, Reservierungen und Renummerierungs-Preview
- [x] Klemmen-, Kabel- und SPS-Unterkennzeichnungen getrennt

### Verteiler / Aufbau

- [x] `docs/CABINET_LAYOUT_MODEL.md`
- [x] Enclosure, MountingSurface, RailRow, CabinetPlacement
- [x] TE und mm getrennt
- [x] `unplaced / auto / manual / locked`
- [x] deterministische Auto-Layout-Pipeline
- [x] stabile Positionen, Reservefelder, Türflächen, Gruppen
- [x] Preview + atomare Undo-Transaktion

### Klemmen / Kabel

- [x] `docs/TERMINAL_CABLE_MODEL.md`
- [x] TerminalStrip, Terminal, Levels und Bridges
- [x] Mehrstock-, PE-, Trenn- und Durchgangsklemmen vorbereitet
- [x] Cable, CableCore und CableShield
- [x] Reserveadern und Aderzuweisungen
- [x] Klemmenplan/Kabelliste/Verdrahtungsliste als Projektionen des Graphen

### Undo / Transaktionen / Recovery

- [x] `docs/UNDO_TRANSACTION_MODEL.md`
- [x] Commands, atomare Transactions, Preview-Commands und Composite Commands
- [x] sinnvolles Coalescing bei Drag/Textedit
- [x] Delete ImpactReport
- [x] Project State vs. Workspace State
- [x] Autosave/Recovery und Atomic Save

### `.oecad`

- [x] `docs/PROJECT_FORMAT.md`
- [x] ZIP-kompatibler JSON-Container als Arbeitshypothese
- [x] Manifest, Domain-Dateien, Sheets, Profile, Assets und Snapshots
- [x] `format_version` und `schema_version` getrennt
- [x] Migrationen, Feature Flags und Integritätsprüfung
- [x] Atomic Save, Recovery-Sidecar, Lockfile und optionaler entpackter Modus

### Artikel / Herstellerkatalog

- [x] `docs/ARTICLE_CATALOG_MODEL.md`
- [x] Manufacturer, Article, typisierte Properties und Provenance
- [x] Datenqualität und Lizenz-/Redistributionsmetadaten
- [x] Katalogschichten und Projekt-Snapshots
- [x] Zubehör-/Alternativartikelbeziehungen
- [x] BOM-Aggregation

### Projektprüfung

- [x] `docs/VALIDATION_MODEL.md`
- [x] ValidationRule, RuleProfile, Finding, Suppression und FixAction
- [x] harte Invarianten getrennt von normalen Findings
- [x] stabile ObjectRefs und LocationHints
- [x] Inspector, Aufbau und `Nur mit Befunden` auf derselben Finding-Quelle
- [x] Exportpolitik und spätere inkrementelle Validation vorbereitet

### Zentrale Architekturentscheidungen

- Fachobjekte werden über stabile IDs verknüpft, nie über formatierte BMK-Texte.
- Symbole sind Darstellungen von Functions; sie sind weder Article noch Device.
- Stromlaufplan, Aufbau, Datenmanager und Dokumentation referenzieren dieselben Geräteinstanzen.
- Elektrische Topologie und gezeichnete Leitungsgeometrie sind getrennt.
- Linienkreuzung verbindet standardmäßig nicht; T-Verbindungen verwenden explizite JunctionNodes.
- Auswertungen werden aus dem gemeinsamen Projektmodell generiert.
- Auto-Layout ist deterministisch und respektiert manuelle/gesperrte Positionen.
- Jede fachliche Mutation läuft über Commands/Transactions und ist grundsätzlich Undo-fähig.
- `.oecad` verwendet eine explizite Persistenz-/DTO-Schicht statt interner Rust-Structs als öffentliches Schema.
- `0 Projektbefunde` ist keine pauschale Aussage über normative oder elektrische Sicherheit.

---

## 14.10.2026 – Seitentypen und elektrisches Modell

- [x] `docs/SHEET_TYPES.md`
- [x] manuelle, datengetriebene und generierte Seiten getrennt
- [x] technische Projektseite, Dokumentseite und physische PDF-Seite getrennt
- [x] Titelblock-/Rahmen-Templates und Datenbindings vorgesehen
- [x] Dokumentationssets unabhängig von Projektseitenfolge
- [x] `docs/ELECTRICAL_MODEL.md`
- [x] ConnectionPoint, Net, ElectricalConnection und ConnectionPath getrennt
- [x] JunctionNodes für T-Verbindungen
- [x] ContinuationNodes für Seitenfortsetzungen
- [x] schaltende Funktionen trennen statische Netze
- [x] Potentialtyp, Renderfarbe und physische Leiterfarbe getrennt

---

## 14.10.2026 – Designsystem und Datenmodell v0.1

- [x] `docs/DESIGN_SYSTEM.md`
- [x] `design/design-tokens.json`
- [x] Light, Dark UI + heller Plan und Full-Dark-Canvas spezifiziert
- [x] Layout-, Typografie-, Farb- und Interaktionstokens
- [x] `docs/DATA_MODEL.md`
- [x] `Article → Device → Function → ConnectionPoint → Net/Connection → Placement`
- [x] TE und reale mm-Abmessungen getrennt

---

## 14.10.2026 – v0 Designiteration 2

- [x] vollständigen v0-Prototyp/ZIP geprüft
- [x] 32 Ansichten ausgewertet und inventarisiert
- [x] v0 als aktuelle bevorzugte UI/UX-Designbasis übernommen
- [x] `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation`
- [x] Ctrl+K Command Palette
- [x] permanenter dynamischer Inspector
- [x] Dark UI + heller Zeichenbogen als bevorzugter Dark-Standard
- [x] Full-Dark-Canvas optional

Der Next.js/React-Code bleibt ausschließlich Designreferenz.

---

## 14.10.2026 – Private Referenzpläne

- [x] private ELCAD- und WSCAD-Beispiele analysiert
- [x] Original-PDFs werden nicht öffentlich gespeichert
- [x] abstrahierte Anforderungen dokumentiert
- [x] vollständige Projekt-PDF, Verteilerfront und farbige Potentialdarstellung aufgenommen

---

## 13.10.2026 – Projektstart

- [x] Repository `TheNeoIII/OpenE-CAD`
- [x] Produktvision
- [x] eigenständige Neuentwicklung statt Fork/Port
- [x] Rust als primäre Sprache
- [x] EPLAN/WSCAD/ELCAD/QElectroTech als Referenzen
- [x] Eaton als erster Hersteller-Referenzfall
- [x] erste UI-Mockups
- [x] offene Projekt-/Bibliotheksformate als Ziel

## Aktueller Status

**Noch kein Produktivcode.** Fachlich ist P0 bis auf die endgültige Lizenzbestätigung abgeschlossen. Der nächste technische Schritt ist S1/S2 des dokumentierten Spike-Plans: Core-Geometrietypen und ein isolierter wgpu-CAD-Renderer-Test.
