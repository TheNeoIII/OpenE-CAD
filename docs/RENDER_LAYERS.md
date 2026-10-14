# CAD Render Layers

Stand: 14.10.2026

Dieses Dokument konkretisiert die Trennung zwischen technischer CAD-Geometrie und interaktiver Bildschirmdarstellung.

## Grundsatz

Nicht alles, was im Editor sichtbar ist, gehört in dieselbe Koordinaten- und Cache-Schicht.

OpenE-CAD unterscheidet mindestens:

1. **Workspace Layer**
2. **Document/Page Layer**
3. **Static Technical Geometry Layer**
4. **World Text Layer**
5. **Dynamic Tool Preview Layer**
6. **Interaction Overlay Layer**
7. **UI Layer**

Diese Trennung ist unabhängig vom späteren Desktop-UI-Framework.

---

## 1. Workspace Layer

Bildschirmorientierte Arbeitsfläche außerhalb des eigentlichen Dokuments.

Beispiele:

- dunkler Hintergrund um den Zeichenbogen
- Dokument-Schatten bzw. Abgrenzung
- Multi-Page-Arbeitsbereich später optional

Nicht Bestandteil von PDF/SVG-Exporten.

---

## 2. Document/Page Layer

Physische Dokumentfläche in Papierkoordinaten.

Beispiele:

- A4/A3/A2/A1/A0-Bogen
- Rahmen
- Titelblock
- Zonenraster
- dokumentbezogene Hintergrundelemente

Dieser Layer besitzt reale Papiermaße und muss zwischen Bildschirm und Vektorexport reproduzierbar sein.

---

## 3. Static Technical Geometry Layer

Primäre technische Weltgeometrie.

Beispiele:

- Leitungen
- Symbole
- Klemmen
- Gerätekonturen
- Potentiallinien
- Aufbaukonturen
- feste grafische Elemente

Eigenschaften:

- aus dem Projektmodell bzw. einer `RenderScene` abgeleitet
- in Welt-/Papierkoordinaten
- möglichst persistent in GPU-Buffern gecacht
- Kameraänderungen dürfen keinen vollständigen Geometrie-Rebuild erzwingen
- partielle Invalidation bei Modelländerungen vorgesehen

---

## 4. World Text Layer

Technische Beschriftungen gehören fachlich zum Dokument, benötigen aber eine spezialisierte Textpipeline.

Beispiele:

- BMK
- Anschlussbezeichnungen
- Potentialnamen
- Funktionsbeschreibungen
- Klemmenbezeichnungen
- Querverweise
- Titelblocktexte

Eigenschaften:

- Position in Welt-/Papierkoordinaten
- physische bzw. dokumentbezogene Schriftgröße
- skalieren mit dem Dokumentzoom
- Rotationen 0/90/180/270° müssen unterstützt werden
- für Screen und PDF/SVG muss dieselbe fachliche Platzierung gelten
- Glyph-Rasterung darf rendererabhängig sein, die Layoutmetrik nicht

`glyphon` / `cosmic-text` wird derzeit als Bildschirmkandidat evaluiert.

---

## 5. Dynamic Tool Preview Layer

Temporäre Weltgeometrie während einer Aktion.

Beispiele:

- Leitungsvorschau während des Zeichnens
- Ghost-Symbol beim Platzieren
- Verschiebevorschau
- Auswahlrechteck im Modellbereich
- Auto-Layout-Vorschau

Dieser Layer soll häufig aktualisierbar sein, ohne die statische `RenderScene` neu aufzubauen.

---

## 6. Interaction Overlay Layer

Bildschirmorientierte Interaktionselemente werden **nicht** wie technische Geometrie behandelt.

Beispiele:

- Junction-Hover-Ringe
- Auswahlgriffe
- Resize-/Rotate-Handles
- Snap-Indikatoren
- Fangpunkt-Markierungen
- Cursor-nahe Tool-Hinweise
- Auswahlhalo

Eigenschaften:

- Größe primär in Bildschirm-Pixeln
- unabhängig vom Zoom gut anklickbar
- Hit-Bereich mindestens so groß wie sichtbarer Marker, meist etwas größer
- darf sich beim Zoomen nicht proportional zur Weltgeometrie aufblasen
- nicht Bestandteil des PDF-/SVG-Exports
- eigener dynamischer Buffer/Pass bzw. Instancing vorgesehen

### Aus dem S2-Test abgeleitete Regel

Der erste Junction-Prototyp zeichnete den sichtbaren Kreis in mm, verwendete aber einen pixelbasierten Hit-Radius. Bei starkem Zoom wurde deshalb der Kreis größer als seine anklickbare Zone.

Daraus wird die feste Architekturregel:

> Interaktionsmarker mit bildschirmbezogener Bedeutung erhalten sowohl Darstellung als auch Hit-Test in konsistentem Screen Space.

Der aktuelle Spike setzt Junction-Ringe bereits als getrennte, pixelkonstante Overlay-Geometrie um.

---

## 7. UI Layer

Klassische Anwendungselemente außerhalb des CAD-Renderers:

- Navigator
- Inspector
- Toolbars
- Command Palette
- Dialoge
- Tabellen
- Statusleiste

Dieser Layer wird später vom ausgewählten Desktop-UI-Framework umgesetzt.

---

# Z-Order – Stromlaufplaneditor

Empfohlene Reihenfolge von hinten nach vorne:

```text
Workspace
  ↓
Document/Page
  ↓
Grid
  ↓
Static technical geometry
  ↓
World text
  ↓
Dynamic tool preview
  ↓
Selection/highlight overlay
  ↓
Interaction handles / snap markers
  ↓
Desktop UI
```

Das Raster kann je nach Darstellungsprofil vor oder hinter bestimmten Dokumentelementen liegen, darf aber fachliche Geometrie nicht überdecken.

---

# Cache-Strategie

## Statisch / langfristig cachebar

- Papierfläche
- Rahmen
- unveränderte Symbole
- unveränderte Leitungsgeometrie
- Aufbaukonturen

## Teilweise invalidierbar

- geändertes Gerät
- verlegte Leitung
- geändertes Potential
- geänderte Textplatzierung

## Pro Frame / interaktiv

- Kamera-Uniform
- Hover
- Selection Handles
- Snap Marker
- aktive Tool-Vorschau

Der Windows-S2-Test mit 10.215 Segmenten zeigte bereits einen deutlichen Vorteil des gecachten Pfads gegenüber vollständigem Buffer-Rebuild. Die endgültige Produktionsimplementierung soll deshalb von Anfang an Layer- und Dirty-Region-/Dirty-Object-Invalidation ermöglichen.

---

# Export

PDF/SVG übernehmen nur fachlich dokumentrelevante Layer:

```text
Document/Page
Static technical geometry
World text
optionale dokumentrelevante Markierungen
```

Nicht exportiert werden:

```text
Workspace
Hover
Selection
Handles
Snap Marker
Tool Preview
Desktop UI
```

Damit bleibt Bildschirmkomfort vollständig vom technischen Dokument getrennt.
