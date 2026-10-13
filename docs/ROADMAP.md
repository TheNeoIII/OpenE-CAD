# Funktionsumfang und Roadmap

Stand: 13.10.2026

Die Roadmap ist bewusst fachlich und nicht nach Kalenderdaten gegliedert. Erst nach Abschluss der Produktspezifikation werden konkrete Releases und Meilensteine terminiert.

## Phase 0 – Produktspezifikation und technische Spikes

Status: **in Arbeit**

- Produktvision und Abgrenzung
- UI/UX-Konzept
- Light-/Dark-Mode-Konzept
- Datenmodell für Projekt, Seite, Gerät, Funktion, Anschluss, Verbindung und Artikel
- Dateiformat `.oecad`
- Symbolformat
- Regel-/Prüfengine konzipieren
- Undo/Redo-Modell
- Evaluierung Rust-UI-Framework
- Evaluierung GPU-Canvas / Text / DPI
- Testprojekt als fachliche Referenz definieren

## Phase 1 – Kerneditor / erstes MVP

Ziel: Ein echtes mehrseitiges Projekt kann vollständig erstellt, gespeichert, geladen und als PDF/SVG ausgegeben werden.

### Projekt
- neues Projekt / öffnen / speichern
- Projektvorlagen
- mehrseitige Projekte
- Seiten hinzufügen, kopieren, verschieben, löschen
- Seitentypen
- Titelblock / Rahmen
- Projektstruktur

### Zeichenfläche
- Zoom / Pan
- Raster / Fang
- Auswahl / Mehrfachauswahl
- Verschieben / Kopieren / Drehen / Spiegeln
- orthogonale Leiter
- Verbindungspunkte
- Leitungs-Handles
- Texte und einfache Grafikobjekte
- Ebenen als spätere Erweiterung berücksichtigen

### ECAD-Kern
- Geräteinstanzen
- Funktionen
- Anschlüsse
- BMK
- Potentiale
- automatische Querverweise
- automatische Nummerierung
- Platzierungsreferenzen
- Navigation zwischen zusammengehörigen Funktionen

### Bibliothek
- Basissymbole
- eigene Symbolbibliothek
- Symbol-Editor
- Makros
- Suche / Favoriten / zuletzt verwendet

### Artikel
- neutrales Artikelmodell
- manueller Artikelstamm
- Eaton-Starterdaten als Referenz / Importtest
- Geräteartikel mit Funktionsschablonen

### Ausgabe
- PDF
- SVG
- PNG optional
- Stückliste CSV
- Betriebsmittelliste

## Phase 2 – professionelles Engineering

### Klemmen
- Klemmenleisten
- freie / platzierte Klemmen
- PE / N / Potentialklemmen
- Ebenenklemmen
- Brücken
- Zubehör
- Klemmenmanager
- Klemmenplan

### Kabel und Leitungen
- Kabeldefinition
- Adern
- Reserveadern
- Schirme
- Querschnitt / Farbe
- Kabelmanager
- Kabelliste
- Verdrahtungsliste
- Ziel-/Quellnavigation

### SPS / I/O
- SPS-Geräte
- Baugruppen
- Kanäle
- Adressen
- I/O-Listen
- Import / Export
- Prüfung doppelter Adressen

### Datenmanager
- tabellarische Bearbeitung
- Spaltenkonfiguration
- Mehrfachänderungen
- Suchen / Ersetzen
- Filter
- Copy/Paste
- Export

### Dokumentation
- Inhaltsverzeichnis
- Betriebsmittelliste
- Klemmenplan
- Kabelliste
- Verdrahtungsliste
- Artikelliste / BOM
- automatisch erzeugte Folgeseiten

### Mehrsprachigkeit
- Projektsprachen
- Übersetzungstabelle
- mehrsprachige Texte
- Austauschformate

## Phase 3 – Schaltschrank und Fertigung

### 2D-Schaltschrankaufbau
- Montageplatte
- Hutschienen
- Kabelkanäle
- Geräteabmessungen
- Kollisions-/Platzprüfung
- Montageflächen

### Routing / Fertigung
- Drahtlängen
- Routingpfade
- Verdrahtungsexport
- Beschriftungsdaten
- Kabel-/Aderkennzeichnung
- Schnittstellen zu Beschriftungssystemen

### Artikeldaten
- ETIM / eCl@ss-Felder
- BMEcat-Import prüfen
- Herstellerimporter
- lokale Katalogupdates
- Zubehörlogik
- Alternativartikel

## Phase 4 – Automatisierung und Integration

- Varianten / Optionen
- konfigurierbare Makroprojekte
- automatische Projektgenerierung
- Regeln für wiederkehrende Schaltungen
- CLI für Batch-Ausgaben
- Plugin-/Scripting-Schnittstelle
- ERP/PLM-Integration
- Git-freundliche Projektvergleiche
- Review-/Kommentarworkflow
- optional Mehrbenutzer-/Serverfunktionen

## Später / bewusst nicht im MVP

- vollständiger 3D-Schaltschrank
- elektrische Netzsimulation
- thermische Simulation
- Cloud-Zwang
- KI als notwendige Kernfunktion

KI kann später optional für Suche, Datenklassifikation, Importhilfe oder Prüfhinweise verwendet werden, darf aber das deterministische ECAD-Datenmodell nicht ersetzen.

## Qualitätsziele

Bereits ab MVP:

- reproduzierbare Projektdateien
- keine stillen Datenverluste
- Undo/Redo für alle editierenden Aktionen
- automatische Recovery-Datei
- Projektmigrationen versionsgeführt
- verständliche Fehlermeldungen
- Tests für Datenmodell und Serialisierung
- große Projekte als Performance-Testfall
