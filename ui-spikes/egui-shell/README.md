# S3 – egui Workbench Shell

Erster UI-Framework-Spike für OpenE-CAD.

Dieser Spike bewertet **nur die Desktop-Workbench**, nicht den CAD-Renderer. Der produktive wgpu-CAD-Renderer bleibt unabhängig und wird erst in S4 in die besten UI-Kandidaten eingebunden.

## Version

- `egui 0.36.2`
- `eframe 0.36.2`
- MPL-2.0 für OpenE-CAD-Spike-Code

## Enthaltene Testflächen

- Hauptnavigation: `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation`
- obere kontextabhängige Werkzeugleiste
- linkes resizables Navigator-Panel
- Navigator-Tabs: Seiten / Betriebsmittel / Klemmen / Kabel / SPS
- 1.000 virtuelle Navigator-Zeilen
- rechtes resizables Eigenschaften-Panel
- direkte Eingabe von Funktions-, Orts- und Artikeldaten
- v0-inspirierter Stromlaufplan-Platzhalter
- Datenansicht mit 10.000 virtuellen Zeilen
- Filter `Nur mit Befunden`
- Verteiler-/TE-Demo inklusive Überbelegung
- Dokumentations-/Stücklistenansicht
- Command Palette mit `Ctrl+K`
- Light / Dark
- exemplarische Shortcuts `F2`, `Delete`, `Ctrl+Z`

## Zu bewerten

### Bediengefühl

- wirkt die Workbench wie eine Desktop-Engineering-Anwendung oder zu sehr wie ein Entwickler-/Debug-UI?
- sind Tabellen, Eingabefelder und Panels kompakt genug?
- reagieren Resizing und Scrollen flüssig?
- ist die Command Palette angenehm?
- bleiben Fokus und Tastaturbedienung vorhersehbar?

### Performance

- Navigator mit 1.000 Einträgen schnell scrollen
- Datenansicht mit 10.000 Zeilen schnell scrollen
- zwischen Hauptarbeitsbereichen wechseln
- Inspector-Felder bearbeiten
- Fenster mehrfach maximieren/verkleinern

### Design

Der Spike ist **keine finale Gestaltung**. Er soll zeigen, wie nah sich das v0-Konzept mit dem Framework abbilden lässt und welcher Anteil an Custom Styling notwendig wäre.

## Architekturhinweis

Der aktuelle mittlere Stromlaufplan ist absichtlich nur mit egui-Painter gezeichnet. Das ist **nicht** der geplante Produktionsrenderer. S4 bindet denselben eigenständigen wgpu-Renderer aus S2 in die besten UI-Kandidaten ein.
