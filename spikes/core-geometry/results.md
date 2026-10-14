# S1 Ergebnisse – Core Types / Geometry

Stand: 14.10.2026

## CI-Ergebnis

Aktueller GitHub-Actions-Run `38557772697`:

| Plattform | Ergebnis |
|---|---|
| Ubuntu | ✅ 9/9 Unit-Tests bestanden |
| Windows | ✅ S1-Testschritt bestanden |

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
- rationale Maßstäbe wie 1:10 sind ohne Float-Persistenz darstellbar.
- Paper→Screen→Paper-Roundtrip bleibt im Test innerhalb von 1 µm.
- Zoom auf einen Screen-Anker kann so berechnet werden, dass die darunterliegende Paper-Koordinate stabil bleibt.

## Zwischenfazit

Die Grundentscheidung **UUIDv7 + `i64`-µm + milli-TE** zeigt weiterhin keine Blocker.

Für persistente Geometrie bleiben ganzzahlige Werte die Quelle der Wahrheit. Fließkommawerte werden nur für den ephemeren View-/GPU-Pfad verwendet.

## Noch zu prüfen

- DPI-/Monitorwechsel in echter Desktop-UI
- freie Rotation als Render-/Geometrieoperation
- Property-/Fuzz-Tests
- Benchmarks großer Punktmengen
- spätere Integration derselben Typen in Renderer/UI
