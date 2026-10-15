# S2 – RenderScene Partial Invalidation

Ziel dieses Spikes ist, vollständige GPU-Szenen-Rebuilds auf tatsächlich betroffene Layer zu begrenzen.

## Layer

```text
DocumentSurface
Grid
StaticGeometry
DynamicWorld
TechnicalText
InteractionOverlay
```

## Beispiele

| Änderung | invalidierte Layer |
|---|---|
| Pan / Zoom | keine Welt-Layer; nur Kamerauniform |
| Selection / Hover | InteractionOverlay |
| Grid an/aus | Grid |
| Textinhalt ändern | TechnicalText |
| Symbol verschieben | StaticGeometry + abhängiger Text + Interaction |
| Theme ändern | alle visuellen Layer |

## Motivation

Die reale Windows-Messung des S2-Renderers zeigte bereits einen deutlichen Vorteil persistenter GPU-Buffers gegenüber vollständigem Rebuild. Dieser Spike bildet die nächste Stufe: nicht nur „cached vs. rebuild“, sondern gezielte Cache-Invalidation.

## Generationen

Jeder Render-Layer besitzt einen Generation-Counter. Ein Renderer kann dadurch prüfen, ob sein GPU-Cache noch dem aktuellen Layer-Zustand entspricht, ohne globale Szenen-Hashes neu zu bilden.

## Noch offen

- Integration in den interaktiven wgpu-Spike
- Dirty-Regionen innerhalb eines Layers
- Batch-/Chunk-Strategie für sehr große Seiten
- Textatlas-Invalidation getrennt von Textplatzierungsdaten
- GPU-Buffer-Reuse und Kapazitätswachstum ohne Neuallokation bei jeder kleinen Änderung
