# S2 – Analytische CAD-Primitives

Dieser Spike prüft Kreise, Bögen, Ellipsen und Bézier-Kurven als analytische CAD-Objekte mit abgeleiteter Tessellation für den GPU-Renderer.

## Architekturregel

Das Projektmodell speichert **keine Polylinien als Ersatz für Kreise/Bögen**.

Persistiert werden beispielsweise:

```text
Circle(center, radius)
Arc(center, radius, start_angle, sweep)
Ellipse(center, rx, ry, rotation)
CubicBezier(p0, p1, p2, p3)
```

Erst Renderer oder Export erzeugen daraus eine passende Approximation.

Vorteile:

- exakte Bearbeitung
- saubere Fangpunkte
- unabhängig von aktuellem Zoom
- PDF/SVG kann später echte Vektorprimitives verwenden
- GPU-Tessellation darf an Zoom/Qualität angepasst werden

## Implementierter Spike

- Circle
- Arc mit positivem und negativem Sweep
- rotierte Ellipse
- adaptive Cubic-Bézier-Unterteilung
- chord-error-basierte Kreis-/Bogen-Tessellation
- Konvertierung zu Line-Segmenten

## Standard-Toleranz im Spike

```text
chord_error = 0,02 mm
```

Dies ist noch kein endgültiger Produktwert. Später kann der Screen-Renderer die Toleranz abhängig von Zoom und DPI wählen, während PDF/SVG eigene Qualitätsregeln erhält.

## Tests

Geprüft werden unter anderem:

- geschlossener Kreis
- exakte Arc-Endpunkte
- negativer Sweep
- mehr Segmente bei engerer Toleranz
- rotierte Ellipsenextents
- Bézier-Endpunkte und adaptive Unterteilung
- degenerierter Arc

## Visueller Test

`primitives_overlay.exe` im CAD-Renderer verwendet diese Primitives in einer synthetischen A3-Szene zusammen mit:

- Snap-Marker
- Auswahlrahmen
- Selection-Handles
- orthogonaler Leitungsvorschau
- 5-mm-Snap

Diese UI-Hilfen bleiben von der statischen Weltgeometrie getrennt.
