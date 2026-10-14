# S1 – Core Types / Geometry

Status: **gestartet**

Dieser Spike validiert die bereits beschlossenen technischen Basistypen, ohne Produktivarchitektur vorwegzunehmen.

## Enthalten

- UUIDv7 als `ObjectId`
- `i64`-Koordinaten in µm
- getrennte `PaperPoint`, `ModelPoint` und nichtpersistente `ScreenPoint`
- milli-TE für Teilungseinheiten
- deterministisches Raster/Snap
- orthogonale Rotation ohne Float-Drift
- freie Rotation als Integer-Mikrograd
- Bounds/Hit-Test-Basis
- Serde/JSON-Roundtrip

## Tests

```bash
cd spikes
cargo test -p opene-cad-core-geometry-spike
```

Die Tests prüfen unter anderem 10.000 Rasteroperationen mit 2,5 mm Schrittweite, negative Koordinaten, vier 90°-Rotationen und JSON-Roundtrip.

## Noch offen in S1

- typisierte Transformationsmatrizen Paper ↔ Screen
- Zoom-/DPI-Roundtrip
- rationale Maßstäbe
- freie Rotation von Vektoren/Bounds
- Property-/Fuzz-Tests
- Benchmarks für große Punktmengen

Der Code ist Spike-/Evaluierungscode und darf nicht ungeprüft in den späteren Produktiv-Core übernommen werden.
