# Fortschritt

Stand: 15.10.2026

## Aktueller Status

**P0 ist fachlich abgeschlossen. P1 – technische Evaluierung – läuft.**

Der bisherige Rust-Code unter `spikes/` ist bewusst experimenteller Evaluierungs-/Wegwerfcode. Produktivcode wird erst nach Abschluss der technischen Spikes sauber neu aufgebaut.

---

# P1 – Technische Evaluierung

## Lizenz

- [x] Mozilla Public License 2.0 (MPL-2.0) verbindlich beschlossen
- [x] vollständige `LICENSE` im Repository
- [x] SPDX-Identifier `MPL-2.0` für neue Rust-Quelldateien
- [x] Hersteller-/Katalogdaten lizenzrechtlich getrennt vom Programmcode

## S1 – Core Types / Geometry

- [x] Rust-Workspace unter `spikes/` angelegt
- [x] UUIDv7 als `ObjectId`
- [x] persistente Koordinaten als `i64`-µm
- [x] Paper-, Model- und Screen-Space getrennt
- [x] milli-TE
- [x] deterministisches Raster/Snap inklusive negativer Koordinaten
- [x] orthogonale Rotation und Integer-Bounds
- [x] JSON/Serde-Roundtrip
- [x] rationale Maßstäbe
- [x] Paper↔Screen-Roundtrip und Zoom-Anker
- [x] 9/9 Tests unter Ubuntu
- [x] 9/9 Tests unter Windows

Ergebnis: **UUIDv7 + `i64`-µm + milli-TE bleiben bestätigt.**

Details: `spikes/core-geometry/results.md`

## S2 – wgpu CAD Renderer

### Renderer-Basis

- [x] `wgpu 30.0.1` + `winit 0.30.13`
- [x] WGSL-LineList- und Fill-Pipeline
- [x] technische A3-Testszene ohne private Projektdaten
- [x] N blau, PE grün, Steuerzweig rot, Querverweise orange
- [x] Light-Dokument + Full-Dark-Canvas
- [x] dunkler Workspace getrennt vom Dokumentbogen
- [x] Pan mit mittlerer Maustaste
- [x] Zoom auf Mauszeiger
- [x] 10-mm-Raster / 50-mm-Hauptlinien
- [x] Referenz- und 10k-Stressszene
- [x] GPU-Kameratransformation per Uniform
- [x] VSync an/aus
- [x] FPS + p95-Framezeit

### Cached RenderScene – reale Windows-Messung

Gemessene Stressszene mit 10.215 Segmenten:

| Modus | VSync | FPS | p95 |
|---|---|---:|---:|
| Cached | an | 144 | 7,07 ms |
| Cached | aus | **4.180** | **0,37 ms** |
| Rebuild | aus | **2.733** | **0,56 ms** |

Auswertung:

- [x] Cached gegenüber Rebuild rund 53 % höhere FPS in diesem synthetischen Test
- [x] p95-Framezeit rund 34 % geringer
- [x] Architekturentscheidung für persistente/gecachte GPU-Geometrie bestätigt
- [x] absolute FPS nicht als Produktionsbenchmark interpretieren

Details: `spikes/cad-renderer/results.md`

### Junction / Interaction Overlay

Gefundener Fehler:

- sichtbarer Junction-Kreis war in Welt-mm definiert
- Hit-Radius war in Bildschirm-Pixeln definiert
- bei starkem Zoom wurde der sichtbare Kreis größer als die anklickbare Zone

Korrektur und reale Gegenprüfung:

- [x] Junction-Marker aus statischer CAD-Geometrie entfernt
- [x] eigener Interaction-Overlay-Layer
- [x] sichtbare Markergröße pixelkonstant
- [x] Hit-Radius pixelkonstant und etwas größer als der Marker
- [x] statische Weltgeometrie bleibt unabhängig davon gecacht
- [x] korrigierte Version unter Ubuntu und Windows geprüft
- [x] reale Sichtprüfung bei ca. 10 % Zoom
- [x] reale Sichtprüfung bei ca. 1.837 % Zoom
- [x] Marker bleiben in beiden Extremen gleich groß
- [x] Hover/Auswahl bleiben unabhängig vom Zoom nutzbar

Die allgemeine Layer-Architektur steht in `docs/RENDER_LAYERS.md`.

## S2 – Technischer Text

Verwendete Linie:

```text
glyphon 0.12.0
cosmic-text 0.19
wgpu 30.x
```

- [x] eigener `spikes/text-renderer`-Crate
- [x] BMK, Klemmen-/Anschlussbezeichnungen und Potentialtexte als Testdaten
- [x] Größen 8–22 px
- [x] Sans-Serif und Monospace
- [x] Umlaute, ß, µ, Ω, Δ
- [x] Light / Dark
- [x] farbige N-/PE-/Querverweis-/Steuertexte
- [x] `cargo check` unter Ubuntu erfolgreich
- [x] `cargo check` unter Windows erfolgreich
- [x] Windows-Release-Build automatisiert
- [x] reale Windows-Sichtprüfung in Light und Dark
- [x] 9 px als gut lesbare technische Mindestgröße bestätigt
- [x] 8 px noch erkennbar, aber nicht als reguläre Zielgröße geeignet

Vorläufige Darstellungsregel:

- **regulär sichtbare technische Texte sollen möglichst nicht unter 9 px Screen-Höhe fallen**
- kleinere Welttexte werden künftig über LOD ausgeblendet/vereinfacht
- UI-Text bleibt davon getrennt in screen-space

Details: `spikes/text-renderer/README.md`

### CAD + Text integriert

Neu:

- [x] `glyphon` als Abhängigkeit des CAD-Renderer-Spikes
- [x] kombinierter Target `spikes/cad-renderer/src/bin/integrated_text.rs`
- [x] BMK und Anschlussbezeichnungen besitzen Papier-/Weltpositionen
- [x] Potentialtexte besitzen semantische Farben
- [x] Querverweistexte eingebunden
- [x] Textanker werden über dieselbe Kamera World → Screen transformiert
- [x] Textgröße wird aus mm × Pixel/mm abgeleitet
- [x] erste LOD-Schwellen über minimale Screen-Pixelgröße
- [x] Junction-/Selection-Handles bleiben separat pixelkonstant
- [x] Zoom-Presets 25 %, 100 %, 400 % zum Gegenprüfen eingebaut

## CI / Preview

- [x] Cross-Platform GitHub Actions für Ubuntu + Windows
- [x] S1 Unit-Tests
- [x] CAD-Renderer `cargo check`
- [x] Text-Renderer `cargo check`
- [x] Windows Release-Preview
- [x] Preview enthält CAD-Renderer und Standalone-Textspike
- [x] Workflow um integrierten CAD+Text-Build erweitert

---

# Nächste P1-Schritte

1. integrierten CAD+Text-Build auf realer Windows-Hardware prüfen: 25/100/400 %, freies Pan/Zoom, Light/Dark
2. Textrotation 0/90/180/270° und Anchor-/Alignment-Modell prüfen
3. Kreise/Bögen und echte Symbol-Primitives ergänzen
4. Selection Rectangle, Snap Marker und Leitungs-/Platzierungsvorschau als getrennte Overlay-Layer ergänzen
5. Text-Culling/LOD und größere Textmengen testen
6. partielle `RenderScene`-Invalidation statt vollständigem Cache-Rebuild
7. danach S3: identische UI-Shell in Slint / egui / iced vergleichen
8. S4: denselben unabhängigen wgpu-CAD-Renderer in die zwei besten UI-Kandidaten integrieren

---

# P0 – Fachliche Spezifikation abgeschlossen

Folgende Bereiche sind bereits spezifiziert:

- [x] Designsystem und v0-Referenzrichtung
- [x] Projekt-/Seitentypen
- [x] Geräte, Funktionen, Symbole und Anschlüsse
- [x] elektrische Topologie, Netze, Potentiale und Junctions
- [x] IEC-81346-orientierte BMK-/Strukturkennzeichnung
- [x] Klemmen und Kabel
- [x] SPS / I/O
- [x] Hersteller-/Artikelkatalog
- [x] Verteilerfrontansicht und Auto-Layout
- [x] TE und reale mm getrennt
- [x] Projektprüfung
- [x] Undo / Commands / Transactions
- [x] `.oecad`-Projektformat
- [x] Titelblock-/Template-Modell
- [x] PDF-/Dokumentationsstruktur
- [x] Rust-Zielarchitektur
- [x] technische Spike-Reihenfolge S1–S8

Wichtige Dokumente:

- `docs/DATA_MODEL.md`
- `docs/ELECTRICAL_MODEL.md`
- `docs/SYMBOL_FUNCTION_MODEL.md`
- `docs/REFERENCE_DESIGNATION_MODEL.md`
- `docs/CABINET_LAYOUT_MODEL.md`
- `docs/TERMINAL_CABLE_MODEL.md`
- `docs/PLC_IO_MODEL.md`
- `docs/ARTICLE_CATALOG_MODEL.md`
- `docs/VALIDATION_MODEL.md`
- `docs/UNDO_TRANSACTION_MODEL.md`
- `docs/PROJECT_FORMAT.md`
- `docs/TITLE_BLOCK_TEMPLATE_MODEL.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/RENDER_LAYERS.md`

---

# Design / Referenzen

- [x] v0-Prototyp und ZIP geprüft
- [x] 32 v0-Ansichten inventarisiert
- [x] `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation` als bevorzugte Hauptstruktur
- [x] Ctrl+K Command Palette
- [x] dynamischer Inspector rechts
- [x] Dark UI + heller Zeichenbogen als bevorzugter Dark-Standard
- [x] Full-Dark-Canvas optional
- [x] private ELCAD-/WSCAD-Beispiele ausgewertet
- [x] Original-PDFs bleiben außerhalb des öffentlichen Repositorys

# Projektstart

- [x] Repository `TheNeoIII/OpenE-CAD`
- [x] Produktvision definiert
- [x] eigenständige Neuentwicklung statt Fork/Port
- [x] Rust als primäre Sprache
- [x] EPLAN/WSCAD/ELCAD/QElectroTech nur als Referenzen
- [x] Eaton als erster Hersteller-Referenzfall
- [x] offene Projekt-/Bibliotheksformate als Ziel
