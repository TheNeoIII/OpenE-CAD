# S2 Ergebnisse – wgpu CAD Renderer

Stand: 14.10.2026

## Baseline A

Die erste Renderer-Baseline verwendet:

```text
wgpu 30.0.1
winit 0.30.13
```

Sie baut Render-Geometrie und Vertexbuffer absichtlich pro Frame neu auf. Diese einfache Baseline dient als Vergleich für gecachte `RenderScene` und partielle Invalidation.

## CI-Ergebnis

Die Spike-Checks laufen unter Ubuntu und Windows erfolgreich. Der erste CI-Lauf fand korrekt eine API-Abweichung in `wgpu 30`: `VertexState::buffers` erwartet optionale Layout-Einträge. Nach Anpassung von

```text
&[Vertex::layout()]
```

auf

```text
&[Some(Vertex::layout())]
```

kompiliert die Baseline auf beiden Zielplattformen.

## Erster interaktiver Windows-Test

Der erste Preview-Build wurde auf einem realen Windows-Desktop gestartet und visuell geprüft.

| Szene | Theme | Zoom | Segmente | FPS |
|---|---|---:|---:|---:|
| Referenz | Light | 51 % | 49 | 144 |
| Stress | DarkCanvas | 100 % | 10.049 | 144 |
| Stress | Light | 100 % | 10.049 | 144 |

Die identischen 144 FPS bestätigten, dass die erste Messung durch VSync bzw. die Bildwiederholrate des Testsystems begrenzt war.

## Zweiter interaktiver Windows-Test – Cached vs. Rebuild

Der zweite Preview-Build ergänzt p95-Framezeit, VSync-Umschaltung und einen direkten Vergleich zwischen gecachten GPU-Buffern und vollständigem Rebuild.

Gemessene Werte aus den Screenshots:

| Szene | Modus | VSync | Segmente | FPS | p95 |
|---|---|---|---:|---:|---:|
| Referenz | Cached | an | 215 | 144 | 7,10 ms |
| Stress | Cached | an | 10.215 | 144 | 7,07 ms |
| Stress | Cached | aus | 10.215 | **4.180** | **0,37 ms** |
| Stress | Rebuild | aus | 10.215 | **2.733** | **0,56 ms** |

Auswertung der synthetischen Stressszene:

- Cached erreicht gegenüber Rebuild rund **53 % mehr FPS**.
- Die p95-Framezeit sinkt von 0,56 ms auf 0,37 ms, also um rund **34 %**.
- Die absoluten FPS-Werte sind kein Produktionsbenchmark; sie messen einen sehr kleinen synthetischen Renderer mit Poll-Loop und deaktiviertem VSync.
- Der relative Unterschied bestätigt aber die Architekturentscheidung, statische CAD-Geometrie in einer gecachten `RenderScene` bzw. persistenten GPU-Buffern zu halten.
- Kameraänderungen werden bereits über ein GPU-Uniform übertragen und erfordern daher keinen Neuaufbau der statischen Weltgeometrie.

## Interaktionsbefund – Junction-Hitbox

Hover und Auswahl der Junction-Punkte funktionieren grundsätzlich. Bei starkem Hineinzoomen wurde jedoch ein Inkonsistenzfehler gefunden:

- der sichtbare Junction-Kreis wird derzeit in Welt-/mm-Koordinaten gezeichnet und wächst beim Zoomen mit
- der Hit-Radius bleibt dagegen in Bildschirmpixeln konstant
- dadurch kann der sichtbare Kreis deutlich größer sein als seine anklickbare Zone

Geplante Korrektur:

- Junction-Marker werden als separate Interaktions-Overlay-Geometrie behandelt
- ihre sichtbare Größe bleibt in Bildschirm-Pixeln konstant
- der Hit-Bereich bleibt ebenfalls pixelkonstant und geringfügig größer als der sichtbare Marker
- statische Stromlaufplan-Geometrie bleibt davon unabhängig gecacht

Diese Trennung entspricht auch dem späteren CAD-Modell: technische Weltgeometrie und UI-/Selection-Handles sind unterschiedliche Render-Layer.

## Bereits implementiert

- LineList-Pipeline mit WGSL
- synthetische technische A3-Testszene
- N blau, PE grün, Steuerzweig rot, Querverweise orange
- Light und Full-Dark Canvas
- dunkler Workspace mit hellem Dokumentbogen
- Zoom exakt auf Cursor
- Pan mit mittlerer Maustaste
- technisches Raster
- Junction-Hover/-Auswahl und Hit Testing
- Referenzszene
- Stressszene mit zusätzlichen 10.000 Segmenten
- FPS-/Segmentanzeige und p95-Framezeit
- VSync an/aus
- Cached-GPU-Buffer vs. Rebuild-Modus

## Noch zu messen / prüfen

- Pan/Zoom-Latenz quantitativ
- GPU/CPU-Auslastung
- verschiedene DPI-Skalierungen
- Vulkan/DX12-Verhalten
- größere realistischere ECAD-Szenen
- partielle Invalidation statt vollständigem Szenen-Rebuild bei Modelländerungen

## Nächste Renderer-Schritte

1. Junction-Marker auf pixelkonstante Overlay-Darstellung umstellen
2. technische Textdarstellung mit `glyphon` / `cosmic-text` evaluieren
3. BMK, Anschlussbezeichnungen, Potentialnamen und Querverweise testen
4. Selection-/Hover-Layer weiter vom statischen Welt-Layer trennen
5. realistischere Symbolgeometrie und größere Szenen testen
