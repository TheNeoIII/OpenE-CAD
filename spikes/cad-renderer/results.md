# S2 Ergebnisse – wgpu CAD Renderer

Stand: 15.10.2026

## Baseline

Die aktuelle Renderer-Evaluierung verwendet:

```text
wgpu 30.0.1
winit 0.30.13
glyphon 0.12.0
cosmic-text 0.19
```

Der CAD-Renderer bleibt unabhängig vom späteren Desktop-UI-Framework.

## CI-Ergebnis

Die Spike-Checks laufen unter Ubuntu und Windows erfolgreich. Ein früher CI-Lauf fand korrekt eine API-Abweichung in `wgpu 30`: `VertexState::buffers` erwartet optionale Layout-Einträge. Nach Anpassung auf optionale Layouts kompiliert der Renderer auf beiden Zielplattformen.

## Erster interaktiver Windows-Test

| Szene | Theme | Zoom | Segmente | FPS |
|---|---|---:|---:|---:|
| Referenz | Light | 51 % | 49 | 144 |
| Stress | DarkCanvas | 100 % | 10.049 | 144 |
| Stress | Light | 100 % | 10.049 | 144 |

Die identischen 144 FPS bestätigten, dass diese erste Messung durch VSync bzw. die Bildwiederholrate des Testsystems begrenzt war.

## Cached vs. Rebuild – reale Windows-Messung

Der zweite Preview-Build ergänzte p95-Framezeit, VSync-Umschaltung und einen direkten Vergleich zwischen gecachten GPU-Buffern und vollständigem Rebuild.

| Szene | Modus | VSync | Segmente | FPS | p95 |
|---|---|---|---:|---:|---:|
| Referenz | Cached | an | 215 | 144 | 7,10 ms |
| Stress | Cached | an | 10.215 | 144 | 7,07 ms |
| Stress | Cached | aus | 10.215 | **4.180** | **0,37 ms** |
| Stress | Rebuild | aus | 10.215 | **2.733** | **0,56 ms** |

Auswertung der synthetischen Stressszene:

- Cached erreicht gegenüber Rebuild rund **53 % mehr FPS**.
- Die p95-Framezeit sinkt von 0,56 ms auf 0,37 ms, also um rund **34 %**.
- Die absoluten FPS-Werte sind kein Produktionsbenchmark; sie messen einen kleinen synthetischen Renderer mit Poll-Loop und deaktiviertem VSync.
- Der relative Unterschied bestätigt die Architekturentscheidung, statische CAD-Geometrie in einer gecachten `RenderScene` bzw. persistenten GPU-Buffern zu halten.
- Kameraänderungen werden über ein GPU-Uniform übertragen und benötigen keinen Neuaufbau der statischen Weltgeometrie.

## Junction / Interaction Overlay

Im ersten Interaktionstest wurde eine Inkonsistenz gefunden:

- sichtbarer Junction-Kreis war in Welt-mm definiert und wuchs mit dem Zoom
- Hit-Radius war bereits in Bildschirm-Pixeln definiert
- bei starkem Zoom wurde dadurch der sichtbare Kreis größer als die anklickbare Zone

Die Korrektur trennt statische CAD-Geometrie und Interaction Overlay:

- Junction-Marker werden mit einer konstanten sichtbaren Pixelgröße erzeugt
- Hit-Radius bleibt ebenfalls pixelkonstant und etwas größer als der Marker
- Weltposition des Junctions bleibt unverändert
- statische Stromlaufplangeometrie muss bei Hover/Auswahl nicht neu aufgebaut werden

### Reale Gegenprüfung – 15.10.2026

Der korrigierte Build wurde bei extrem unterschiedlichen Zoomstufen geprüft:

- ca. **10 % Zoom**
- ca. **1.837 % Zoom**

Ergebnis:

- [x] Junction-Kreise bleiben visuell gleich groß
- [x] Hover funktioniert unabhängig vom Zoom
- [x] Auswahl funktioniert unabhängig vom Zoom
- [x] Hitbox und sichtbarer Marker skalieren nicht mehr auseinander

Damit ist die screen-space-basierte Interaction-Overlay-Strategie für Junctions bestätigt.

Die allgemeine Layer-Trennung ist in `docs/RENDER_LAYERS.md` dokumentiert.

## Technischer Text

Der separate glyphon-Textspike wurde unter Windows visuell geprüft:

- Light und Dark sind sauber lesbar
- technische Sonderzeichen funktionieren
- 9 px sind leicht lesbar
- 8 px sind noch erkennbar, aber für reguläre technische Beschriftungen bereits zu klein

Vorläufige Regel: **9 px ist die minimale reguläre Screen-Lesbarkeitsgröße; kleinere Welttexte werden später über LOD behandelt.**

## CAD + Text Integration

Der neue Binär-Target

```text
spikes/cad-renderer/src/bin/integrated_text.rs
```

kombiniert erstmals CAD-Weltgeometrie und glyphon im selben wgpu-Renderpfad.

Implementiert:

- [x] BMK und Anschlussbezeichnungen in Papier-/Weltkoordinaten
- [x] Potentialtexte mit semantischen Farben
- [x] Querverweistexte
- [x] Kamera-Transformation World → Screen für Textanker
- [x] Textgröße aus mm × Pixel/mm
- [x] Text zoomt und pant mit dem Stromlaufplan
- [x] erste LOD-Schwelle über minimale Screen-Pixelgröße
- [x] Interaction Overlay bleibt unabhängig davon pixelkonstant
- [x] Zoom-Presets 25 %, 100 %, 400 % für die nächste Sichtprüfung

## Bereits implementiert

- LineList-Pipeline mit WGSL
- Fill-Pipeline für Dokumentbogen
- synthetische technische A3-Testszene
- N blau, PE grün, Steuerzweig rot, Querverweise orange
- Light und Full-Dark Canvas
- dunkler Workspace mit hellem Dokumentbogen
- Zoom exakt auf Cursor
- Pan mit mittlerer Maustaste
- technisches Raster
- Junction-Hover/-Auswahl und Hit Testing
- pixelkonstante Interaction Handles
- Referenzszene
- Stressszene mit zusätzlichen 10.000 Segmenten
- FPS-/Segmentanzeige und p95-Framezeit
- VSync an/aus
- Cached-GPU-Buffer vs. Rebuild-Modus
- glyphon/cosmic-text als technischer Textpfad
- kombinierter CAD+Text-Spike

## Noch zu messen / prüfen

- kombinierter CAD+Text-Build auf realer Windows-Hardware
- Text bei 25/100/400 % und beim freien Pan/Zoom
- Text-Culling/LOD bei großen Projekten
- Textrotation 90/180/270°
- Kreise/Bögen als echte Symbol-Primitives
- Selection Rectangle, Snap Marker und Leitungs-/Platzierungsvorschau
- partielle RenderScene-Invalidation
- GPU/CPU-Auslastung bei realistischeren Projekten
- verschiedene DPI-Skalierungen
- Vulkan/DX12-Verhalten
