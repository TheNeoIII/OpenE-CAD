# Fortschritt

## 14.10.2026 – MPL-2.0 beschlossen / P1 gestartet

### Lizenz

- [x] **Mozilla Public License 2.0 (MPL-2.0)** als verbindliche Projektlizenz beschlossen
- [x] vollständige `LICENSE` im Repository abgelegt
- [x] `docs/LICENSE_STRATEGY.md` von Entscheidungsvorlage auf beschlossen aktualisiert
- [x] SPDX-Identifier `MPL-2.0` für neue Rust-Quelldateien festgelegt
- [x] Hersteller-/Katalogdaten weiterhin lizenzrechtlich getrennt vom Programmcode behandelt

### S1 – Core Types / Geometry

- [x] experimentellen Rust-Workspace unter `spikes/` angelegt
- [x] UUIDv7 als `ObjectId` umgesetzt
- [x] persistente Koordinaten als `i64`-µm umgesetzt
- [x] Paper-, Model- und Screen-Space als getrennte Typen begonnen
- [x] milli-TE umgesetzt
- [x] deterministisches Raster/Snap inklusive negativer Koordinaten umgesetzt
- [x] exakte orthogonale Rotation und Integer-Bounds/Hit-Test-Basis umgesetzt
- [x] JSON/Serde-Roundtrip-Test umgesetzt
- [x] **6/6 Tests unter Ubuntu bestanden**
- [x] **6/6 Tests unter Windows bestanden**
- [x] Ergebnisse unter `spikes/core-geometry/results.md` dokumentiert

Zwischenfazit: **UUIDv7 + `i64`-µm + milli-TE bleiben bestätigt.**

### S2 – wgpu CAD Renderer

- [x] isolierten Renderer-Spike mit `wgpu 30.0.1` und `winit 0.30.13` angelegt
- [x] WGSL-LineList-Pipeline umgesetzt
- [x] synthetische technische A3-Testszene ohne private Projektdaten erstellt
- [x] N blau, PE grün, Steuerzweig rot und Querverweise orange dargestellt
- [x] Light- und Full-Dark-Canvas eingebaut
- [x] Pan per mittlerer Maustaste und Zoom per Mausrad eingebaut
- [x] Referenz- und Stressszene mit zusätzlich 10.000 Segmenten eingebaut
- [x] FPS-/Segmentanzeige vorbereitet
- [x] ersten CI-API-Bruch von wgpu 30 gefunden und behoben
- [x] `cargo check` **unter Ubuntu bestanden**
- [x] `cargo check` **unter Windows bestanden**
- [x] Ergebnisse unter `spikes/cad-renderer/results.md` dokumentiert
- [x] Windows-Release-Preview als GitHub-Actions-Artefakt vorbereitet

Wichtig: CI bestätigt derzeit Kompilierbarkeit. Interaktives GPU-/DPI-Verhalten muss zusätzlich auf realer Desktop-Hardware geprüft werden.

### CI

- [x] Cross-Platform-Workflow für Ubuntu + Windows angelegt
- [x] `actions/checkout@v5` verwendet
- [x] S1 Unit-Tests und S2 `cargo check` automatisiert
- [x] reine Spike-Dokumentationsänderungen von unnötigen Build-Runs ausgeschlossen
- [x] separaten Windows-Preview-Build mit Artefakt-Upload angelegt

### Nächste P1-Schritte

1. S1: Paper↔Screen-Transformation, DPI, Zoom-Anker und rationale Maßstäbe
2. S2: Zoom exakt auf Cursor, Raster, Document/Workspace-Trennung
3. S2: Junction-/Auswahlzustände und Hit Testing
4. S2: technische Textdarstellung evaluieren (`glyphon`/`cosmic-text` als Kandidat)
5. S2: Baseline A gegen gecachte `RenderScene` und partielle Invalidation messen
6. anschließend S3: identische UI-Shell in Slint / egui / iced vergleichen

---

## 14.10.2026 – P0 fachlich abgeschlossen

### Titelblock / Dokumentvorlagen

- [x] `docs/TITLE_BLOCK_TEMPLATE_MODEL.md`
- [x] FrameTemplate und TitleBlockTemplate als versionierte Vorlagen
- [x] sichere deklarative Datenbindungen wie `{project.name}` und `{sheet.page_label}`
- [x] Formatfilter, bedingte Sichtbarkeit und Revisionstabellen
- [x] keine eingebetteten Scripts sowie kein Dateisystem-/Netzwerkzugriff aus Templates
- [x] CompanyProfile, LogoSlots, Template-Snapshots und Templateprüfung
- [x] Screen- und PDF-Ausgabe auf dasselbe Template-Modell ausgerichtet

### SPS / I/O

- [x] `docs/PLC_IO_MODEL.md`
- [x] PLCSystem, Station, Module und Channel herstellerneutral modelliert
- [x] SPS-Adresse von BMK und stabiler Objekt-ID getrennt
- [x] PLCAddressProfile für herstellerabhängige Format-/Parserregeln
- [x] automatische/manuelle Adressierung mit Preview/Undo vorbereitet
- [x] PLCChannels in denselben elektrischen ConnectionPoint-/Netzgraph integriert
- [x] I/O-Navigator, Datenmanager, I/O-Liste und spätere Import-/Sync-Adapter spezifiziert

### Technische Grundentscheidungen

- [x] `docs/CORE_TECH_DECISIONS.md`
- [x] UUIDv7 für persistente neue Domänenobjekte
- [x] CAD-Geometrie als `i64` in µm
- [x] Paper Space, Model Space und Screen Space getrennt
- [x] TE als ganzzahlige milli-TE
- [x] GPU-/Screen-Floats nur als View-/Cache-Daten

### Rust-Zielarchitektur und Spike-Plan

- [x] `docs/TECHNICAL_ARCHITECTURE.md`
- [x] Domain Core von UI, Renderer, Persistenz, Validation und Katalog getrennt
- [x] Mutation ausschließlich über Commands/Transactions
- [x] read-only Queries/Projections für UI
- [x] `RenderScene` als späterer renderoptimierter Cache vorgesehen
- [x] Bildschirmrendering und PDF/SVG-Vektorexport als getrennte Backends
- [x] `docs/TECHNICAL_SPIKE_PLAN.md`
- [x] Spike-Reihenfolge S1–S8 und Abnahmekriterien definiert

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
- [x] Strukturvererbung, Overrides und manuelle/automatische Kennzeichen
- [x] Nummerierungssequenzen, Reservierungen und Renummerierungs-Preview

### Elektrische Topologie

- [x] `docs/ELECTRICAL_MODEL.md`
- [x] ConnectionPoint, Net, ElectricalConnection und ConnectionPath getrennt
- [x] JunctionNodes für echte T-Verbindungen
- [x] Linienkreuzung verbindet standardmäßig nicht
- [x] ContinuationNodes für Seitenfortsetzungen
- [x] schaltende Funktionen trennen statische Netze
- [x] Potentialtyp, Renderfarbe und physische Leiterfarbe getrennt

### Verteiler / Aufbau

- [x] `docs/CABINET_LAYOUT_MODEL.md`
- [x] Enclosure, MountingSurface, RailRow und CabinetPlacement
- [x] TE und reale mm getrennt
- [x] `unplaced / auto / manual / locked`
- [x] deterministische Auto-Layout-Pipeline
- [x] Reservefelder, Türflächen, Gruppen und Layout-Preview

### Klemmen / Kabel

- [x] `docs/TERMINAL_CABLE_MODEL.md`
- [x] TerminalStrip, Terminal, Levels und Bridges
- [x] Mehrstock-, PE-, Trenn- und Durchgangsklemmen
- [x] Cable, CableCore und CableShield
- [x] Reserveadern und Aderzuweisungen
- [x] Klemmenplan/Kabelliste/Verdrahtungsliste als Projektionen des gemeinsamen Graphen

### Artikel / Herstellerkatalog

- [x] `docs/ARTICLE_CATALOG_MODEL.md`
- [x] Manufacturer, Article, typisierte Properties und Provenance
- [x] Datenqualität und Lizenz-/Redistributionsmetadaten
- [x] Katalogschichten und Projekt-Snapshots
- [x] Zubehör-/Alternativartikelbeziehungen und BOM-Aggregation

### Projektprüfung

- [x] `docs/VALIDATION_MODEL.md`
- [x] ValidationRule, RuleProfile, Finding, Suppression und FixAction
- [x] harte Invarianten getrennt von normalen Findings
- [x] Inspector, Aufbau und `Nur mit Befunden` auf derselben Finding-Quelle

### Undo / Transaktionen / Persistenz

- [x] `docs/UNDO_TRANSACTION_MODEL.md`
- [x] Commands, Transactions, Preview- und Composite-Commands
- [x] Project State vs. Workspace State
- [x] Autosave/Recovery und Atomic Save
- [x] `docs/PROJECT_FORMAT.md`
- [x] ZIP-kompatibler JSON-Container als Arbeitshypothese
- [x] `format_version` und `schema_version` getrennt
- [x] Migrationen, Feature Flags, Integritätsprüfung und Projektlock

### Zentrale Architekturregeln

- Fachobjekte werden über stabile IDs verknüpft, nie über formatierte BMK-Texte.
- Symbole sind Darstellungen von Functions; sie sind weder Article noch Device.
- Stromlaufplan, Aufbau, Datenmanager und Dokumentation referenzieren dieselben Geräteinstanzen.
- Elektrische Topologie und gezeichnete Leitungsgeometrie sind getrennt.
- Auswertungen werden aus dem gemeinsamen Projektmodell generiert.
- Auto-Layout ist deterministisch und respektiert manuelle/gesperrte Positionen.
- Jede fachliche Mutation läuft über Commands/Transactions und ist grundsätzlich Undo-fähig.
- `.oecad` verwendet eine explizite DTO-/Persistenzschicht statt interner Rust-Structs als öffentliches Dateischema.
- `0 Projektbefunde` ist keine pauschale Aussage über normative oder elektrische Sicherheit.

---

## 14.10.2026 – Designiteration 2 / Referenzen

- [x] v0-Prototyp und ZIP vollständig geprüft
- [x] 32 Ansichten inventarisiert
- [x] v0 als aktuelle bevorzugte UI/UX-Richtung übernommen
- [x] `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation`
- [x] Ctrl+K Command Palette
- [x] dynamischer Inspector rechts
- [x] Dark UI + heller Zeichenbogen als bevorzugter Dark-Standard
- [x] Full-Dark-Canvas optional
- [x] private ELCAD-/WSCAD-Beispiele analysiert; Originale bleiben außerhalb des öffentlichen Repositories

---

## 13.10.2026 – Projektstart

- [x] Repository `TheNeoIII/OpenE-CAD`
- [x] Produktvision definiert
- [x] eigenständige Neuentwicklung statt Fork/Port
- [x] Rust als primäre Sprache
- [x] EPLAN/WSCAD/ELCAD/QElectroTech als Referenzen
- [x] Eaton als erster Hersteller-Referenzfall
- [x] erste UI-Mockups
- [x] offene Projekt-/Bibliotheksformate als Ziel

## Aktueller Status

**P0 ist abgeschlossen. P1 läuft.** Der bisherige Rust-Code unter `spikes/` ist absichtlich Evaluierungs-/Wegwerfcode und noch kein Produktivcode.
