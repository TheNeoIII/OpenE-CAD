# S2 Ergebnisse – wgpu CAD Renderer

Stand: 14.10.2026

## Baseline A

Die erste Renderer-Baseline verwendet:

```text
wgpu 30.0.1
winit 0.30.13
```

Sie baut Render-Geometrie und Vertexbuffer absichtlich pro Frame neu auf. Diese einfache Baseline dient später als Vergleich für gecachte `RenderScene` und partielle Invalidation.

## CI-Ergebnis

GitHub Actions Run `38557028333` nach Anpassung an die wgpu-30-API:

| Plattform | `cargo check` |
|---|---|
| Ubuntu | ✅ bestanden |
| Windows | ✅ bestanden |

Der erste CI-Lauf fand korrekt eine API-Abweichung in `wgpu 30`: `VertexState::buffers` erwartet optionale Layout-Einträge. Nach Anpassung von

```text
&[Vertex::layout()]
```

auf

```text
&[Some(Vertex::layout())]
```

kompiliert die Baseline auf beiden Zielplattformen.

## Windows-Preview

Ein echter Windows-Release-Build wurde ebenfalls erfolgreich durch GitHub Actions erzeugt.

```text
Workflow: Renderer preview
Run:      38557324566
Artifact: OpenE-CAD-S2-renderer-windows
ID:       11890870510
Größe:    3.253.465 Byte (ZIP-Artefakt)
SHA-256:  e64e2a2c52b2a6f10e3db6ecd96bc7aa31987f0e79beab78efba1d4566442a7f
Ablauf:   28.10.2026
```

Das Artefakt enthält `opene-cad-cad-renderer-spike.exe` und ist ausdrücklich nur ein technischer Preview-/Messbuild.

## Bereits implementiert

- LineList-Pipeline mit WGSL
- synthetische technische A3-Testszene
- N blau, PE grün, Steuerzweig rot, Querverweise orange
- Light und Full-Dark Canvas
- Mausrad-Zoom
- Pan mit mittlerer Maustaste
- Referenzszene
- Stressszene mit zusätzlichen 10.000 Segmenten
- FPS-/Segmentanzeige

## Noch nicht als Ergebnis gewertet

CI bestätigt Kompilierbarkeit und Release-Build. Ein GitHub-Runner ist aber kein geeigneter Ersatz für einen interaktiven GPU-/DPI-Test.

Noch auf realer Desktop-Hardware zu messen:

- tatsächliches Rendering
- Frame Time / p95
- Pan/Zoom-Latenz
- GPU/CPU-Auslastung
- verschiedene DPI-Skalierungen
- Vulkan/DX12-Verhalten

## Nächste Renderer-Schritte

1. Zoom exakt auf Cursor
2. Raster und Dokument-/Workspace-Trennung
3. Junctions und Auswahlzustände
4. Hit Testing
5. technische Textdarstellung; `glyphon`/`cosmic-text` ist dafür ein aktueller Kandidat
6. gecachte RenderScene vs. Rebuild-Baseline
