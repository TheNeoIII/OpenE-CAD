# Fortschritt

## 14.10.2026 – Erste Detailmodelle spezifiziert

### Erledigt

- [x] Seitentypen und Dokumentstruktur detailliert spezifiziert: `docs/SHEET_TYPES.md`
- [x] manuelle, datengetriebene und generierte Seiten getrennt
- [x] technische Projektseite, Dokumentseite und physische PDF-Seite getrennt
- [x] Titelblock-/Rahmen-Templates und Datenbindings definiert
- [x] Dokumentationssets unabhängig von der internen Projektseitenfolge vorgesehen
- [x] generierte Stücklisten, Klemmenpläne, Kabellisten und weitere Reports als Ableitungen des Projektmodells definiert
- [x] Querverweise als stabile Placement-Referenzen statt gespeicherter Textverweise festgelegt
- [x] elektrisches Netz-/Potentialmodell detailliert spezifiziert: `docs/ELECTRICAL_MODEL.md`
- [x] `ConnectionPoint`, `Net`, `ElectricalConnection` und grafischen `ConnectionPath` getrennt
- [x] explizite JunctionNodes für T-Verbindungen definiert
- [x] Linienkreuzung verbindet standardmäßig nicht
- [x] Seitenfortsetzungen über stabile ContinuationNodes vorgesehen
- [x] schaltende Funktionen trennen statische Netze
- [x] Potentialtyp von Farbe und physischer Leiterfarbe getrennt
- [x] Klemmen, Kabeladern und SPS-Anschlüsse auf dasselbe ConnectionPoint-Prinzip ausgerichtet
- [x] inkrementeller Net-Rebuild als Core-Anforderung aufgenommen

### Nächste Detailmodelle

1. Symbol-/Function-/ConnectionPoint-Bibliotheksmodell vertiefen
2. BMK / Strukturkennzeichen / IEC-81346-orientiertes Regelprofil
3. Verteiler-/Reihen-/Auto-Layout-Regeln finalisieren
4. Klemmen- und Kabelmodell vertiefen
5. Undo/Redo-Kommandos und Transaktionen
6. `.oecad`-Container und Schema-Versionierung

---

## 14.10.2026 – Designsystem und Datenmodell v0.1

### Erledigt

- [x] frameworkneutrales Designsystem erstellt: `docs/DESIGN_SYSTEM.md`
- [x] Layoutmaße für App-Bar, Toolbar, Navigator, Inspector, Statusleiste und Tabellen definiert
- [x] Light Mode, Dark UI + heller Plan und Full-Dark-Canvas als Theme-Tokens spezifiziert
- [x] Interaktions-, Status- und technische Farbsemantik definiert
- [x] N, PE, Steuer-/Sonderpotentiale, Querverweise und Auswahl als konfigurierbare semantische Farben definiert
- [x] Typografie, Abstände, Radien, Dichteprofile und Icongrößen spezifiziert
- [x] Canvas-, Raster-, Auswahl-, Hover- und Leitungswerkzeug-Zustände spezifiziert
- [x] Navigator-, Inspector-, Datenmanager-, Aufbau-, Einfügezentrum-, Command-Palette- und Dokumentationsmuster spezifiziert
- [x] erste maschinenlesbare Design-Tokens unter `design/design-tokens.json` abgelegt
- [x] fachliches Domänenmodell v0.1 erstellt: `docs/DATA_MODEL.md`
- [x] stabile interne IDs von BMK/Artikelnummer/Seitenname getrennt
- [x] `Article → Device → Function → ConnectionPoint → Net/Connection → Placement` als zentrale Fachstruktur definiert
- [x] Artikel, Geräte, Funktionen, Anschlüsse, Symbole und grafische Platzierungen sauber getrennt
- [x] Potentiale fachlich von Darstellungsfarben getrennt
- [x] Klemmen-, Kabel- und SPS-Grundmodell vorgesehen
- [x] Verteiler-, Montageflächen-, Reihen- und CabinetPlacement-Modell spezifiziert
- [x] TE und reale mm-Abmessungen als getrennte Größen festgelegt
- [x] Auto-Layout mit gesperrten/manual/auto Platzierungen fachlich vorbereitet
- [x] Titelblock-, Dokumentations-, Prüfungs-, Revisions- und Custom-Property-Grundmodell aufgenommen
- [x] Undo/Redo als Commands auf dem Domänenmodell vorbereitet

### Fachliche Entscheidungen

- Stabile interne IDs sind die Primärreferenz; BMK und andere sichtbare Kennzeichen sind änderbare Eigenschaften.
- Grafikobjekte sind Darstellungen fachlicher Objekte und nicht deren Identität.
- Ein Gerät kann mehrere Funktionen und mehrere Stromlaufplan-Platzierungen besitzen, bleibt aber ein Gerät in Stückliste und Aufbau.
- Ein Verteileraufbau referenziert dieselben Device-IDs wie der Stromlaufplan.
- TE-Breite und reale Gerätebreite in mm werden separat gespeichert.
- Auswertungen werden aus dem gemeinsamen Datenmodell generiert und nicht als unabhängige zweite Datenhaltung gepflegt.

---

## 14.10.2026 – v0 Designiteration 2 vollständig dokumentiert

### Erledigt

- [x] v0-Gegenentwurf und vollständigen ZIP-Export geprüft
- [x] vollständiges Screenshot-Set mit 32 Ansichten ausgewertet
- [x] Screenshot-Inventar unter `docs/V0_SCREENSHOT_INVENTORY.md` dokumentiert
- [x] v0-Entwurf als bevorzugte aktuelle UI/UX-Richtung übernommen
- [x] Light Mode geprüft
- [x] Dark UI + heller Zeichenbogen als bevorzugter Dark-Standard bestätigt
- [x] Full-Dark-Canvas als optionalen Arbeitsmodus bestätigt
- [x] kompakte Top-Navigation `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation` bestätigt
- [x] `Ctrl+K` Command Palette als zentrales Bedienkonzept bestätigt
- [x] permanenter, dynamischer Eigenschaften-/Prüf-Inspector bestätigt
- [x] Navigatoren für Seiten, Betriebsmittel, Klemmen, Kabel und SPS geprüft
- [x] Leitungswerkzeug und Einfügezentrum geprüft
- [x] Aufbauworkflow mit Auto-Layout, TE-Bilanz, Drag & Drop, Reservefeldern und Positionssperren geprüft
- [x] alle acht Datenmanager-Register und Power-User-Funktionen geprüft
- [x] Dokumentations-/Exportansicht mit Stückliste und Klemmenplan geprüft
- [x] UX-Konzept / Begründung der Layoutentscheidungen geprüft
- [x] Review unter `docs/V0_REVIEW.md` dokumentiert

### Designentscheidung

Die v0-Richtung ist die aktuelle bevorzugte Designbasis. Die 32 Ansichten decken die wesentlichen Arbeitsbereiche ausreichend ab; vor der Spezifikationsphase sind keine weiteren grundsätzlichen Mockups erforderlich.

Der Next.js/React-Code bleibt **Designprototyp**. Die Produktivanwendung wird eigenständig in Rust entwickelt.

---

## 14.10.2026 – Private Referenzpläne / Dokumentations- und Aufbauanforderungen

### Erledigt

- [x] private ELCAD-Beispieldokumentation analysiert
- [x] private WSCAD-Beispieldokumentation analysiert
- [x] entschieden, die Original-PDFs **nicht** in das öffentliche Repository hochzuladen
- [x] nur abstrahierte, nicht personenbezogene Merkmale dokumentiert
- [x] vollständige Projekt-PDF als Ziel aufgenommen
- [x] Verteilerfrontansicht / Aufbauplan als eigener Funktionsbereich aufgenommen
- [x] TE-basierte Geräteplatzierung je Reihe spezifiziert
- [x] automatische Frontansicht aus Einbauort / Verteiler / Reihe / Gerätebreite vorgesehen
- [x] manuelle Nachbearbeitung per Drag & Drop und Positionssperren vorgesehen
- [x] farbige Potential-/Leiterdarstellung als UI-Anforderung aufgenommen
- [x] Neutralleiter-Blau als sinnvolles Standardprofil aufgenommen
- [x] PE- und Querverweisfarben als konfigurierbare visuelle Hilfen vorgesehen
- [x] Material-/Bestelllisten, Klemmenpläne und Kabellisten als PDF-Auswertungen bestätigt
- [x] Roadmap entsprechend angepasst
- [x] v0 Design-Brief erstellt: `docs/V0_DESIGN_BRIEF.md`
- [x] abstrahierte Anforderungen aus den privaten PDFs dokumentiert: `docs/REFERENCE_DERIVED_REQUIREMENTS.md`

### Entscheidung

Die einfache Verteilerfrontansicht wird bereits in Phase 2 vorgesehen. Das spätere vollständige 2D-Schaltschrankmodul erweitert sie um Montageplatte, Kabelkanäle, frei positionierbare Hutschienen, Routing und weitere Fertigungsdetails.

---

## 13.10.2026 – Projektstart / Konzeptphase

### Erledigt

- [x] GitHub-Projekt `TheNeoIII/OpenE-CAD` angelegt
- [x] Produktvision definiert
- [x] Positionierung als eigenständiges Open-Source-ECAD festgelegt
- [x] EPLAN Electric P8, WSCAD ELECTRIX, ELCAD und QElectroTech als Referenzen untersucht
- [x] Eaton als erster Referenzhersteller vorgesehen
- [x] Grundlayout der Anwendung entworfen
- [x] fünf erste UI-Mockups erstellt
- [x] Light und Dark Mode als gleichwertige Designanforderung aufgenommen
- [x] Kernprinzip `Darstellung → Funktion → Gerät → Artikel` festgelegt
- [x] erste fachliche Roadmap dokumentiert
- [x] Grundidee für offenes `.oecad`-Format dokumentiert

## Aktueller Status

**Noch kein Produktivcode.**

Der Schwerpunkt liegt weiterhin bewusst auf Produktspezifikation, Datenmodell und Bedienkonzept. Erst danach folgen technische Rust-Spikes und die Frameworkentscheidung.

## P0 – vor dem Coding

- [x] Dark-Mode-Mockup des Haupteditors
- [x] Designsystem v0.1
- [x] erste Design-Tokens
- [x] Aufbau-/Verteilerfront-Prototyp
- [x] PDF-/Dokumentations-Workflow
- [x] v0-Gegenentwurf vollständig ausgewertet
- [x] Domänenmodell v0.1 breit spezifiziert
- [x] Seitentypen im Detail
- [ ] Symbol-/Funktions-/Anschlussmodell im Detail
- [x] Leiter-/Netz-/Potentiallogik im Detail
- [ ] BMK-/IEC-81346-Regelprofil
- [x] Querverweis-Grundlogik im Detail
- [ ] Artikel-/Herstellerdatenmodell finalisieren
- [ ] Verteiler-/Reihen-/Platzierungsregeln finalisieren
- [ ] Klemmen-/Kabelmodell vertiefen
- [ ] Undo/Redo-Architektur finalisieren
- [ ] Projektformat und Schema-Versionierung konkretisieren
- [ ] Lizenzstrategie festlegen

## P1 – technische Evaluierung

- [ ] Rust Workspace-Grundstruktur entwerfen
- [ ] UI-Framework-Spike
- [ ] Canvas-/Renderer-Spike
- [ ] Text-Rendering und Schaltplan-Schriften testen
- [ ] High-DPI / Windows / Linux testen
- [ ] 5.000–20.000 grafische Objekte als Performance-Test
- [ ] Hit-Testing / Selection / Snap testen
- [ ] Serialisierung und migrationsfähige Projektdatei testen

## P2 – erster funktionaler Prototyp

- [ ] Projekt anlegen / speichern / laden
- [ ] Seite darstellen
- [ ] Raster / Zoom / Pan
- [ ] Symbol platzieren
- [ ] Anschlüsse verbinden
- [ ] Gerät mit BMK anlegen
- [ ] Querverweis zwischen zwei Funktionen desselben Geräts
- [ ] Undo / Redo
- [ ] PDF/SVG-Ausgabe

## Entscheidungen

| Datum | Entscheidung | Status |
|---|---|---|
| 14.10.2026 | technische Projektseite und physische PDF-Seite werden getrennt modelliert | beschlossen |
| 14.10.2026 | Querverweise referenzieren stabile Placements statt gespeicherter Verweisstrings | beschlossen |
| 14.10.2026 | Leitungsgeometrie und elektrische Topologie werden getrennt | beschlossen |
| 14.10.2026 | Linienkreuzung verbindet standardmäßig nicht; T-Verbindungen verwenden explizite JunctionNodes | beschlossen |
| 14.10.2026 | Domänenobjekte verwenden stabile interne IDs; sichtbare Kennzeichen sind keine Primärschlüssel | beschlossen |
| 14.10.2026 | Grafik und Fachobjekte werden strikt getrennt | beschlossen |
| 14.10.2026 | TE und reale mm-Abmessungen werden separat modelliert | beschlossen |
| 14.10.2026 | Auswertungen werden aus dem gemeinsamen Projektmodell generiert | beschlossen |
| 14.10.2026 | vollständiges v0-Screenshot-Set mit 32 Ansichten ist ausreichende visuelle Referenz | beschlossen |
| 14.10.2026 | v0-Entwurf wird als aktuelle bevorzugte UI/UX-Designbasis übernommen | beschlossen |
| 14.10.2026 | Dark UI + heller Zeichenbogen ist bevorzugter Dark-Standard; Full Dark Canvas bleibt optional | beschlossen |
| 14.10.2026 | Next.js/React-v0-Code dient nur als Designreferenz, Produktivcode bleibt Rust-Neuentwicklung | beschlossen |
| 14.10.2026 | Private Referenz-PDFs werden nicht öffentlich gespeichert | beschlossen |
| 14.10.2026 | Verteilerfrontansicht mit TE-/Reihenlogik wird eigener Phase-2-Funktionsbereich | beschlossen |
| 14.10.2026 | Potential-/Leiterfarben sind konfigurierbare visuelle Hilfen; N standardmäßig blau | beschlossen |
| 14.10.2026 | vollständige technische Projektdokumentation als zusammenhängende PDF ist Ziel | beschlossen |
| 13.10.2026 | Eigenständige Neuentwicklung statt Port/Fork | beschlossen |
| 13.10.2026 | Rust als primäre Sprache | beschlossen |
| 13.10.2026 | Datenorientiertes Modell statt reiner Grafikobjekte | beschlossen |
| 13.10.2026 | leichte Bedienbarkeit ist Kernziel | beschlossen |
| 13.10.2026 | Eaton dient als erster Hersteller-/Katalogreferenzfall | beschlossen |
| 13.10.2026 | Frameworkauswahl erfolgt erst nach technischem Spike | geplant |
| 13.10.2026 | konkrete Open-Source-Lizenz | offen |

## Fortschrittslog-Konvention

Neue relevante Entscheidungen werden hier ergänzt. Größere fachliche Änderungen werden zusätzlich in den jeweiligen Spezifikationsdokumenten gepflegt.
