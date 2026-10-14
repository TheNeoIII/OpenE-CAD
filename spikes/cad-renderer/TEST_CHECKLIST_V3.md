# S2 Preview v3 – Testcheckliste

Stand: 14.10.2026

Der v3-Preview enthält zwei getrennte EXE-Dateien:

```text
opene-cad-cad-renderer-spike.exe
opene-cad-text-renderer-spike.exe
```

Beide sind technische, unsignierte Testbuilds.

## A – CAD Renderer

### Junction-Marker

Die Junction-Kreise wurden aus der statischen CAD-Geometrie in einen eigenen Interaktions-Layer verschoben.

Erwartung:

- sichtbare Marker behalten beim Zoomen ungefähr dieselbe Bildschirmgröße
- Hover-Bereich bleibt ebenfalls pixelkonstant
- Hit-Bereich ist etwas größer als der sichtbare Marker
- starkes Hineinzoomen darf die anklickbare Zone nicht mehr kleiner als den sichtbaren Kreis erscheinen lassen
- Auswahl bleibt beim weiteren Zoomen sichtbar

### Bedienung

| Eingabe | Funktion |
|---|---|
| Mausrad | Zoom auf Cursor |
| mittlere Maustaste + Ziehen | Pan |
| Linksklick | Junction auswählen |
| `1` | Light |
| `2` | Dark Canvas |
| `3` | Referenzszene |
| `4` | Stressszene |
| `G` | Raster |
| `C` | Cached / Rebuild |
| `V` | VSync an / aus |
| `R` | Ansicht zurücksetzen |
| `Esc` | schließen |

Für den Junction-Test bitte insbesondere etwa 25 %, 100 %, 400 % und – wenn sinnvoll – noch stärker hineinzoomen.

## B – Technical Text Renderer

Der zweite Preview prüft `glyphon 0.12` / `cosmic-text 0.19` separat vom CAD-Renderer.

Angezeigt werden typische ECAD-Inhalte in unterschiedlichen Größen:

- `-K1`, `-F10`, `-X1:12`
- `A1`, `A2`, `13`, `14`
- `L1`, `L2`, `L3`, `N`, `PE`
- `%Q0.3`
- `/4.1`
- `230 V AC`, `24 V DC`, `18 A`, `7,5 kW`
- Umlaute, `ß`, `µ`, `Ω`, `Δ`
- Sans-Serif und Monospace

Bedienung:

| Taste | Funktion |
|---|---|
| `1` | Light |
| `2` | Dark |
| `R` | neu zeichnen |
| `Esc` | schließen |

Bitte besonders beurteilen:

- Lesbarkeit der 8–10-px-Zeilen
- ruhige Darstellung dünner Zeichen wie `1`, `I`, `L`, `-`, `/`
- Lesbarkeit von `A1/A2`, Klemmen- und BMK-Texten
- Sonderzeichen und Umlaute
- Unterschiede zwischen Light und Dark
- Darstellung bei Windows-Skalierung 100/125/150/200 %, sofern verfügbar

Dieser Text-Spike entscheidet zunächst nur, ob die technische Textpipeline als Kandidat geeignet ist. Die spätere CAD-Integration verwendet Papier-/Weltkoordinaten statt der festen Bildschirmpositionen dieses Tests.
