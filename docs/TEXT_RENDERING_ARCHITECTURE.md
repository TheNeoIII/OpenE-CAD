# Technische Textdarstellung

Stand: 15.10.2026  
Status: **P1 – technische Evaluierung**

Dieses Dokument beschreibt die aktuelle Zielarchitektur für technische Texte im OpenE-CAD-Canvas. Die fachliche Textplatzierung bleibt vom konkreten GPU-Textbackend getrennt.

## 1. Bestätigte Grundlagen

Der Windows-Test des separaten Textspikes mit `glyphon 0.12` / `cosmic-text 0.19` bestätigt:

- Light und Dark sind sauber lesbar.
- deutsche Sonderzeichen sowie `µ`, `Ω` und `Δ` funktionieren.
- 8 px sind technisch noch lesbar, aber nur mit erhöhter Aufmerksamkeit.
- **9 px gelten vorläufig als Mindestgröße für regulär sichtbare technische Bildschirmtexte.**
- 10 px und größer sind komfortabel lesbar.

Die Mindestgröße ist eine **Screen-Space-Regel**, keine gespeicherte Schriftgröße im Projekt.

Beispiel:

```text
Papierhöhe 2,5 mm
× aktuelle Pixel/mm
= resultierende Bildschirmhöhe
```

Liegt das Ergebnis unter der LOD-Schwelle, wird der Text nicht gerendert oder in einer späteren LOD-Stufe vereinfacht.

## 2. Text bleibt ein fachliches CAD-Objekt

Persistiert werden insbesondere:

- Textinhalt oder Datenbindung
- Position in Paper-/Model-Space
- nominelle Höhe in mm
- horizontale Ausrichtung
- vertikale Ausrichtung / Baseline
- Rotation
- semantische Textklasse
- Sichtbarkeits-/LOD-Regel
- Stilreferenz

Nicht persistiert werden:

- Pixelposition
- gerasterte Glyphen
- Bildschirm-Hitbox
- GPU-Atlas-Koordinaten

## 3. Frameworkneutrale Platzierung

Der Spike `spikes/text-layout` definiert die Platzierungslogik unabhängig vom Renderer.

Unterstützt werden:

### Horizontal

- Left
- Center
- Right

### Vertikal

- Top
- Middle
- Baseline
- Bottom

### Orthogonale Rotation

- 0°
- 90°
- 180°
- 270°

Damit können dieselben Platzierungsdaten später für Bildschirmdarstellung und PDF-/SVG-Export verwendet werden.

## 4. Textklassen und LOD

Nicht alle Texte besitzen dieselbe Wichtigkeit.

Vorgesehene Prioritäten:

| Klasse | Beispiel | typische LOD-Priorität |
|---|---|---|
| Primär | BMK `-K1`, `-F10` | hoch |
| Anschluss | `A1`, `A2`, `13`, `14` | mittel-hoch |
| Potential | `N`, `PE`, `+24V` | hoch |
| Querverweis | `/4.1` | hoch |
| Funktionsbeschreibung | `Schütz Motor Lüftung` | mittel |
| Artikel-/Zusatzdaten | `DILM17`, `18 A` | niedriger |
| Mikrodetails | interne Hilfsangaben | sehr niedrig |

Beim Herauszoomen werden niedrig priorisierte Texte zuerst ausgeblendet.

## 5. glyphon als aktueller 0°-Kandidat

`glyphon 0.12` passt technisch zur aktuellen `wgpu 30`-Linie und hat sich für unrotierte Texte im Spike bewährt.

Die aktuelle `TextArea`-API besitzt Position, Skalierung und Bounds, aber **keine allgemeine Rotationstransformation**. Textrotation ist in glyphon seit längerem als gewünschte Funktion diskutiert, aber nicht Bestandteil der im Spike verwendeten API.

Daraus folgt:

- `glyphon` bleibt ein guter Kandidat für 0°-Text und UI-nahe technische Texte.
- OpenE-CAD darf seine fachliche Textarchitektur nicht an `TextArea` koppeln.
- 90°/180°/270° benötigen einen separaten Renderpfad oder eine Erweiterung des Glyph-Renderers.

Referenzen:

- <https://github.com/grovesNL/glyphon>
- <https://github.com/grovesNL/glyphon/discussions/72>

## 6. Rotationspfade, die evaluiert werden

### A – eigener Glyph-Quad-Renderer auf cosmic-text/Swash

Ablauf:

1. `cosmic-text` übernimmt Shaping und Layout.
2. Glyphen werden über Swash gerastert und in einem eigenen Atlas gecacht.
3. OpenE-CAD erzeugt pro Glyph ein GPU-Quad.
4. Das Quad erhält dieselbe orthogonale Transformation wie das Textobjekt.

Vorteile:

- volle Kontrolle über 0/90/180/270°
- Anker und Rotation passen exakt zum CAD-Modell
- Atlas und GPU-Caching können auf CAD-Zoom optimiert werden
- keine Offscreen-Textur pro Beschriftung nötig

Nachteile:

- mehr eigener Renderer-Code
- Atlas-/Eviction-Logik muss gepflegt werden

### B – gecachte Offscreen-Textur pro Textlauf

Text wird unrotiert in eine Textur gerendert und die Textur anschließend als Quad gedreht.

Vorteile:

- vergleichsweise einfach

Nachteile:

- für sehr viele unterschiedliche technische Labels potenziell hoher Speicherbedarf
- Zoom-/DPI-Änderungen können neue Rasterstufen erfordern
- schlechtere Skalierbarkeit für große Projekte

Aktuelle Präferenz: **A evaluieren**, B nur als Referenz-/Fallbackpfad.

## 7. Render-Layer

Technischer Text gehört in einen eigenen Layer zwischen Weltgeometrie und Interaktions-Overlay:

```text
1 Dokumentfläche / Workspace
2 Raster
3 statische technische Geometrie
4 dynamische Weltgeometrie
5 technischer Text
6 Selection / Snap / Junction / Wire Preview
7 Tooltips / UI Overlay
```

Damit können Texte gecacht und unabhängig von pixelkonstanten Handles aktualisiert werden.

## 8. Screen-Space vs. World-Space

### World-/Paper-Space

- BMK
- Anschlussnummern
- Potentialnamen
- Querverweise
- Funktionstexte
- freie Plantexte

Diese Texte zoomen mit dem Plan.

### Screen-Space

- Tooltips
- Cursorinformationen
- Mess-/Snap-Hinweise
- transienter Toolstatus

Diese Texte bleiben pixelkonstant.

## 9. Tests vor Produktiventscheidung

Noch zu prüfen:

- 0°-Text direkt im vollständigen CAD-Renderer
- LOD bei 25 %, 50 %, 100 %, 200 %, 400 %
- Textankerpunkte Left/Center/Right
- Baseline-Verhalten
- 90°/180°/270° mit eigenem Glyph-Quad-Prototyp
- DPI 100/125/150/200 %
- große Anzahl unterschiedlicher Labels
- Atlas-Speicher und Cache-Eviction
- PDF-/SVG-Ausgabe mit denselben fachlichen Textmetriken
- finale mitlieferbare Open-Source-Schriftfamilie

## 10. Architekturregel

**Das Projektmodell kennt Text, Anker, Rotation und Papiermaße. Das GPU-Backend kennt Glyphen und Pixel.**

Keine GPU-spezifische Textrepräsentation darf Teil des `.oecad`-Formats werden.
