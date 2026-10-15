# S2 – Technical Text Layout

Dieser Spike trennt die fachliche CAD-Textplatzierung vom späteren GPU-Textbackend.

## Enthalten

- Left / Center / Right
- Top / Middle / Baseline / Bottom
- 0° / 90° / 180° / 270°
- papierbezogene Textmetriken in mm
- transformierte Bounds
- LOD-Sichtbarkeit anhand resultierender Bildschirm-Pixelhöhe

## Warum separat?

OpenE-CAD darf seine Projektdatei nicht an eine konkrete Textbibliothek koppeln.

Das fachliche Objekt beschreibt:

```text
Inhalt
Position
Höhe in mm
Anker
Baseline
Rotation
Textklasse
LOD-Regel
```

Der Renderer entscheidet anschließend, wie daraus Glyphen entstehen.

## Aktueller Rendererstatus

`glyphon 0.12` hat sich für unrotierte technische Texte visuell bewährt. Die verwendete `TextArea`-API besitzt jedoch keine allgemeine Rotationstransformation.

Daher wird orthogonale Rotation zunächst unabhängig modelliert und getestet. Für das endgültige GPU-Backend wird ein eigener, auf `cosmic-text`/Swash aufbauender Glyph-Quad-Pfad bevorzugt evaluiert.

Siehe auch `docs/TEXT_RENDERING_ARCHITECTURE.md`.
