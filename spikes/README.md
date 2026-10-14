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

Validiert UUIDv7, Fixed-Point-Geometrie in µm, milli-TE, Snap, Bounds und Roundtrip.

### S2 – `cad-renderer`

Isolierter `wgpu`-Renderer mit technischer LineList-Testszene, Pan/Zoom, Themeumschaltung und Stressmodus.

## Ausführen

```bash
cd spikes
cargo test --workspace
cargo run -p opene-cad-cad-renderer-spike --release
```

Die UI-Framework-Spikes (Slint / egui / iced) folgen erst nach belastbaren Ergebnissen aus S1 und S2.
