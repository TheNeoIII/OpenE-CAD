# OpenE-CAD

> **Ein modernes Open-Source-ECAD zwischen QElectroTech und EPLAN/WSCAD – leicht bedienbar wie ein moderner CAD-Editor, aber intern vollständig datenorientiert.**

OpenE-CAD ist als neue, eigenständige Open-Source-Anwendung für die Erstellung elektrotechnischer Dokumentation geplant. Die Referenzprogramme EPLAN Electric P8, WSCAD ELECTRIX, ELCAD und QElectroTech dienen ausschließlich zur Analyse etablierter Workflows, Funktionsprinzipien und Bedienkonzepte. Oberfläche, Datenmodell und Codebasis sollen neu entwickelt werden.

## Projektziele

- moderne, leicht erlernbare Desktop-Oberfläche
- **Light Mode und Dark Mode** als gleichwertige Themes
- Rust als primäre Programmiersprache
- datenorientiertes ECAD statt rein grafischem Schaltplanzeichner
- offene, dokumentierte Projekt- und Bibliotheksformate
- mehrseitige Stromlaufpläne mit automatischen Querverweisen
- Geräte, Funktionen, Anschlüsse und Artikel als echte Datenobjekte
- leistungsfähige Navigatoren und tabellarische Datenbearbeitung
- konfigurierbare Potential-/Leiterfarben, z. B. N standardmäßig blau
- Herstellerkataloge und neutrale Importformate; Eaton ist als erster Referenzhersteller vorgesehen
- automatisch generierbare und manuell korrigierbare Verteilerfrontansichten mit Reihen-/TE-Logik
- automatische Auswertungen wie Stücklisten, Klemmen-, Kabel- und Verdrahtungslisten
- vollständige technische Projekt-PDF mit Inhaltsverzeichnis, Stromlaufplänen, Aufbauplan und Auswertungen
- langfristig erweitertes Schaltschrank-Engineering, SPS/I/O, Fertigungsdaten und weitere Automatisierung

## Aktueller Stand

**Phase: Produktspezifikation / UX- und Domänenmodell – noch kein Produktivcode.**

Der aktuelle Stand umfasst:

- Produktvision und Positionierung
- Vergleich und Recherche der Referenzanwendungen
- erstes Oberflächenkonzept und fünf eigene UI-Mockups
- v0-Gegenentwurf als zweite Designiteration geprüft und als aktuelle bevorzugte UI/UX-Richtung übernommen
- vollständiges v0-Screenshot-Set mit 32 Ansichten als visuelle Referenz ausgewertet
- frameworkneutrales Designsystem mit Layout-, Theme-, Farb-, Typografie- und Interaktionstokens
- erste maschinenlesbare Design-Tokens unter `design/design-tokens.json`
- fachliches ECAD-Datenmodell v0.1 für Projekt, Seiten, Geräte, Funktionen, Anschlüsse, Netze, Klemmen, Kabel, SPS, Aufbau und Dokumentation
- Seitentypen und Dokumentstruktur einschließlich generierter Auswertungsseiten und PDF-Seitenlogik spezifiziert
- elektrisches Graphmodell für ConnectionPoints, Netze, Junctions, Potentiale und grafische Leitungswege spezifiziert
- kompakte Arbeitsbereichsnavigation `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation`
- Light Mode, Dark UI + heller Zeichenbogen und optionaler Full-Dark-Canvas
- Anforderungen an Verteilerfrontansicht / Aufbauplan
- Anforderungen an farbige Potentialdarstellung
- Zielbild für vollständige technische PDF-Projektdokumentation

Der von v0 erzeugte Next.js/React-Prototyp dient ausschließlich als interaktive Designreferenz. Die eigentliche Anwendung bleibt als eigenständige Rust-Neuentwicklung geplant.

## Dokumentation

- [Projektplan](docs/PROJECT_PLAN.md)
- [UI/UX- und Designkonzept](docs/DESIGN_CONCEPT.md)
- [Designsystem](docs/DESIGN_SYSTEM.md)
- [ECAD-Datenmodell](docs/DATA_MODEL.md)
- [Seitentypen und Dokumentstruktur](docs/SHEET_TYPES.md)
- [Elektrisches Modell: Anschlüsse, Netze und Potentiale](docs/ELECTRICAL_MODEL.md)
- [Funktionsumfang und Roadmap](docs/ROADMAP.md)
- [Recherche und Referenzen](docs/RESEARCH_REFERENCES.md)
- [Anforderungen aus privaten Referenzdokumenten – abstrahiert](docs/REFERENCE_DERIVED_REQUIREMENTS.md)
- [v0 Design-Brief](docs/V0_DESIGN_BRIEF.md)
- [Review der v0-Designiteration](docs/V0_REVIEW.md)
- [v0 Screenshot-Inventar](docs/V0_SCREENSHOT_INVENTORY.md)
- [Fortschritt](docs/PROGRESS.md)

Zusätzlich: [frameworkneutrale Design-Tokens](design/design-tokens.json).

> Private Beispielpläne, die zur Analyse von Workflows und Ausgabeformaten verwendet werden, werden nicht im öffentlichen Repository gespeichert. Dokumentiert werden ausschließlich abstrahierte Produktanforderungen.

## Aktuelle Designrichtung

Die derzeit bevorzugte Bedienstruktur besteht aus:

- kompakter Top-Navigation für die großen Arbeitsbereiche
- `Ctrl+K` als globale Command Palette / Suche
- schmaler kontextabhängiger Werkzeugleiste statt großer Ribbon-Oberfläche
- Projekt-/Seitennavigation links
- großer zentraler Dokument-/CAD-Arbeitsfläche
- dauerhaftem, inhaltlich dynamischem Eigenschaften-/Prüf-Inspector rechts
- Statusleiste für Raster, Fang, Zoom, Werkzeug, Auswahl und Projektprüfung
- zurückhaltender Potentialfarbcodierung: N blau, PE grün, Sonderpotentiale und Querverweise mit konfigurierbaren Akzenten

Bevorzugter Dark-Mode-Standard ist **Dark UI + heller Zeichenbogen**. Ein vollständig dunkler Canvas bleibt optional.

## Erste eigene Designvorschauen

### Haupteditor / Stromlaufplan

![OpenE-CAD Haupteditor](design/previews/01_haupteditor.webp)

### Einfügezentrum / Eaton-Referenzkatalog

![OpenE-CAD Einfügezentrum](design/previews/02_einfuegezentrum_eaton.webp)

### Datenmanager / Projektprüfung

![OpenE-CAD Datenmanager](design/previews/03_datenmanager_pruefung.webp)

### Symbol- und Makroeditor

![OpenE-CAD Symbol- und Makroeditor](design/previews/04_symbol_editor.webp)

### Projektzentrum

![OpenE-CAD Projektzentrum](design/previews/05_projektzentrum.webp)

Diese ersten Mockups bleiben als Vergleichsbasis erhalten; die v0-Iteration konkretisiert inzwischen insbesondere Haupteditor, Theme-System, Aufbauansicht, Datenmanager und Dokumentationsworkflow.

## Leitprinzip

OpenE-CAD soll grafische Darstellung und Engineering-Daten konsequent trennen:

```text
Artikel / Herstellerdaten
        ↓
Gerät / Betriebsmittel
        ↓
Funktion / Anschlusslogik
        ↓
Netze / Verbindungen
        ↓
Darstellungen / Platzierungen
```

Ein Schütz ist damit nicht nur eine Zeichnung. Es ist ein Gerät mit BMK, Artikel, Spule, Leistungs- und Hilfskontakten, Anschlüssen, Querverweisen, mechanischen Daten, einer möglichen Verteilerplatzierung und Beziehungen zu Stückliste, Verdrahtung und Aufbauplan.

## Lizenz

Noch nicht festgelegt. Die Lizenzentscheidung soll bewusst getroffen werden, bevor Quellcode oder Bibliotheksdaten veröffentlicht werden. Referenzprojekte werden nicht kopiert oder portiert; die Implementierung soll eigenständig entstehen.
