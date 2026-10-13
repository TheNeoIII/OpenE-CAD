# Fortschritt

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

- [ ] Dark-Mode-Mockup des Haupteditors erstellen
- [ ] Designsystem mit Farben, Abständen, Typografie, Icons und Zuständen definieren
- [ ] Seitentypen definieren
- [ ] Symbol-/Funktions-/Anschlussmodell vollständig spezifizieren
- [ ] Leiter-/Verbindungsmodell spezifizieren
- [ ] Potentialmodell definieren
- [ ] BMK-/IEC-81346-orientierte Struktur festlegen
- [ ] Querverweislogik spezifizieren
- [ ] Artikel- und Herstellerdatenmodell spezifizieren
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
