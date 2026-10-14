# S2 – wgpu CAD Renderer

Status: **gestartet – Baseline A**

Dieser Spike testet den CAD-Renderer unabhängig vom späteren UI-Framework.

## Aktueller Stand

Die erste Version enthält:

- `wgpu 30.0.1`
- `winit 0.30.13`
- LineList-Pipeline mit eigenem WGSL-Shader
- synthetische A3-ähnliche technische Testszene
- neutrale Hauptleiter
- N-Leiter blau
- PE grün
- Steuerzweig rot
- Querverweis-Akzente orange
- Zoom per Mausrad
- Pan per mittlerer Maustaste
- Light Canvas und Full Dark Canvas
- Referenz- und Stressszene
- laufende FPS-/Segmentanzeige im Fenstertitel

Die Szene verwendet absichtlich keine privaten Projektdaten.

## Bedienung

| Eingabe | Funktion |
|---|---|
| Mausrad | Zoom |
| Mittlere Maustaste + Ziehen | Pan |
| `1` | Light Canvas |
| `2` | Dark Canvas |
| `3` | Referenzszene |
| `4` | Stressszene mit +10.000 Segmenten |
| `R` | Kamera zurücksetzen |
| `Esc` | Beenden |

## Start

```bash
cd spikes
cargo run -p opene-cad-cad-renderer-spike --release
```

## Baseline A

Der Spike erzeugt die CPU-Vertexliste und den GPU-Vertexbuffer aktuell bei jedem Frame neu. Das ist absichtlich die einfachste Baseline entsprechend `TECHNICAL_SPIKE_PLAN.md`.

Spätere Messungen vergleichen:

```text
A. kompletter Rebuild pro Frame        ← aktuell
B. gecachte RenderScene
C. partielle Invalidation
```

## Noch nicht enthalten

- technische Texte / Glyph-Cache
- Kreise und Bögen
- echte Symbolgeometrie
- Auswahl-/Hover-Hit-Testing
- Zoom exakt auf Cursor
- Leitungsvorschau
- Junction-Punkte
- dicke bzw. DPI-stabile technische Linien
- Document-vs-Workspace-Hintergrund
- Dark UI + heller Dokumentbogen
- GPU-Timing / p95 Frame Time
- Scene-Rebuild-Messung

Diese Punkte werden schrittweise ergänzt. Der Spike bleibt Wegwerf-/Evaluierungscode und ist kein Produktivrenderer.
