# Projektplan

Stand: 13.10.2026

## 1. Produktvision

OpenE-CAD soll ein modernes Open-Source-ECAD werden, das die geringe Einstiegshürde eines zeitgemäßen CAD-Editors mit einem echten, datenorientierten Engineering-Modell verbindet.

Zielbild:

> **Ein modernes Open-Source-ECAD zwischen QElectroTech und EPLAN/WSCAD – leicht bedienbar wie ein moderner CAD-Editor, aber intern vollständig datenorientiert.**

Die Anwendung wird nicht als Klon eines bestehenden Produkts entwickelt. EPLAN, WSCAD, ELCAD und QElectroTech dienen als Referenzen für etablierte Arbeitsabläufe und zur gezielten Recherche einzelner Funktionen.

## 2. Produktprinzipien

1. **Daten vor Grafik** – Symbole sind Darstellungen von Funktionen und Geräten, nicht die Datenquelle selbst.
2. **Leichte Bedienung** – häufige Tätigkeiten müssen ohne tiefe Menüstrukturen erreichbar sein.
3. **Kontext statt Überladung** – Werkzeuge und Eigenschaften werden passend zur aktuellen Auswahl angeboten.
4. **Offene Formate** – Projekte und Bibliotheken sollen dokumentiert, portabel und langfristig lesbar sein.
5. **Automatisierung ohne Zwang** – automatische Nummerierung, Auswertungen und Prüfungen helfen, bleiben aber nachvollziehbar.
6. **Light und Dark Mode gleichwertig** – beide Themes werden von Anfang an gestaltet und getestet.
7. **Plattformneutral** – Architektur und UI sollen Windows und Linux mindestens als Primärplattformen berücksichtigen; macOS bleibt möglich.
8. **Herstellerneutral** – Eaton dient als erster Referenzkatalog, wird aber nicht fest in das Kernmodell eingebaut.

## 3. Zentrales Datenmodell

Die Kerntrennung lautet:

```text
Darstellung / Symbol
        ↓
Funktion
        ↓
Gerät / Betriebsmittel
        ↓
Artikel / Herstellerdaten
```

Beispiel Schütz `-K1`:

- physisches Gerät: Eaton DILM17
- Funktion 1: Spule A1/A2
- Funktion 2: Leistungskontakt 1L1/2T1
- Funktion 3: Leistungskontakt 3L2/4T2
- Funktion 4: Leistungskontakt 5L3/6T3
- Funktion 5+: Hilfskontakte
- mehrere grafische Platzierungen auf verschiedenen Seiten
- automatische Querverweise zwischen zusammengehörigen Funktionen

## 4. Wichtige Domänenobjekte

### Projekt
- Metadaten
- Strukturkennzeichen
- Seitensatz
- Norm-/Regelprofil
- Sprachen
- Revisionen
- Projektoptionen

### Seite / Folio
- Seitentyp
- Format und Rahmen
- Titelblock
- Raster
- Koordinaten
- platzierte Darstellungen

### Gerät
- eindeutige interne ID
- BMK / Referenzkennzeichen
- Funktionstext
- Anlage / Funktion / Einbauort
- Artikelzuordnung
- Zusatzartikel
- Eigenschaften

### Funktion
- Funktionstyp
- Anschlussdefinitionen
- Symbolzuordnung
- Platzierungen
- Querverweislogik

### Verbindung
- elektrische Verbindung zwischen Anschlusspunkten
- Potential
- Leitung / Ader
- Querschnitt
- Farbe
- Nummer
- Quelle / Ziel

### Artikel
- Hersteller
- Artikelnummer
- Typ
- Beschreibungen
- Klassifikationen
- technische Daten
- Funktionsschablonen
- Symbol-/Makrozuordnungen
- Zubehör
- Dokumente / URLs

## 5. Geplantes Projektformat

Arbeitshypothese: `.oecad` als offener Container, intern versioniert und migrationsfähig.

Beispiel:

```text
project.oecad
├── project.json
├── sheets/
├── devices/
├── connections/
├── symbols/
├── macros/
├── articles/
├── assets/
└── history/
```

Für große lokale Hersteller-/Artikeldatenbanken ist SQLite vorgesehen. Das eigentliche Projektformat soll möglichst transparent und nicht von einer proprietären Datenbankstruktur abhängig sein.

## 6. UI-Hauptbereiche

- Projektzentrum
- Haupteditor / Stromlaufplan
- Einfügezentrum
- Projekt-/Gerätenavigatoren
- Eigenschafteninspektor
- Datenmanager
- Projektprüfung
- Symbol- und Makroeditor
- Auswertungen
- Bibliotheks-/Artikelverwaltung
- Einstellungen / Norm- und Regelprofile

## 7. Bedienkonzept

### Globale Suche / Command Palette
Eine zentrale Suche soll gleichzeitig finden können:

- Seiten
- BMK
- Artikel
- Symbole
- Makros
- Befehle
- Auswertungen
- Einstellungen

Beispiel: `Ctrl+K` → `DILM17`, `-K12`, `Seite 23`, `Stückliste`, `Klemmenmanager`.

### Kontextabhängige Werkzeuge
Statt dauerhaft sehr großer Ribbon-Flächen werden relevante Werkzeuge anhand von Modus und Auswahl eingeblendet.

### Direkte Navigation
Von jedem Gerät sollen direkte Sprünge möglich sein zu:

- allen Platzierungen
- Artikel
- verbundenen Zielen
- Querverweisen
- Klemmen
- Kabeln
- Schaltschrankplatzierung

## 8. Technische Richtung

Noch keine endgültige Frameworkentscheidung.

Geplant:

- Rust als Kernsprache
- UI und CAD-Rendering logisch getrennt
- eigener Undo-/Redo-Kommandostack
- klar versioniertes Datenmodell
- Plugin-/Importer-Schnittstellen früh berücksichtigen
- GPU-beschleunigte Zeichenfläche prüfen, z. B. auf Basis von `wgpu`
- Desktop-UI-Framework separat evaluieren, z. B. Slint, egui oder andere Rust-taugliche Ansätze

Die Frameworkentscheidung erfolgt erst nach einem kleinen technischen Spike für Canvas, Docking, Textdarstellung, DPI/Scaling und große Projekte.

## 9. Nicht-Ziele für den ersten Entwicklungsabschnitt

- elektrische Simulation
- vollständiges 3D-Schaltschrankengineering
- proprietäre Herstellerportale nachbauen
- vollständige EPLAN-/WSCAD-Dateikompatibilität
- Cloud-Zwang
- KI-Funktionen als Kernabhängigkeit

## 10. Nächster Planungsschritt

Vor Backend-Implementierung wird Version 0.1 fachlich spezifiziert:

- Seitentypen
- Symbol-/Anschlussmodell
- Verbindungslogik
- BMK-/Strukturkennzeichen
- Potentiale
- Querverweise
- Artikelmodell
- Klemmen
- Kabel
- Auswertungen
- Maus-/Tastaturinteraktionen
- Undo/Redo
- Datei-/Versionsformat
