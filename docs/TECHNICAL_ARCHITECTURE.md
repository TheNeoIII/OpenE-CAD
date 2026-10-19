# Technische Zielarchitektur (Rust)

Stand: 19.10.2026
Status: **Self-hosted Web Application; Rust-Webserver noch nicht implementiert**

Verbindliche aktive Architektur: React + TypeScript + Vite (`v0-frontend/`, bestehender SVG-CAD-Renderer) → OpenEcadBackend → HTTP `/api` → Rust Web API → Engineering Core → MariaDB/MySQL + Storage außerhalb des öffentlichen Webroots. LiteSpeed liefert Vite-Assets und proxyt die API. Domain/APP_URL und interner Port sind konfigurierbar, noch nicht festgelegt. Server-Sessions, Argon2id-Passwörter, optional TOTP/Recovery und WebAuthn sind das Sicherheitsziel; keine öffentliche Registrierung.

Deployment: `/srv/repos.sh` (Git/Lock/Backups) + `deployment/sync-server-webroot.sh` (Build/Publish/Hooks). Siehe [WEB_API.md](WEB_API.md), [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md), [IMPORT_ARCHITECTURE.md](IMPORT_ARCHITECTURE.md) und [LiteSpeed](../deployment/litespeed/README.md).

Die folgenden Rust-Desktop-/GPU-Workspace- und UI-Evaluierungen dokumentieren **historische Forschung**, keine aktive Produktroadmap. Tauri/Slint/egui/iced und SQLite sind deferred bzw. mögliche spätere Offline-Optionen. UUIDv7, Fixed Point, milli-TE, Paper/Model/Screen Space, Snap, analytische Primitives, Layer, Hit Testing und Text-Erkenntnisse bleiben gültig. `.oecad` bleibt portables Austauschformat, unabhängig von der Server-DB.

Dieses Dokument übersetzt die fachliche Spezifikation in eine erste technische Zielstruktur für die Rust-Implementierung.

Ziel ist eine Architektur, bei der Domänenlogik, Persistenz, Validierung, Rendering und UI voneinander getrennt bleiben.

---

# 1. Leitprinzip

```text
UI / App Shell
      ↓ commands / queries
Application Layer
      ↓
Domain Model
      ↓
Validation / Projections

Persistence      Catalog
     ↕              ↕
Domain Mapper   Project Snapshots

Renderer
  ↑ read-only scene/model projection
UI Canvas
```

Der Domain Core kennt keine GUI-Widgets.

---

# 2. Abhängigkeitsrichtung

Erlaubt:

```text
UI → application/core
UI → renderer
persistence → domain DTO mapper
validation → domain read view
catalog → catalog domain
app → all composition roots
```

Nicht erlaubt:

```text
domain → UI
domain → wgpu
domain → SQLite widget state
renderer → mutate domain directly
```

---

# 3. Geplanter Workspace

Für den ersten Spike nicht unnötig viele Crates erzeugen, aber Zielgrenzen früh festlegen.

Empfohlene Startstruktur:

```text
crates/
├─ opene-cad-core
├─ opene-cad-validation
├─ opene-cad-format
├─ opene-cad-catalog
├─ opene-cad-renderer
├─ opene-cad-ui
└─ opene-cad-app
```

Später optional:

```text
opene-cad-cli
opene-cad-import
opene-cad-plugins
opene-cad-export
```

---

# 4. opene-cad-core

Enthält:

- Domain Objects
- IDs / Value Types
- Commands
- Transactions
- Queries
- Undo/Redo abstractions
- elektrische Graphlogik
- Cabinet Auto-Layout
- Referenzkennzeichenlogik

Keine Abhängigkeit auf:

- UI-Framework
- GPU
- Dateidialoge
- native Window APIs

---

# 5. Core-Unterbereiche

Logisch:

```text
domain/
commands/
transactions/
electrical/
reference_designation/
cabinet/
terminals/
cables/
queries/
```

Ob dies sofort Rust-Module oder später eigene Crates werden, entscheidet der Spike.

---

# 6. Value Types

Keine rohen Strings/Integer überall.

Beispiele:

```text
DeviceId(UUID)
FunctionId(UUID)
SheetId(UUID)
PaperCoord(i64)
ModelCoord(i64)
MilliTe(i32)
ReferenceDesignation
```

Damit können viele Fehler bereits durch das Typsystem verhindert werden.

---

# 7. Project State

Der aktuelle Project State ist die fachliche Wahrheit.

Mutation ausschließlich über Commands/Transactions.

UI erhält:

- read-only Queries
- View Models / Projections
- Command API

Keine beliebig mutierbare `&mut Project`-Referenz quer durch Widgets.

---

# 8. Query Layer

Häufige Abfragen werden nicht in jeder UI-Ansicht neu implementiert.

Beispiele:

```text
get_device_inspector(device_id)
get_sheet_navigator()
get_device_placements(device_id)
get_terminal_plan(strip_id)
get_cabinet_row_usage(row_id)
get_findings_for_object(object_ref)
```

Diese Query-Ergebnisse sind read-only Projektionen.

---

# 9. opene-cad-validation

Enthält:

- Rule Registry
- RuleProfile
- Validation Scheduler
- FindingSet
- Suppression-Matching

Input:

```text
read-only project view + changed object/dependency tags
```

Output:

```text
FindingSet
```

Keine direkte Mutation.

---

# 10. opene-cad-format

Enthält:

- `.oecad` Container
- Persistence DTOs
- JSON Schema Mapping
- Migrationen
- Atomic Save
- Load Diagnostics
- Library snapshots

Domain-Structs werden nicht direkt als öffentliches Dateiformat betrachtet.

---

# 11. opene-cad-catalog

Enthält:

- Manufacturer/Article Catalog
- Property definitions
- FunctionTemplateSets
- Search index
- Import staging
- local catalog persistence

Globale Katalogdatenbank ist unabhängig von geöffneten Projekten.

---

# 12. Katalog-Persistenz

Web-Produktion: MariaDB/MySQL, InnoDB, utf8mb4 und versionierte Migrationen. Zugriff ausschließlich über Rust, parameterisierte Queries/prepared statements; niemals Benutzerinput in SQL konkatenieren, dynamische Identifier nur über serverseitige Allowlists. Zusammenhängende Änderungen transaktional; Details in DATABASE_ARCHITECTURE.md.

SQLite bleibt eine historische Spike-/mögliche lokale Offline-Option. `.oecad` ist kein Datenbankdump und bleibt portables Domain-Austauschformat.

---

# 13. opene-cad-renderer

Eigenständiger CAD-/Dokumentrenderer.

Input:

```text
RenderScene
ViewTransform
Theme/AppearanceProfile
SelectionOverlay
```

Output:

- Bildschirmdarstellung
- später ggf. gemeinsame Geometriegrundlage für SVG/PDF

Der Renderer kennt keine Commands.

---

# 14. RenderScene

Die UI sollte nicht jeden Frame tausende Domain-Objekte direkt interpretieren.

Stattdessen:

```text
Project/Sheet Query
      ↓
Scene Builder
      ↓
RenderScene Cache
      ↓
GPU Renderer
```

Scene enthält renderoptimierte Primitive und IDs für Hit Testing.

---

# 15. Scene Invalidation

Transaction Events liefern betroffene IDs/Tags.

Dadurch kann Scene Builder nur notwendige Teile neu erzeugen.

Beispiel:

```text
FunctionText changed
→ text primitive refresh
→ Net geometry bleibt gecacht
```

MVP darf zunächst gröber invalidieren.

---

# 16. Renderer-Technologie

Historischer Spike-Favorit, **nicht** das aktive Web-Renderingziel (dieses bleibt SVG):

```text
wgpu
```

Gründe:

- plattformübergreifende GPU-Abstraktion
- Windows/Linux/macOS-taugliche Backends
- Rust-nativ
- MIT/Apache-2.0
- gute Trennung von UI und Rendering möglich

Die endgültige Entscheidung folgt aus dem Spike.

---

# 17. UI-Shell vs. CAD-Renderer

OpenE-CAD soll nicht davon abhängen, dass das gewählte UI-Framework die komplette CAD-Szene als normale Widgets zeichnet.

Bevorzugt:

```text
UI framework
  ├─ Menüs
  ├─ Panels
  ├─ Tabellen
  ├─ Inspector
  └─ Canvas host
         ↓
     custom CAD renderer
```

---

# 18. UI-Kandidaten

Für den Spike:

```text
Slint
egui
iced
```

Keine Vorentscheidung allein aufgrund des bisherigen Designs.

---

# 19. Slint – zu prüfen

Stärken/Hypothesen:

- deklarative, designorientierte UI
- native Rust-Anbindung
- verschiedene Renderer/Backends
- Accessibility-Unterstützung
- gute Eignung für pixelgenaues v0-Design möglich

Kritische Spike-Fragen:

- Custom-wgpu-CAD-Fläche sauber integrierbar?
- komplexe dockbare Desktop-Panels?
- große Tabellen/Virtualisierung?
- Multi-Window/Multi-Monitor?
- Lizenzmodell im finalen Projektsetup?

---

# 20. egui – zu prüfen

Stärken/Hypothesen:

- sehr direkte Rust-Integration
- Immediate Mode passt gut zu Engineering-Tools
- `egui-wgpu` unterstützt Custom-wgpu-PaintCallbacks
- permissive MIT/Apache-2.0-Lizenz
- schnelle Prototypisierung

Kritische Fragen:

- gewünschte hochwertige v0-Optik ohne zu viel Custom-Code?
- sehr große Tabellen?
- Docking/Workspace-Komfort?
- Text- und Accessibility-Qualität?

---

# 21. iced – zu prüfen

Stärken/Hypothesen:

- Rust-nativ, MIT
- `PaneGrid` unterstützt Split/Resize/Drag von Bereichen
- Canvas für interaktive 2D-Grafik vorhanden
- wgpu-orientierte Custom-Shader-Optionen
- reaktives Architekturmodell

Kritische Fragen:

- Integration unseres eigenen wgpu-Renderers vs. iced Canvas
- Desktop-Docking über PaneGrid hinaus
- große Engineering-Tabellen
- Styling exakt entsprechend Design Tokens

---

# 22. opene-cad-ui

Enthält später:

- App Shell
- Navigation
- Inspector
- Navigatoren
- Datenmanager
- Dialoge/Overlays
- Command Palette
- Workspace State
- Accessibility bindings

Domainlogik bleibt außerhalb.

---

# 23. Workspace State

UI-spezifisch:

```text
active_workspace
active_sheet
selected_object_ids
navigator_tab
inspector_tab
panel_sizes
zoom/pan
theme
open_windows
back_navigation_stack
```

Nicht alles muss in `.oecad` landen.

---

# 24. Selection Model

Auswahl referenziert stabile Domain-/Placement-IDs.

```text
SelectionItem
  object_kind
  id
  view_context
```

Dadurch kann Auswahl zwischen Stromlaufplan, Aufbau und Tabelle synchronisiert werden.

---

# 25. Navigation Service

Zentrale Navigation statt Widget-spezifischer Sprünge.

Beispiele:

```text
show_device(device_id)
show_placement(placement_id)
show_cabinet_device(device_id)
show_terminal(strip_id, terminal_id)
go_back()
```

Unterstützt das v0-Prinzip Hover/Klick/Zurück.

---

# 26. Command Palette Service

Indexiert:

- Commands
- Sheets
- Devices
- Articles
- Terminals
- Cables
- Einstellungen

UI sendet nur Suchquery; Suchindex lebt als eigener Service/Projection.

---

# 27. Hintergrundarbeit

Geeignet für Worker/Task-System:

- Validation
- Catalog import/index
- PDF generation
- Thumbnail generation
- große Suchen
- Projektmigrationen mit Fortschritt

Domainmutationen selbst werden kontrolliert serialisiert committed.

---

# 28. Threading-Grundregel

Ein Projekt hat logisch einen geordneten Transaction Stream.

Hintergrundtasks dürfen Snapshots/read views lesen.

Beim Zurückmelden muss geprüft werden, ob Ergebnis noch zur aktuellen Project Revision passt.

---

# 29. Project Revision Counter

Zusätzlich zu fachlichen Revisionen kann der laufende Project State einen technischen Counter besitzen:

```text
state_revision: u64
```

Jede committed Transaction erhöht ihn.

Nützlich für:

- Validation result freshness
- scene cache
- search index
- background tasks

Nicht als persistente fachliche Revision interpretieren.

---

# 30. PDF/SVG Export

Export soll nicht Screenshot der GPU-Fläche sein.

Bevorzugt:

```text
Domain/Document Projection
        ↓
vector render model
       ↙ ↘
 screen   PDF/SVG
```

Damit bleiben Linien/Text auch im Export technisch sauber.

Screen Renderer und Vector Exporter können gemeinsame Scene-/Primitive-Konzepte nutzen, aber unterschiedliche Backends besitzen.

---

# 31. Text-Rendering

Technischer Spike muss prüfen:

- kleine technische Beschriftung
- Monospace BMK/Anschlüsse
- Unicode
- deutsche Sonderzeichen
- scharfe Darstellung bei High DPI
- Zoom
- PDF-Fontembedding/-substitution

Konkrete Textbibliothek noch offen.

---

# 32. Spatial Index

Hit Testing bei großen Seiten verwendet später einen räumlichen Index.

Input:

- primitive/object bounds in Paper Space

Output:

- Kandidaten in Klick-/Auswahlbereich

Index ist Cache und kann neu aufgebaut werden.

---

# 33. Testbarkeit

Core-Funktionen müssen headless testbar sein:

- Net rebuild
- BMK numbering
- Auto layout
- Klemmenplan projection
- validation
- migrations

Kein UI-Fenster für Unit Tests erforderlich.

---

# 34. Logging

Strukturiertes Logging vorsehen für:

- Commands/Transaction failures
- Load/Migration diagnostics
- Renderer/device info
- Validation performance
- Catalog import

Keine Kundendaten unnötig in Logs dumpen.

---

# 35. Fehlergrenzen

Panik im Renderer darf nach Möglichkeit nicht den Domain State beschädigen.

Projekt speichern/Recovery ist vom GPU-Zustand unabhängig.

---

# 36. Plugins später

Plugin-System nicht im MVP implementieren, aber Grenzen vorbereiten.

Plugins erhalten keine direkten mutablen Rust-Referenzen auf interne Structs.

Später mögliche APIs:

- importer/exporter
- validation rule
- catalog provider
- document report

---

# 37. API-Stabilität

Interne Rust-Module dürfen sich während früher Entwicklung ändern.

Öffentlich stabile Plugin/API-Versionen erst deklarieren, wenn Domainmodell ausreichend gereift ist.

---

# 38. Architekturregel

Wenn eine UI-Funktion nur implementiert werden kann, indem Engineering-Daten direkt in einem Widget-State gespeichert werden, ist die Grenze falsch.

Fachliche Daten gehören in den Core; UI-State speichert nur Interaktionszustand.

---

# 39. Quellenstand für Framework-Hypothesen

Aktuell geprüft:

- Slint aktuelle Rust-Dokumentation und Lizenzinformationen
- egui/egui-wgpu aktuelle Dokumentation, insbesondere Custom wgpu PaintCallback
- iced aktuelle Dokumentation, insbesondere PaneGrid und Canvas/Shader
- wgpu aktuelles Repository/Lizenz

Details und Abnahmekriterien stehen in `TECHNICAL_SPIKE_PLAN.md`.

---

# 40. Ergebnis

Die Zielarchitektur wird ab dem ersten Spike so behandelt:

```text
Domain first
Commands for mutation
Read projections for UI
Renderer independent
Persistence explicit
Validation independent
Catalog independent
UI framework replaceable as far as practical
```

Damit bleibt die fachliche Investition erhalten, selbst wenn der UI-Spike zu einem Frameworkwechsel führt.
