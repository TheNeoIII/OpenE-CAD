# S1 Ergebnisse – Core Types / Geometry

Stand: 14.10.2026

## CI-Ergebnis

GitHub Actions Run `38557028333`:

| Plattform | Ergebnis |
|---|---|
| Ubuntu | ✅ 6/6 Unit-Tests bestanden |
| Windows | ✅ 6/6 Unit-Tests bestanden |

Verwendeter Rust-Compiler im Ubuntu-Run:

```text
rustc 1.99.0 (2026-09-28)
```

## Bestätigt

- UUIDv7-Erzeugung funktioniert.
- 10.000 additive Rasteroperationen mit 2,5 mm bleiben in `i64`-µm exakt.
- Snap ist auch für negative Koordinaten deterministisch.
- Vier 90°-Rotationen führen exakt zum Ausgangspunkt zurück.
- Integer-Bounds/Hit-Test-Basis ist deterministisch.
- Serde/JSON-Roundtrip erhält die semantischen Werte exakt.

## Zwischenfazit

Die Grundentscheidung **UUIDv7 + `i64`-µm + milli-TE** zeigt im ersten Spike keine Blocker und bleibt bestehen.

## Noch zu prüfen

- Paper↔Screen-Transformationen und DPI
- Zoom auf Cursor
- rationale Maßstäbe
- freie Rotation als Render-/Geometrieoperation
- Property-/Fuzz-Tests
- Benchmarks großer Punktmengen
