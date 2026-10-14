# Fortschritt

## 14.10.2026 – v0 Designiteration 2 ausgewertet

### Erledigt

- [x] v0-Gegenentwurf anhand der Screenshots geprüft
- [x] vollständigen v0-ZIP-Export mit Haupteditor, Aufbau, Datenmanager, Dokumentation, Einfügezentrum und Projektstart geprüft
- [x] v0-Entwurf als bevorzugte aktuelle UI/UX-Richtung übernommen
- [x] Light Mode geprüft
- [x] Dark UI + heller Zeichenbogen geprüft und als bevorzugter Dark-Standard bestätigt
- [x] Full-Dark-Canvas als optionalen Arbeitsmodus bestätigt
- [x] kompakte Top-Navigation `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation` bestätigt
- [x] `Ctrl+K` Command Palette als zentrales Bedienkonzept bestätigt
- [x] permanenter, dynamischer Eigenschaften-/Prüf-Inspector bestätigt
- [x] v0-Aufbauworkflow mit Auto-Layout, TE-Bilanz, Drag & Drop, Reservefeldern und Positionssperren geprüft
- [x] v0-Datenmanager mit Tabellen-/Power-User-Bedienung geprüft
- [x] v0-Dokumentations-/Exportansicht geprüft
- [x] notwendige Verfeinerungen vor Rust-Implementierung dokumentiert
- [x] Review unter `docs/V0_REVIEW.md` abgelegt

### Designentscheidung

Die v0-Haupteditor-Richtung ist die aktuelle bevorzugte Designbasis. Sie ersetzt die ersten Mockups nicht vollständig, konkretisiert deren Layout und Interaktionen aber deutlich.

Der Next.js/React-Code bleibt **Designprototyp**. Die Produktivanwendung wird weiterhin eigenständig in Rust entwickelt.

### Noch zu verfeinern

- [ ] Design Tokens aus v0 ableiten
- [ ] Verteilergeometrie datengetrieben statt beispielhaft `4 × 36 TE`
- [ ] Navigatorbreite / lange Seitennamen finalisieren
- [ ] monochrome Linienstile für Potentiale konkretisieren
- [ ] Potentialfarben als Projekt-/Firmenprofil definieren
- [ ] Titelblock-Template-System spezifizieren
- [ ] Workspace-/Panel-Docking-Konzept für Multi-Monitor-Betrieb definieren

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

### Neue fachliche Entscheidung

Die einfache **Verteilerfrontansicht** wird nicht erst mit dem späteren vollständigen Schaltschrank-Engineering umgesetzt. Sie wird als eigenständiger datenorientierter Funktionsbereich in Phase 2 vorgesehen.

Das spätere vollständige 2D-Schaltschrankmodul erweitert diese Funktion um Montageplatte, Kabelkanäle, frei positionierbare Hutschienen und weitere Fertigungsdetails.

## 13.10.2026 – Projektstart / Konzeptphase

### Erledigt

- [x] GitHub-Projekt `TheNeoIII/OpenE-CAD` angelegt
- [x] Produktvision definiert
- [x] Positionierung als eigenständiges Open-Source-ECAD festgelegt
- [x] EPLAN Electric P8 als Funktions-/Workflowreferenz untersucht
- [x] WSCAD ELECTRIX als Funktions-/Workflowreferenz untersucht
- [x] ELCAD als Funktions-/Workflowreferenz untersucht
- [x] QElectroTech als Open-Source-Referenz untersucht
- [x] Eaton als erster Referenzhersteller vorgesehen
- [x] Grundlayout der Anwendung entworfen
- [x] Haupteditor als Mockup erstellt
- [x] Einfügezentrum als Mockup erstellt
- [x] Datenmanager / Projektprüfung als Mockup erstellt
- [x] Symbol-/Makroeditor als Mockup erstellt
- [x] Projektzentrum als Mockup erstellt
- [x] Light Mode als erster visueller Entwurf festgelegt
- [x] Dark Mode als gleichwertige Designanforderung aufgenommen
- [x] Kernprinzip `Darstellung → Funktion → Gerät → Artikel` festgelegt
- [x] erste fachliche Roadmap dokumentiert
- [x] Grundidee für offenes `.oecad`-Format dokumentiert

### Aktueller Status

**Noch kein Backend- oder Produktivcode.**

Der derzeitige Schwerpunkt liegt absichtlich auf Produktdefinition, Datenmodell und Bedienkonzept. Das soll verhindern, dass früh UI- oder Persistenzcode entsteht, der später durch fachliche Anforderungen wieder grundlegend umgebaut werden muss.

## Als Nächstes

### P0 – vor dem Coding klären

- [x] Dark-Mode-Mockup des Haupteditors erstellen
- [ ] Designsystem mit Farben, Abständen, Typografie, Icons und Zuständen definieren
- [ ] Potential-/Leiter-Farbprofil für Light/Dark definieren
- [x] Mockup / Prototyp für Verteilerfrontansicht / Aufbauplan erstellen
- [x] PDF-/Dokumentations-Export als UI-Workflow entwerfen
- [x] v0-Gegenentwurf auswerten und mit bestehendem Konzept vergleichen
- [ ] Seitentypen definieren
- [ ] Symbol-/Funktions-/Anschlussmodell vollständig spezifizieren
- [ ] Leiter-/Verbindungsmodell spezifizieren
- [ ] Potentialmodell definieren
- [ ] BMK-/IEC-81346-orientierte Struktur festlegen
- [ ] Querverweislogik spezifizieren
- [ ] Artikel- und Herstellerdatenmodell spezifizieren
- [ ] mechanische Artikeldaten / TE-Breite spezifizieren
- [ ] Verteiler-/Reihen-/Platzierungsmodell spezifizieren
- [ ] Klemmen-/Kabelmodell grob vorplanen, damit das MVP keine Sackgassen erzeugt
- [ ] Undo/Redo-Architektur festlegen
- [ ] Projektformat und Schema-Versionierung konkretisieren
- [ ] Lizenzstrategie festlegen

### P1 – technische Evaluierung

- [ ] Rust Workspace-Grundstruktur entwerfen
- [ ] UI-Framework-Spike
- [ ] Canvas-/Renderer-Spike
- [ ] Text-Rendering und Schaltplan-Schriften testen
- [ ] High-DPI / Windows / Linux testen
- [ ] 5.000–20.000 grafische Objekte als Performance-Test
- [ ] Hit-Testing / Selection / Snap testen
- [ ] Serialisierung und migrationsfähige Projektdatei testen

### P2 – erster funktionaler Prototyp

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
| 14.10.2026 | v0-Entwurf wird als aktuelle bevorzugte UI/UX-Designbasis übernommen | beschlossen |
| 14.10.2026 | Dark UI + heller Zeichenbogen ist bevorzugter Dark-Standard; Full Dark Canvas bleibt optional | beschlossen |
| 14.10.2026 | Next.js/React-v0-Code dient nur als Designreferenz, Produktivcode bleibt Rust-Neuentwicklung | beschlossen |
| 14.10.2026 | Private Referenz-PDFs werden nicht öffentlich im Repository gespeichert | beschlossen |
| 14.10.2026 | Verteilerfrontansicht mit TE-/Reihenlogik wird eigener Phase-2-Funktionsbereich | beschlossen |
| 14.10.2026 | Frontansicht soll aus Gerätedaten automatisch generierbar und manuell korrigierbar sein | beschlossen |
| 14.10.2026 | Potential-/Leiterfarben werden konfigurierbare visuelle Hilfen; N standardmäßig blau | beschlossen |
| 14.10.2026 | vollständige technische Projektdokumentation als zusammenhängende PDF ist Ziel | beschlossen |
| 13.10.2026 | Eigenständige Neuentwicklung statt Port/Fork eines Referenzprogramms | beschlossen |
| 13.10.2026 | Rust als primäre Sprache | beschlossen |
| 13.10.2026 | Datenorientiertes Modell statt reiner Grafikobjekte | beschlossen |
| 13.10.2026 | leichte Bedienbarkeit ist Kernziel | beschlossen |
| 13.10.2026 | Light und Dark Mode werden gleichwertig entwickelt | beschlossen |
| 13.10.2026 | Eaton dient als erster Hersteller-/Katalogreferenzfall | beschlossen |
| 13.10.2026 | Frameworkauswahl wird erst nach technischem Spike entschieden | offen / geplant |
| 13.10.2026 | konkrete Open-Source-Lizenz | offen |

## Fortschrittslog-Konvention

Neue relevante Entscheidungen werden in dieser Datei ergänzt. Größere fachliche Änderungen sollen zusätzlich in den jeweiligen Dokumenten aktualisiert werden, damit `PROGRESS.md` als chronologische Übersicht lesbar bleibt.
