# Funktionsumfang und Roadmap

Stand: 14.10.2026

Die Roadmap ist bewusst fachlich und nicht nach Kalenderdaten gegliedert. Erst nach Abschluss der Produktspezifikation werden konkrete Releases und Meilensteine terminiert.

## Phase 0 – Produktspezifikation und technische Spikes

Status: **in Arbeit**

- Produktvision und Abgrenzung
- UI/UX-Konzept
- Light-/Dark-Mode-Konzept
- Farbsystem für Potentiale, Leiter und Querverweise
- Datenmodell für Projekt, Seite, Gerät, Funktion, Anschluss, Verbindung und Artikel
- mechanische Gerätedaten für Verteilerfrontansichten berücksichtigen
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
- konfigurierbare Potential-/Leiterfarben
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
- mechanische Grunddaten wie Breite in TE und mm vorbereiten

### Ausgabe
- PDF als hochwertige Vektorausgabe wo möglich
- farbiger und monochromer PDF-Export
- SVG
- PNG optional
- Stückliste CSV
- Betriebsmittelliste
- frei definierbare Titelblöcke / Seitenrahmen

## Phase 2 – professionelles Engineering

### Verteilerfrontansicht / Aufbauplan

Ziel: Installationsverteiler können datenorientiert als Frontansicht dokumentiert werden, ohne bereits ein vollständiges 3D-Schaltschrankmodul zu benötigen.

- Verteiler / Gehäuse mit Abmessungen
- Reihen / Hutschienen
- TE-Kapazität je Reihe
- Gerätebreite in TE und mm
- Zuordnung über Einbauort / Verteiler / Reihe
- automatische Generierung aus Projektdaten
- Anzeige belegter / freier TE
- automatische Prüfung auf Überbelegung
- Liste noch nicht platzierter Geräte
- Drag & Drop innerhalb und zwischen Reihen
- Reserve-/Blindfelder
- Positionen sperren
- automatische Neuplatzierung nur ungesperrter Geräte
- BMK-/Artikelbeschriftung
- Navigation Frontansicht ↔ Stromlaufplan
- Ausgabe der Frontansicht als Projektseite / PDF

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
- technische Projektdaten / Spezifikationsseiten
- Verteiler-/Schrankspezifikationen
- Verteilerfrontansicht / Aufbauplan
- Betriebsmittelliste
- Material-/Gerätestückliste
- Bestellliste mit Artikelaggregation
- Klemmenplan
- Kabelliste
- Verdrahtungsliste
- automatisch erzeugte Folgeseiten
- konfigurierbare Zusammenstellung der vollständigen Projekt-PDF
- perspektivisch klickbare Inhaltsverzeichnis- und Querverweise

### Mehrsprachigkeit
- Projektsprachen
- Übersetzungstabelle
- mehrsprachige Texte
- Austauschformate

## Phase 3 – erweiterter Schaltschrank und Fertigung

Die Phase-2-Verteilerfrontansicht wird hier zum vollständigen 2D-Schaltschrank-Engineering erweitert.

### 2D-Schaltschrankaufbau
- Montageplatte
- frei positionierbare Hutschienen
- Kabelkanäle
- detaillierte Geräteabmessungen
- Kollisions-/Platzprüfung
- Montageflächen
- Türen / Seitenwände / Montageebenen

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
