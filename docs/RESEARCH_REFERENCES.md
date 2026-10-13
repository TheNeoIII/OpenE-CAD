# Recherche und Referenzen

Stand: 13.10.2026

Diese Programme und Quellen dienen ausschließlich zur Funktions- und Workflowanalyse. OpenE-CAD soll weder Oberfläche noch Codebasis eines bestehenden Produkts kopieren.

## QElectroTech

Projekt: https://github.com/qelectrotech/qelectrotech-source-mirror

Relevante Beobachtungen:

- Open-Source-Desktopanwendung für elektrische Schaltpläne
- frei konfigurierbare/dockbare Panels
- umfangreiche Symbolbibliothek
- Drag & Drop von Elementen
- automatische Verbindungen bei passenden Anschlüssen
- bearbeitbare Leiterwege
- Querverweise zwischen verknüpften Elementen
- Autonummerierung
- Symbol- und Titelblockeditor
- Stücklisten-/Nomenklaturfunktionen
- CSV-Ausgaben
- PDF/SVG/Bildexport
- offene XML-basierte Projekt-/Elementformate

Für OpenE-CAD relevant:

- Referenz für einen beherrschbaren Open-Source-Funktionsumfang
- Import/Kompatibilität später prüfen
- keine Übernahme des C++/Qt-Quellcodes geplant

## EPLAN Electric P8

Offizielle Quellen:

- https://www.eplan.com/
- aktuelle Plattform-/Produktinformationen und Dokumentation

Relevante Beobachtungen:

- stark datenorientiertes Geräte-/Funktionsmodell
- verschiedene Navigatoren für projektweite Daten
- Synchronisation zwischen Grafik und Navigatoren
- umfangreiche Artikelverwaltung
- Einfügezentrum mit Geräte-/Funktions-/Makrovorschau
- automatische Auswertungen
- Klemmen-, Kabel-, SPS- und Verbindungsdaten
- Varianten-/Makroengineering
- Projektgenerierung und hohe Automatisierungstiefe

Für OpenE-CAD relevant:

- Datenmodell und Automatisierung als wichtigste Referenz
- UI soll deutlich leichter und weniger überladen werden
- Funktionen sollen kontextbezogen und gut auffindbar sein

## WSCAD ELECTRIX

Offizielle Quellen:

- https://www.wscad.com/en/electrix/
- https://www.wscad.com/en/electrix/release-notes/

Relevante Beobachtungen:

- Project Explorer
- Material Explorer / Material Browser
- Quick Editor
- Symbol- und Makroeditor
- Terminal Manager
- Cable Manager
- Connection Manager
- PLC Manager
- flexible Reports und Excel-Ausgaben
- direkte Navigation zwischen Schaltplan und Materialdaten
- starke Makro-Workflows

Für OpenE-CAD relevant:

- Explorer-/Manager-Konzept
- tabellarische Schnellbearbeitung
- direkte Sprünge zwischen grafischer und datenorientierter Sicht

## ELCAD / AUCOPLAN

Offizielle Quellen:

- https://www.aucotec.com/
- AUCOTEC Product Guides / Academy

Relevante Beobachtungen:

- starke Baum- und Listenorientierung
- Stapel-/Batch-Verarbeitung
- automatisierbare Prozesse
- kontextbezogene Menüs
- aktuelle Versionen bieten einen Dark Mode
- Fokus auf Datenkompatibilität und Engineering-Workflows

Für OpenE-CAD relevant:

- Listen- und Batch-Verarbeitung
- automatische Folgeprozesse
- kontextabhängige UI

## Eaton als erster Referenzhersteller

Offizielle Quelle:

https://www.eaton.com/de/de-de/support/tools/ecad-mcad-eplan-.html

Eaton bietet elektrische CAE- sowie mechanische CAD-Daten an. Das eCAD-Portal stellt Module/Makros und das mCAD-Portal 2D-/3D-Geometrien in verschiedenen Formaten bereit. Zusätzlich sind zahlreiche Eaton-Produkte im EPLAN Data Portal vorhanden.

Geplante Referenzfamilien:

- DILM – Schütze
- PKE – Motorschutz
- NZM – Leistungsschalter
- xPole / FAZ – Schutzgeräte
- RMQ-Titan / M22 – Befehls- und Meldegeräte
- easyE4 – Steuerrelais

Wichtig:

Herstellerdaten werden nur über zulässige Quellen und Importwege eingebunden. OpenE-CAD erhält ein herstellerneutrales internes Artikelmodell. Daten aus proprietären Portalen oder konkurrierenden Programmen werden nicht ungeprüft weiterverteilt.

## Normative Themen

Bei der Spezifikation zu berücksichtigen, ohne urheberrechtlich geschützte Norminhalte mitzuliefern:

- IEC 60617 – grafische Symbole
- IEC 61082 – Dokumente der Elektrotechnik
- IEC 81346 – Strukturierung und Referenzkennzeichnung
- IEC 81355 – Klassifikation und Kennzeichnung von Informationen/Dokumenten

OpenE-CAD soll Regelprofile und normorientierte Workflows unterstützen, aber keine kostenpflichtigen Normtexte oder Symbolsammlungen illegal reproduzieren.

## Rechercheprinzip

Für jede größere Funktion wird vor Implementierung dokumentiert:

1. welches fachliche Problem gelöst werden soll,
2. wie etablierte ECAD-Systeme dieses Problem lösen,
3. welche Schwächen deren Workflow hat,
4. wie OpenE-CAD den Vorgang einfacher lösen kann,
5. welches Datenmodell dafür benötigt wird.

So bleiben Referenzen Inspiration und fachliche Recherche statt Vorlage für einen Klon.
