# Windows-Praxistest – 15.10.2026

Dieser Stand fasst reale Sicht- und Interaktionstests des S2-Spikes auf Windows zusammen.

## Bereits bestätigt

- analytische Kreis-/Bogen-/Ellipse-/Bézier-Darstellung bleibt auch bei starkem Zoom visuell sauber
- Snap-/Cursor-Marker bleibt screen-space-basiert und damit pixelkonstant
- Auswahlrahmen und Handles bleiben bei Zoom sichtbar
- Leitungswerkzeug verwendet den 5-mm-Fang korrekt; der zweite Klick übernimmt den angezeigten Fangpunkt
- Dark-Canvas und Light-Canvas funktionieren
- world-space Text bleibt beim Pan/Zoom an der Geometrie gebunden
- Textdarstellung ist bei 100 % und 400 % sauber

## Befund 1 – Auswahlrechteck commitete nicht den sichtbaren Fangpunkt

### Reproduktion

1. Fang einschalten.
2. Linke Maustaste drücken und halten.
3. Rechteck aufziehen.
4. Der Snap-Marker zeigt einen Rasterpunkt.
5. Maustaste zwischen Rasterlinien loslassen.

### Fehler

Die Vorschau zeigte den gefangenen Punkt, `selection_end` wurde während des Drags jedoch aus dem rohen World-Cursor geschrieben. Dadurch endete das Rechteck beim Loslassen außerhalb des Rasters.

### Verbindliche Regel

**Preview-Koordinate und Commit-Koordinate müssen aus exakt derselben Snap-Pipeline stammen.**

Dies gilt später nicht nur für Auswahlrechtecke, sondern auch für:

- Platzieren und Verschieben von Symbolen
- Resize-Handles
- Leitungen
- Klemmen-/Anschlusspunkte
- Aufbaugeräte
- Montage-/Reihenobjekte

Das neue frameworkneutrale Modell `spikes/editor-interaction` bildet diese Regel ab und testet explizit, dass Drag-Vorschau und Mouse-Up dieselbe gerasterte Koordinate verwenden.

## Befund 2 – Handles waren nur visuell

Die vier Auswahlhandles waren im ersten Preview noch reine Overlay-Geometrie.

### Neue Interaktionsregel

- Handles besitzen pixelkonstante Hit-Radien.
- Klick/Drag auf einen Handle aktiviert Resize.
- Der gegenüberliegende Eckpunkt bleibt während des Resize fest.
- Der aktive Eckpunkt verwendet dieselbe Snap-Pipeline wie das normale Platzieren.
- Ein Handle darf über die gegenüberliegende Kante gezogen werden; das Rechteck normalisiert anschließend Min/Max.

Das Verhalten ist im neuen `spikes/editor-interaction`-Modell durch Unit-Tests festgelegt.

## Befund 3 – Text-LOD blendete viel zu früh aus

Im integrierten Renderer verschwanden erste Beschriftungen bereits bei ca. 94 % Zoom; bei ca. 75 % war praktisch kein technischer Text mehr sichtbar.

Das ist für einen ECAD-Arbeitsplatz ungeeignet.

### Neue verbindliche LOD-Regel

**Ab 20 % Zoom aufwärts bleiben technische Texte grundsätzlich eingeblendet.**

Erst unterhalb von 20 % darf nach Priorität reduziert werden:

1. `Essential`: BMK, Klemmen-/Anschlusskennung, Potentialname, Querverweis – zuletzt ausblenden.
2. `Normal`: Funktions-/Gerätenamen.
3. `Detail`: Artikel- und ergänzende Beschreibungstexte – zuerst ausblenden.

Die 9-px-Regel bleibt eine Lesbarkeitsreferenz, ist aber **keine harte Ausblendschwelle oberhalb 20 % Zoom**.

Das neue Modell `spikes/text-lod` enthält dafür automatisierte Tests, einschließlich 25 %, 75 % und 94 %.

## Konsequenz für die Architektur

Fang, Auswahl/Resize und Text-LOD werden nicht dauerhaft direkt im Renderer implementiert. Sie werden als frameworkneutrale Editorlogik geführt. Der Renderer visualisiert lediglich den berechneten Zustand.

Damit können später derselbe Snap-/Interaction-/LOD-Core sowohl im wgpu-Canvas als auch unabhängig vom gewählten UI-Framework verwendet und getestet werden.
