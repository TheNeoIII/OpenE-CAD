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
- SPS/I/O als eigenes, aber in denselben Geräte-/Anschlussgraph integriertes Engineering-Modell
- vollständige technische Projekt-PDF mit Inhaltsverzeichnis, Stromlaufplänen, Aufbauplan und Auswertungen
- langfristig erweitertes Schaltschrank-Engineering, Fertigungsdaten und weitere Automatisierung

## Aktueller Stand

**Phase: Produktspezifikation abgeschlossen genug für technische Spikes – noch kein Produktivcode.**

Der aktuelle Stand umfasst inzwischen:

- v0-Gegenentwurf und vollständiges Screenshot-Set mit 32 Ansichten als aktuelle visuelle Referenz
- frameworkneutrales Designsystem und maschinenlesbare Design-Tokens
- fachliches Kernmodell für Projekt, Seiten, Geräte, Funktionen, Anschlüsse, Netze und Platzierungen
- detailliertes Symbol-/Funktions-/Anschlussmodell
- IEC-81346-orientiertes, aber konfigurierbares BMK-/Strukturkennzeichenmodell
- elektrisches Graphmodell mit Junctions, Netzen, Potentialen und Seitenfortsetzungen
- detailliertes Verteiler-/Reihen-/TE-Modell mit deterministischem Auto-Layout
- Klemmen-/Mehrstockklemmen-/Brückenmodell
- Kabel-/Ader-/Schirmmodell
- herstellerneutrales SPS-/I/O-Modell mit Systemen, Stationen, Modulen, Kanälen und getrennten SPS-Adressen
- Hersteller-/Artikel-/Katalogmodell mit Datenherkunft und Projekt-Snapshots
- Projektprüfungs-/Finding-/RuleProfile-Modell
- Command-/Transaktions-/Undo-/Recovery-Grundarchitektur
- offene `.oecad`-Containerstruktur mit Schema-Versionierung, Migrationen und atomarem Speichern
- Seitentypen, Titelblock-/Dokumentstruktur und generierte Auswertungsseiten
- sichere deklarative Titelblock-/Template-Ausdrücke statt eingebetteter Scripts
- UUIDv7 als persistente Objekt-ID und `i64`-µm als persistente CAD-Koordinatenbasis festgelegt
- technische Rust-Zielarchitektur und reproduzierbarer Spike-Plan für UI, wgpu-Renderer, Tabellen, Persistenz und DPI vorbereitet
- vorläufige Lizenzstrategie; MPL-2.0 ist derzeit bevorzugt, endgültige Entscheidung steht noch aus

Der von v0 erzeugte Next.js/React-Prototyp dient ausschließlich als interaktive Designreferenz. Die eigentliche Anwendung bleibt als eigenständige Rust-Neuentwicklung geplant.

## Dokumentation

### Produkt und UX

- [Projektplan](docs/PROJECT_PLAN.md)
- [UI/UX- und Designkonzept](docs/DESIGN_CONCEPT.md)
- [Designsystem](docs/DESIGN_SYSTEM.md)
- [Funktionsumfang und Roadmap](docs/ROADMAP.md)
- [Fortschritt](docs/PROGRESS.md)

### Fachliches Kernmodell

- [ECAD-Datenmodell](docs/DATA_MODEL.md)
- [Seitentypen und Dokumentstruktur](docs/SHEET_TYPES.md)
- [Titelblock-, Rahmen- und Ausdrucksmodell](docs/TITLE_BLOCK_TEMPLATE_MODEL.md)
- [Symbol-, Funktions- und Anschlussmodell](docs/SYMBOL_FUNCTION_MODEL.md)
- [Referenzkennzeichen-, BMK- und Strukturmodell](docs/REFERENCE_DESIGNATION_MODEL.md)
- [Elektrisches Modell: Anschlüsse, Netze und Potentiale](docs/ELECTRICAL_MODEL.md)
- [Verteiler-, Reihen- und Auto-Layout-Modell](docs/CABINET_LAYOUT_MODEL.md)
- [Klemmen- und Kabelmodell](docs/TERMINAL_CABLE_MODEL.md)
- [SPS-/I/O-Modell](docs/PLC_IO_MODEL.md)
- [Artikel-, Hersteller- und Katalogmodell](docs/ARTICLE_CATALOG_MODEL.md)
- [Projektprüfung und Regel-Engine](docs/VALIDATION_MODEL.md)
- [Undo/Redo-, Command- und Transaktionsmodell](docs/UNDO_TRANSACTION_MODEL.md)
- [`.oecad` Projektformat und Schema-Versionierung](docs/PROJECT_FORMAT.md)

### Technische Architektur / Vorbereitung

- [Core-Entscheidungen: UUIDv7, Fixed-Point-Koordinaten und TE](docs/CORE_TECH_DECISIONS.md)
- [Technische Rust-Zielarchitektur](docs/TECHNICAL_ARCHITECTURE.md)
- [Technischer Spike-Plan](docs/TECHNICAL_SPIKE_PLAN.md)
- [Lizenzstrategie](docs/LICENSE_STRATEGY.md)

### Referenzen / Designiteration

- [Recherche und Referenzen](docs/RESEARCH_REFERENCES.md)
- [Anforderungen aus privaten Referenzdokumenten – abstrahiert](docs/REFERENCE_DERIVED_REQUIREMENTS.md)
- [v0 Design-Brief](docs/V0_DESIGN_BRIEF.md)
- [Review der v0-Designiteration](docs/V0_REVIEW.md)
- [v0 Screenshot-Inventar](docs/V0_SCREENSHOT_INVENTORY.md)

Zusätzlich: [frameworkneutrale Design-Tokens](design/design-tokens.json).

> Private Beispielpläne, die zur Analyse von Workflows und Ausgabeformaten verwendet werden, werden nicht im öffentlichen Repository gespeichert. Dokumentiert werden ausschließlich abstrahierte Produktanforderungen.

## Aktuelle Designrichtung

Die derzeit bevorzugte Bedienstruktur besteht aus:

- kompakter Top-Navigation für `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation`
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

OpenE-CAD trennt fachliche Wahrheit und Darstellung konsequent:

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

Ein Schütz ist damit nicht nur eine Zeichnung. Es ist ein Gerät mit stabiler interner ID, BMK, Artikel, Spule, Leistungs- und Hilfskontakten, Anschlüssen, Querverweisen, mechanischen Daten, einer möglichen Verteilerplatzierung und Beziehungen zu Stückliste, Verdrahtung und Aufbauplan.

## Technische Richtung

Für persistente Projektobjekte ist **UUIDv7** vorgesehen. CAD- und Modellgeometrie wird deterministisch in ganzzahligen **µm (`i64`)** gespeichert; Teilungseinheiten werden separat als ganzzahlige milli-TE geführt. Bildschirmkoordinaten und GPU-Geometrie bleiben davon getrennt.

Der CAD-Renderer soll unabhängig vom UI-Framework bleiben; **wgpu** ist der aktuelle Renderer-Favorit für den technischen Spike. Für die Desktop-UI werden **Slint, egui und iced** anhand derselben v0-Referenzansicht und identischer Abnahmekriterien verglichen.

## Lizenz

Noch nicht endgültig festgelegt. [Die aktuelle Entscheidungsvorlage](docs/LICENSE_STRATEGY.md) empfiehlt vorläufig **MPL-2.0** als guten Kompromiss aus offenem Core und Integrations-/Plugin-Flexibilität; **GPL-3.0-or-later** bleibt die Alternative für stärkeren Copyleft-Schutz. Die endgültige Entscheidung erfolgt vor dem ersten Produktivcode.
