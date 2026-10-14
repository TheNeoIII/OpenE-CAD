# S2 Integrated CAD + Text – Windows-Test

Stand: 15.10.2026

Zu testen ist `integrated_text.exe` aus dem Windows-Preview-Artefakt.

## Ziel

Der Test prüft erstmals gleichzeitig:

- gecachte CAD-Weltgeometrie
- Pan/Zoom
- Light/Full-Dark Canvas
- pixelkonstante Junction-Handles
- glyphon/cosmic-text
- technische Texte in Papier-/Weltkoordinaten
- erste textbasierte LOD-Schwellen

## Bedienung

| Taste | Funktion |
|---|---|
| `1` | Light |
| `2` | DarkCanvas |
| `3` | Referenzszene |
| `4` | Stressszene (+10.000 Segmente) |
| `5` | Zoom 25 % |
| `6` | Zoom 100 % |
| `7` | Zoom 400 % |
| `G` | Raster an/aus |
| `V` | VSync an/aus |
| `R` | Kamera zurücksetzen |
| Mausrad | Zoom auf Cursor |
| mittlere Maustaste + Ziehen | Pan |
| Linksklick auf Junction | auswählen |
| `Esc` | Ende |

## Sichtprüfung

### 25 %

- Text soll mit dem Plan verkleinert werden.
- Kleine Detailtexte dürfen durch die erste LOD-Grenze verschwinden.
- Der Plan darf dadurch nicht mit unleserlichen Textpixeln zugemüllt werden.
- Junction-Handles bleiben trotzdem gleich groß und anklickbar.

### 100 %

Prüfen:

- `L1`, `L2`, `L3`, `N`, `PE`
- `-Q1`
- `-F10 B16`
- `-K1`
- `A1`, `A2`, `13`, `14`
- `230 V AC`
- `-X1:12`
- `/2.8`, `/4.1`
- `Schütz Motor Lüftung`
- `Eaton DILM17 · 18 A · 7,5 kW`

Erwartung: zentrale Beschriftungen sollen gut lesbar und eindeutig ihrer Weltposition zugeordnet sein.

### 400 %

- Texte müssen scharf hochskalieren, nicht bitmapartig verpixeln.
- Textanker müssen beim Zoomen an derselben Stelle der CAD-Geometrie bleiben.
- Beim Pan dürfen Text und Geometrie nicht gegeneinander driften.
- Junction-Handles bleiben weiterhin screen-space-basiert und damit konstant groß.

## Freier Zoom / Pan

Besonders wichtig:

1. Mauszeiger auf `-K1` bzw. nahe dessen Geometrie positionieren.
2. stark hinein- und herauszoomen.
3. anschließend mehrfach pannen.

Es darf kein sichtbarer Versatz zwischen Text und Weltgeometrie entstehen.

## Themes

Den Test in Light und DarkCanvas durchführen.

- Neutraltexte müssen in beiden Themes ausreichend Kontrast haben.
- N bleibt blau.
- PE bleibt grün.
- Querverweise bleiben orange.
- Steuer-/Hinweistexte bleiben rot.

## Performance

Optional mit `4` + `V`:

- Stressszene einschalten
- VSync ausschalten
- FPS und p95 aus dem Fenstertitel notieren

Die integrierte Textdarstellung muss nicht die extremen FPS des reinen Line-Renderers erreichen. Entscheidend ist, dass Pan/Zoom interaktiv ohne sichtbare Ruckler bleiben und keine großen Frame-Time-Spikes auftreten.

## Aktuell noch nicht erwartet

- Textrotation 90/180/270°
- automatische Textkollisionserkennung
- perfekte BMK-Auto-Platzierung
- vollständige Symbolbibliothek
- PDF-Font-Embedding
