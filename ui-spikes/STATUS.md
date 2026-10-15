# S3 UI-Framework-Spikes – Status

Stand: 15.10.2026

## Ziel

Die Desktop-Workbench wird unabhängig vom CAD-Renderer praktisch verglichen. Erst die zwei besten Frameworks gehen in S4 und erhalten denselben echten OpenE-CAD-wgpu-Renderer.

## egui / eframe 0.36.2

Status: **erste Shell lauffähig**

- [x] aktuelles `eframe::App::ui`-API berücksichtigt
- [x] Ubuntu `cargo check`
- [x] Windows `cargo check`
- [x] Windows Release-Build
- [x] Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation
- [x] linkes/rechtes resizables Panel
- [x] 1.000 synthetische Navigator-Einträge
- [x] 10.000 synthetische Datenzeilen über `ScrollArea::show_rows`
- [x] Inspector mit editierbaren Feldern
- [x] Command Palette
- [x] Light / Dark
- [x] exemplarische Shortcuts
- [x] CAD-Bereich als bewusst einfacher UI-Platzhalter

Noch offen:

- [ ] realer Windows-UX-Test
- [ ] Startzeit/RAM/Scroll-Verhalten messen
- [ ] DPI 100/125/150/200 %
- [ ] echten wgpu-Renderer erst in S4 integrieren

## iced 0.14

Status: **als Nächstes**

Besonderheit für den Vergleich: Das offizielle 0.14-`Table`-Widget erzeugt seine Zellen beim Aufbau des Widgets. Für 10.000 Datensätze muss daher besonders geprüft werden, ob eine eigene Virtualisierung/Lazy-Strategie notwendig ist.

## Slint 1.18.x

Status: **danach**

Zusätzlich zur UX wird die WGPU-30-Integrations-API und die Lizenz-/Distributionsfrage separat gewertet.

## Vergleichsregel

Kein Framework gewinnt aufgrund einer hübschen Demo. Entscheidend sind:

1. Engineering-Informationsdichte
2. große Navigatoren/Tabellen
3. Keyboard/Fokus
4. Designsystem
5. direkte WGPU-Integration
6. DPI/Multi-Window
7. Wartbarkeit und Lizenzklarheit
