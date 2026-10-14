# OpenE-CAD technische Spikes

Dieser Ordner enthält ausschließlich experimentellen P1-Code zur technischen Evaluierung.

Er ist **nicht** der spätere Produktiv-Workspace.

## Regeln

- Spike-Code darf verworfen werden.
- Fachliche Architektur aus `docs/` darf nicht umgangen werden.
- Ergebnisse werden gemessen und dokumentiert.
- Erst nach S8 wird entschieden, welche Teile neu/sauber in den Produktivcode übernommen werden.
- Alle neuen Spike-Crates verwenden bereits die beschlossene Projektlizenz `MPL-2.0`.

## Aktuelle Spikes

### S1 – `core-geometry`

Validiert UUIDv7, Fixed-Point-Geometrie in µm, milli-TE, Snap, Bounds, Paper↔Screen-Transformationen und Roundtrip.

### S2 – `cad-renderer`

Isolierter `wgpu`-CAD-Renderer mit technischer Testszene, Pan/Zoom, Light/Dark, Raster, Junction-Hit-Testing, Interaktions-Overlay, Stressmodus sowie Cached-vs-Rebuild-Benchmark.

### S2 – `text-renderer`

Separater technischer Textspike mit `glyphon 0.12` / `cosmic-text 0.19` auf derselben `wgpu 30`-Linie. Prüft kleine ECAD-Schriftgrößen, BMK/Anschlussbezeichnungen, Sonderzeichen, Sans/Monospace und Light/Dark.

## Ausführen

```bash
cd spikes
cargo test -p opene-cad-core-geometry-spike
cargo run -p opene-cad-cad-renderer-spike --release
cargo run -p opene-cad-text-renderer-spike --release
```

## Architekturhinweis

Technische Weltgeometrie, Welttext und bildschirmbezogene Interaktions-Overlays werden getrennt behandelt. Details stehen in `docs/RENDER_LAYERS.md`.

Die UI-Framework-Spikes (Slint / egui / iced) folgen nach belastbaren Ergebnissen aus S1/S2.
