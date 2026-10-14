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

## Erster interaktiver Windows-Test

Der Preview-Build wurde auf einem realen Windows-Desktop gestartet und visuell geprüft.

Beobachtete Werte aus den Test-Screenshots:

| Szene | Theme | Zoom | Segmente | angezeigte FPS |
|---|---|---:|---:|---:|
| Referenz | Light | 51 % | 49 | 144 |
| Stress | DarkCanvas | 100 % | 10.049 | 144 |
| Stress | Light | 100 % | 10.049 | 144 |

Ergebnis:

- tatsächliches wgpu-Rendering unter Windows funktioniert
- Light- und DarkCanvas-Modus funktionieren
- die Stressszene mit 10.049 Segmenten wird ohne sichtbare Geometriefehler dargestellt
- in allen gezeigten Zuständen wurden 144 FPS erreicht
- Pan/Zoom und Szenen-/Theme-Umschaltung waren funktionsfähig genug, um die Testzustände interaktiv zu erreichen

Die identischen 144 FPS in Referenz- und Stressszene sprechen stark dafür, dass die Messung aktuell durch VSync bzw. die Bildwiederholrate des Systems begrenzt ist. Daraus darf noch **nicht** geschlossen werden, dass die tatsächliche maximale Renderleistung ebenfalls 144 FPS beträgt. Positiv bestätigt ist aber, dass die derzeitige 10k-Segment-Szene innerhalb des verfügbaren Frame-Budgets bleibt.

Hardwaredetails, Frame-Time-p95 sowie CPU-/GPU-Auslastung wurden in diesem Test noch nicht erfasst.

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

## Noch zu messen

- Frame Time / p95
- Pan/Zoom-Latenz quantitativ
- GPU/CPU-Auslastung
- verschiedene DPI-Skalierungen
- Vulkan/DX12-Verhalten
- uncapped/offscreen Renderer-Durchsatz, damit VSync die Vergleichswerte nicht begrenzt

## Nächste Renderer-Schritte

1. Zoom exakt auf Cursor
2. Raster und Dokument-/Workspace-Trennung
3. Junctions und Auswahlzustände
4. Hit Testing
5. technische Textdarstellung; `glyphon`/`cosmic-text` ist dafür ein aktueller Kandidat
6. gecachte RenderScene vs. Rebuild-Baseline
