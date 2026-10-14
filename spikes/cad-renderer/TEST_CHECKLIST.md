# S2 Desktop-Testcheckliste

Stand: 14.10.2026

Diese Checkliste dient dem ersten realen Windows-GPU-Test des experimentellen wgpu-Renderers.

## Build

```text
Artifact: OpenE-CAD-S2-renderer-windows
Workflow Run: 38557324566
SHA-256 ZIP: e64e2a2c52b2a6f10e3db6ecd96bc7aa31987f0e79beab78efba1d4566442a7f
```

Enthalten:

```text
opene-cad-cad-renderer-spike.exe
```

Der Build ist nicht signiert und ausdrücklich kein Endnutzer-Release.

## Erwartete Darstellung

Nach dem Start sollte ein eigenständiges Fenster erscheinen mit einer synthetischen technischen A3-ähnlichen Szene:

- neutrale Hauptleiter
- N blau
- PE grün
- Steuerzweig rot
- orange Verweisakzente
- einige Abgänge und eine kleine Klemmenstruktur

Es werden keine privaten Projektdaten verwendet.

## Tasten / Maus

| Eingabe | Erwartung |
|---|---|
| Mausrad | Zoom |
| mittlere Maustaste + Ziehen | Pan |
| `1` | Light Canvas |
| `2` | Full-Dark Canvas |
| `3` | Referenzszene |
| `4` | Stressszene mit +10.000 Segmenten |
| `R` | Kamera zurücksetzen |
| `Esc` | Programm schließen |

## Test 1 – Start

Prüfen:

- Fenster öffnet ohne Absturz
- Inhalt wird sofort sichtbar
- keine schwarzen/fehlenden Flächen
- beim Resize bleibt Rendering erhalten

## Test 2 – Zoom/Pan

Prüfen:

- Zoom reagiert flüssig
- Pan reagiert ohne sichtbares Stottern
- keine flackernden Linien
- keine Geometrie verschwindet unerwartet

Hinweis: Zoom ist in diesem ersten Build noch **nicht** exakt auf den Mauszeiger verankert. Das ist bereits als nächster Entwicklungsschritt vorgesehen.

## Test 3 – Theme

Mit `1` und `2` wechseln.

Prüfen:

- alle technischen Linien bleiben lesbar
- Blau/Grün/Rot/Orange bleiben voneinander unterscheidbar
- Full Dark wirkt nicht überstrahlt

## Test 4 – Stressszene

`4` drücken.

Im Fenstertitel werden Segmentzahl und gemessene FPS angezeigt.

Bitte notieren:

```text
Normal-Szene FPS:
Stress-Szene FPS:
Fensterauflösung:
Windows-Skalierung (100/125/150/200 %):
GPU:
```

Danach mehrfach zoomen und verschieben.

## Test 5 – Resize / Maximieren

- Fenster mehrfach größer/kleiner ziehen
- maximieren
- wiederherstellen

Prüfen:

- kein Absturz
- kein dauerhaft schwarzes Fenster
- Szene passt sich weiter an

## Bekannte Grenzen dieses Builds

Noch nicht implementiert:

- technische Texte
- echte ECAD-Symbole
- Kreise/Bögen als eigene GPU-Primitives
- Hit Testing / Hover / Auswahl
- Rasterdarstellung
- Zoom exakt auf Cursor
- heller Papierbogen innerhalb einer dunklen Workspace-Fläche
- Junction-Punkte
- gecachte RenderScene

Die Ergebnisse dieses Tests entscheiden nicht über das endgültige UI-Framework. Sie validieren zunächst nur wgpu als unabhängigen CAD-Renderpfad.
