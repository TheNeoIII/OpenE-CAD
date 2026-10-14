# Technischer Spike-Plan

Stand: 14.10.2026  
Status: **Planung für P1 – noch kein Produktivcode**

Ziel der Spikes ist nicht, bereits OpenE-CAD „zu bauen“. Sie sollen technische Risiken isoliert messen und danach Framework-/Architekturentscheidungen ermöglichen.

---

# 1. Grundregeln

Jeder Spike:

- besitzt eine klar begrenzte Fragestellung
- verwendet Wegwerf-/Testcode
- darf keine fachliche Architektur umgehen
- erhält messbare Ergebnisse
- dokumentiert Entscheidung und Gründe
- wird nicht ungeprüft zum Produktivcode erklärt

---

# 2. Spike-Reihenfolge

```text
S1 Core Types / Geometry
S2 CAD Renderer
S3 UI Shell Vergleich
S4 UI + Renderer Integration
S5 Dense Tables / Inspector
S6 Persistence Roundtrip
S7 Cross-platform / DPI
S8 Gesamtentscheidung
```

---

# 3. S1 – Core Types / Geometry

## Ziel

Validieren:

- UUIDv7
- `i64`-µm-Koordinaten
- milli-TE
- typisierte Paper/Model Spaces
- Transformationen
- Snap
- Bounds
- Hit-Test-Basis

## Testfälle

- A4/A3/A0-Seitenkoordinaten
- 2,5-mm-Raster über tausende Operationen
- wiederholtes Verschieben und Undo ohne Drift
- 0/90/180/270° Rotation
- freie grafische Rotation
- Model→Paper→Screen→Paper Roundtrip

## Erfolg

- keine messbare persistente Koordinatendrift
- JSON Roundtrip identisch
- klare Rust-Newtypes ohne ergonomische Sackgasse

---

# 4. S2 – CAD Renderer

## Kandidat

```text
wgpu
```

## Ziel

Standalone-Fenster mit technischem Planrendering, noch ohne volles UI-Framework.

Renderobjekte:

- Linien
- Polylines
- Rechtecke
- Kreise/Bögen
- Junction-Punkte
- Symbole aus Vektorprimitiven
- technische Texte
- Raster
- Auswahlrahmen
- farbige Potentiale

---

# 5. Renderer-Testszene

Mindestens drei Szenen:

### klein

```text
1 Seite
100 Symbole
500 Leitungssegmente
```

### realistisch groß

```text
1 Seite
1.000 Symbol-/Textobjekte
10.000 Leitungs-/Grafiksegmente
```

### Stress

```text
mehrere zehntausend sichtbare Primitive
```

Nicht alle Domainobjekte müssen echte Elektrogeräte sein; für Performance darf synthetisch generiert werden.

---

# 6. Renderer-Interaktionen

Implementieren/testen:

- Zoom auf Cursor
- Pan
- Raster
- Auswahl-Hover
- Auswahlrahmen
- Hit Testing
- Leitungsvorschau
- Light document
- Dark Canvas

---

# 7. Renderer-Ziele

Auf einer fest dokumentierten Referenzhardware messen:

- Frame Time beim Pan/Zoom
- GPU/CPU-Zeit
- Scene rebuild
- Speicherbedarf
- Textperformance

Zielwert als Richtgröße:

```text
60 FPS / p95 ~16,7 ms bei typischer großer Seite
```

Wenn Referenzhardware dies nicht erreicht, Ursache dokumentieren; keine künstliche Abnahme nur anhand einer einzelnen Zahl.

---

# 8. Caching

Vergleichen:

```text
A. komplette Scene jeden Frame erzeugen
B. gecachte RenderScene
C. partielle Invalidation
```

Erwartung: B/C wird für größere Projekte notwendig.

---

# 9. Text

Besonders kritisch.

Testtexte:

```text
-K1
-X1:17
DILM17...
230 V AC
=ANL+UV2-K1
ÄÖÜ ß
lange Funktionstexte
```

Zoomstufen:

```text
25 %
50 %
100 %
200 %
400 %
```

Prüfen:

- Lesbarkeit
- Subpixel/Antialiasing
- DPI
- Alignment
- Rotation
- Cache

---

# 10. S3 – UI Shell Vergleich

Drei Kandidaten bauen denselben kleinen Shell-Prototyp:

```text
Slint
egui
iced
```

Nicht drei vollständige Apps.

---

# 11. Gemeinsame UI-Testansicht

Nachbau eines Ausschnitts der v0-Hauptansicht:

- 36 px App Bar
- Tabs Projekt/Stromlaufplan/Aufbau/Daten/Dokumentation
- Ctrl+K-Suchfeld
- 38 px Toolbar
- linker Navigator
- zentraler Canvas-Platzhalter
- rechter Inspector mit Sektionen
- untere Statusbar
- Theme Switch

Damit werden Kandidaten direkt vergleichbar.

---

# 12. UI-Testzustände

Mindestens:

- Light
- Dark UI + heller Canvas
- Full Dark
- Navigator 200/240/420 px
- Inspector 280/300/440 px
- Fenster 1280×720
- 1920×1080
- 2560×1440
- 150 % DPI
- 200 % DPI

---

# 13. S3 Bewertungskriterien

Gewichtungsvorschlag:

| Bereich | Gewicht |
|---|---:|
| Custom CAD/wgpu Integration | 25 % |
| Dense Desktop UX / Styling | 20 % |
| Panels / Docking / Multi-Window | 15 % |
| Performance / Responsiveness | 15 % |
| Accessibility / DPI / Input | 10 % |
| Lizenz / Distribution | 10 % |
| Reife / Wartbarkeit | 5 % |

Gewichtung kann vor Auswertung angepasst werden, danach nicht rückwirkend zur Wunschentscheidung.

---

# 14. Slint-Spike

Zu prüfen:

- v0-Design mit declarative UI reproduzierbar
- Theme Tokens
- dynamischer Inspector
- große verschachtelte Navigatoren
- Context Toolbar
- Command Palette Overlay
- Einbettung eigener wgpu-CAD-Fläche
- Resize/Focus/Input zwischen UI und Canvas
- Accessibility
- Multi-Window
- Panel-Docking bzw. notwendiger Eigenbau
- Lizenzweg mit geplanter OpenE-CAD-Lizenz

Aktuelle Slint-Dokumentation stellt u. a. raw-window-handle-Integration und verschiedene Renderbackends bereit; die konkrete Custom-CAD-Integration muss praktisch getestet werden.

---

# 15. egui-Spike

Zu prüfen:

- Design Tokens und hochwertige kompakte Optik
- Panels und resizable Sidebars
- Tabellen
- Tree Navigation
- Command Palette
- Keyboard Focus
- Accessibility
- Multi-Viewport
- Custom-wgpu-PaintCallback

`egui-wgpu` bietet aktuell explizite PaintCallbacks für eigenes wgpu-Rendering; dies macht die CAD-Integration besonders interessant.

---

# 16. iced-Spike

Zu prüfen:

- Design Tokens
- PaneGrid als Basis für anpassbare Panels
- Tree Navigation
- Tabellen
- Command Palette
- Keyboard Focus
- Canvas/custom shader vs. eigener Renderer
- Multi-Window
- Accessibility/DPI

Aktuelle iced-Dokumentation bietet PaneGrid mit Split/Resize/Drag sowie Canvas und wgpu-bezogene Shadermöglichkeiten.

---

# 17. S4 – UI + Renderer Integration

Der **gleiche** wgpu-CAD-Renderer wird in die zwei besten UI-Kandidaten integriert.

Test:

- Canvas Resize
- Zoom/Pan
- Mouse Capture
- Tooltips über Canvas
- Context Menu
- Keyboard Shortcuts
- Drag aus Einfügezentrum in Canvas
- Selection → Inspector Update
- Theme Wechsel

Damit wird verhindert, dass ein Framework nur im statischen Shell-Mockup gut aussieht.

---

# 18. Input Ownership

Besonders testen:

```text
Canvas zoom via wheel
Scroll in Inspector via wheel
Ctrl+wheel optional zoom
Space+drag pan
Text field focus
Esc tool cancel
Ctrl+K palette
```

Keine Shortcut-Konflikte zwischen Framework und CAD-Canvas.

---

# 19. S5 – Dense Tables

Datenmanager ist kritischer als ein normales Settings-Formular.

Testdaten:

```text
10.000 Betriebsmittel
20 Spalten
Findings
Sortierung
Filter
Mehrfachauswahl
Inline Editing
```

Prüfen:

- Virtualisierung
- Scrollperformance
- Tastaturnavigation
- Copy/Paste
- Spaltenbreite/-reihenfolge
- Zeilenhöhe compact/normal
- Auswahl von 1.000 Zeilen

---

# 20. S5 – Tree/Navigator

Test:

- 1.000 Seiten/Objekte
- tief verschachtelte Struktur
- Filter während Eingabe
- Badges/Findings
- Expand/Collapse
- Keyboard Navigation

---

# 21. S6 – Persistence Roundtrip

Minimaler Domain-Datensatz:

- 20 Sheets
- 1.000 Devices
- Functions/ConnectionPoints
- 10.000 Connections
- CabinetPlacements

Test:

```text
Domain
→ Persistence DTO
→ .oecad temp container
→ load
→ Domain
```

Vergleichen:

- semantische Gleichheit
- deterministische zweite Speicherung
- Dateigröße
- Load/Save-Zeit
- beschädigte Referenzdiagnose

---

# 22. Migration Spike

Fixture:

```text
schema 0.1
→ schema 0.2
```

Testen:

- Migration
- Validation
- Backup
- fehlgeschlagene Migration
- zu neue required feature

Noch keine reale historische Version nötig; künstliche Schemaänderung reicht.

---

# 23. S7 – Plattformen

Primär:

```text
Windows 11
Linux Wayland
Linux X11 falls praktisch
```

Später macOS, sofern Build-Infrastruktur verfügbar.

Test:

- Rendering
- Input
- DPI
- Clipboard
- Fonts
- Dateidialog
- Fenstergrößen
- Multi-Monitor

---

# 24. DPI-Matrix

Mindestens:

```text
100 %
125 %
150 %
200 %
```

Prüfen:

- 1 px Linien
- Icons
- Raster
- Text
- Hit Targets
- Panelmaße
- Screenshotvergleich

---

# 25. S8 – Entscheidungsmatrix

Nach Abschluss erhält jeder Kandidat:

```text
Score
bekannte Blocker
Workarounds
Lizenzfolgen
Wartungsrisiko
Renderer-Integration
UX-Abweichungen zum v0-Ziel
```

Erst danach Frameworkentscheidung.

---

# 26. Stop-Kriterien UI-Framework

Framework scheidet aus, wenn mindestens einer der Punkte ohne unverhältnismäßigen Eigenbau nicht lösbar ist:

- eigener performanter CAD-Canvas nicht sauber integrierbar
- große Tabellen praktisch unbrauchbar
- Keyboard-Fokus/Shortcuts unzuverlässig
- High-DPI deutlich fehlerhaft
- Lizenz nicht mit gewählter Projektstrategie vereinbar
- kritische Plattform wird nicht unterstützt

---

# 27. Renderer unabhängig halten

Auch wenn ein UI-Kandidat eigene Canvas-Primitives anbietet, wird der wgpu-Renderer separat getestet.

Grund:

OpenE-CAD soll bei 10 Jahren Entwicklungszeit nicht vollständig an die Zeichen-API eines GUI-Frameworks gekoppelt sein.

---

# 28. PDF nicht im Renderer-Spike erzwingen

Erster wgpu-Spike konzentriert sich auf Bildschirm.

Danach separater Vector Export Spike:

- SVG
- PDF
- Fonts
- Seitenrahmen
- Farben/monochrom

Keine Screenshot-PDF-Lösung akzeptieren.

---

# 29. Testprojekt

Für alle Spikes wird ein synthetisches Referenzprojekt definiert:

```text
Förderanlage / UV2
```

enthält:

- 3-phasige Einspeisung
- N/PE
- Schütz mit mehreren Functions
- Motor
- Klemmenleiste
- Kabel
- Seitenfortsetzungen
- Verteiler mit mehreren Reihen
- mindestens ein Finding

Keine privaten Referenzprojektdaten übernehmen.

---

# 30. Benchmark-Reproduzierbarkeit

Jeder Benchmark dokumentiert:

- OS
- CPU
- GPU
- RAM
- Auflösung/DPI
- Release/Debug Build
- Frameworkversion
- wgpu-Version
- Testdatensatz

Sonst sind Zahlen nicht vergleichbar.

---

# 31. Ergebnisartefakte

Pro Spike im Repository:

```text
spikes/<name>/
  README.md
  source
  results.md
```

Sobald tatsächlich Code begonnen wird.

Die Architekturdocs bleiben unter `docs/`.

---

# 32. Kein Backend vor Frameworkentscheidung

Der Spike darf Core-Typen und Testdaten enthalten, aber noch keine große Produktfunktion implementieren.

Ziel ist Risiken zu eliminieren, bevor tausende Zeilen UI-/Persistenzcode entstehen.

---

# 33. Aktuelle Quellen / Rahmenbedingungen

Zum Zeitpunkt der Planung:

- Slint: GPLv3 plus alternative Slint-Lizenzmodelle; Rust/desktop/wgpu-nahe Backends vorhanden
- egui: MIT OR Apache-2.0; `egui-wgpu` besitzt Custom-wgpu-PaintCallbacks
- iced: MIT; `PaneGrid` unterstützt Split/Resize/Drag, Canvas unterstützt interaktive 2D-Grafik
- wgpu: MIT OR Apache-2.0

Vor tatsächlichem Spike werden Versionen erneut fixiert und in `Cargo.lock` dokumentiert.

---

# 34. Entscheidungsausgabe

Am Ende von P1 soll ein kurzes ADR entstehen:

```text
Chosen UI framework
Chosen renderer architecture
Chosen text path
Chosen persistence libraries
Reasons
Rejected alternatives
Known risks
```

Erst danach beginnt der eigentliche OpenE-CAD-Prototyp.
