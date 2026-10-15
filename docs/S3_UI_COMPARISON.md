# S3 – praktischer UI-Vergleich

Stand: 15.10.2026

Ziel: **egui, iced und Slint mit derselben v0-Zieloberfläche vergleichen**, nicht mit ihrem jeweiligen Standardlook.

## Gemeinsame Referenz

Für alle Kandidaten gilt dieselbe Struktur:

- Projekt
- Stromlaufplan
- Aufbau
- Daten
- Dokumentation
- Command Palette
- Navigator links
- CAD/Arbeitsfläche in der Mitte
- Inspector/Prüfung rechts
- Statusleiste unten

Darstellungsmodi:

1. Light UI + heller Plan
2. Dark UI + heller Plan (**bevorzugter Dark-Standard**)
3. Dark UI + Dark Canvas

## Aktueller Implementierungsstand

### egui / eframe 0.36.2

- [x] Desktop-Shell
- [x] fünf Hauptarbeitsbereiche
- [x] v0-orientierte Projektseite nach Nutzerfeedback überarbeitet
- [x] Navigator / Inspector / Statusbar
- [x] Command Palette
- [x] drei Darstellungsmodi
- [x] synthetische große Datenmengen für S3
- [x] Windows/Linux-Check
- [ ] abschließender visueller Vergleich nach v0-Nachstyling
- [ ] reale CAD-Renderer-Integration erst in S4

Erster Nutzerbefund:

- technisch brauchbarer Anfang
- ursprünglicher Standardlook noch zu weit von v0 entfernt
- Projektseite musste strukturell neu an v0 angenähert werden
- Dark UI + heller Plan war im ersten Build noch nicht vorhanden und ist nun Pflichtmodus

### iced 0.14

- [x] v0-orientierte Shell implementiert
- [x] fünf Hauptarbeitsbereiche
- [x] drei Darstellungsmodi
- [x] Canvas-Platzhalter für Stromlaufplan/Aufbau
- [x] Projektseite nach derselben v0-Struktur
- [x] Daten-/Dokumentationsansicht
- [x] Ubuntu `cargo check`
- [ ] Windows `cargo check`
- [ ] Windows Preview
- [ ] reale UX-Sichtprüfung

Technischer S3-Befund:

- reales iced-0.14-Cargo-Resolve verwendet derzeit `wgpu 27.0.1`
- OpenE-CAD-CAD-Renderer verwendet `wgpu 30`
- damit ist iced 0.14 für direkte Device-/Queue-Teilung aktuell im Nachteil

### Slint 1.18.1

- [x] dritte S3-Shell angelegt
- [x] v0-orientierte Projektseite
- [x] Stromlaufplan-Workbench
- [x] Aufbau/Daten/Dokumentation
- [x] drei Darstellungsmodi
- [x] Command-Palette-Overlay
- [x] `unstable-wgpu-30` im technischen Spike aktiviert
- [ ] Windows/Linux-Check
- [ ] Windows Preview
- [ ] reale UX-Sichtprüfung

## Vergleichspunkte für die Windows-Previews

Die drei Anwendungen sollen möglichst bei gleicher Fenstergröße nebeneinander bewertet werden.

### A. Visuelle v0-Nähe

- Informationsdichte
- Panel-/Toolbar-Höhen
- aktive Tabs
- Cyan-Akzent
- dunkle Hintergrundtöne
- Typografie
- Inspector-Dichte
- Projektseite
- heller Plan im Dark-UI-Modus

### B. Desktop-Bediengefühl

- Reaktionsgeschwindigkeit beim Wechseln der Arbeitsbereiche
- Scrollen
- Resize des Fensters
- Textschärfe bei Windows-DPI
- Klickflächen
- Fokusverhalten
- subjektiv „Engineering-Anwendung“ statt Demo-/Web-/Debug-Look

### C. Datenmengen

Zielwerte für den finalen S3-Test:

- mindestens 1.000 Navigatorobjekte
- 10.000 Datenzeilen bzw. äquivalenter Virtualisierungstest
- keine merklichen Hänger beim Scrollen
- keine vollständige Neuberechnung des CAD-Renderers durch reine UI-Interaktion

### D. Renderer-Perspektive

- gleiche WGPU-Major-Version
- Device-/Queue-Sharing
- Texture-/Custom-Render-Integration
- keine GPU→CPU-Kopie
- UI darf Pan/Zoom nicht ausbremsen

### E. Desktop-Funktionen

- Multi-Window
- späteres Docking/Undocking
- Kontextmenüs
- Drag & Drop
- Clipboard
- Tastatur-Navigation
- Accessibility
- DPI

## Entscheidungsregel

S3 wählt **nicht** sofort das Produktivframework.

Die zwei insgesamt stärksten Kandidaten gehen in **S4**. Dort wird der echte OpenE-CAD-WGPU-30-Renderer integriert. Die Renderer-Integration hat mit 20 % das höchste Einzelgewicht und kann die S3-Reihenfolge noch deutlich verändern.
