# v0 Design-Brief für OpenE-CAD

Stand: 14.10.2026

Der folgende Text ist als direkt verwendbarer Prompt für v0 gedacht.

---

## Prompt

Entwirf ein modernes Desktop-UI/UX-Konzept für eine neue Open-Source-ECAD-Anwendung namens **OpenE-CAD**.

### Produktvision

OpenE-CAD soll sich funktional zwischen QElectroTech und professionellen Systemen wie EPLAN, WSCAD und ELCAD positionieren:

> Ein modernes Open-Source-ECAD – leicht bedienbar wie ein moderner CAD-Editor, aber intern vollständig datenorientiert.

Die genannten Programme dienen ausschließlich als Referenz für etablierte Arbeitsabläufe und Funktionsprinzipien. Das neue Design soll **eigenständig** sein und keine bestehende Oberfläche kopieren.

Die Anwendung wird später in Rust entwickelt. Für diese Aufgabe sollst du **nur das UI/UX-Design und einen visuellen Frontend-Prototyp** erstellen. Kein Backend, keine Datenbanklogik und keine echte ECAD-Engine implementieren.

### Kernziele

1. Sehr leichte Erlernbarkeit für Anwender, die bisher wenig ECAD-Erfahrung haben.
2. Gleichzeitig hohe Arbeitsgeschwindigkeit für professionelle Elektrotechniker und Planer.
3. Moderne, ruhige Desktop-Oberfläche mit hoher Informationsdichte ohne Überladung.
4. Light Mode und Dark Mode als gleichwertige Themes.
5. Große Zeichenfläche im Mittelpunkt.
6. Datenorientierte Arbeitsweise: Geräte sind nicht nur Grafik, sondern besitzen Funktionen, Anschlüsse, Artikel, Querverweise, Platzierungen und Auswertungsdaten.
7. Desktop-first für Windows und Linux; gut nutzbar auf Full-HD, 1440p und Multi-Monitor-Systemen.

### Wichtige Designregel

Bitte vermeide eine dauerhaft riesige Office-artige Ribbon-Leiste mit sehr vielen gleichzeitigen Buttons.

Bevorzugt wird:

- wenige Hauptmodi
- kompakte kontextabhängige Toolbar
- progressive disclosure: erweiterte Funktionen erst zeigen, wenn sie benötigt werden
- Command Palette / globale Suche
- dockbare bzw. ein-/ausblendbare Seitenpanels
- Tastaturkürzel für Power-User

## 1. Haupteditor / Stromlaufplan

Entwirf die zentrale Arbeitsansicht.

Grundstruktur:

- **links:** Projekt-/Seiten-Navigator
- **Mitte:** große Stromlaufplan-Zeichenfläche
- **rechts:** Eigenschaften, Gerätedaten und Live-Projektprüfung
- **oben:** Hauptmodi und kontextabhängige Werkzeuge
- **unten:** Statusleiste für Raster, Fang, Zoom, Fehler/Hinweise

Hauptmodi oben beispielsweise:

- Projekt
- Zeichnen
- Einfügen
- Daten
- Auswertungen
- Prüfen
- Ansicht

Globale Suche / Command Palette über `Ctrl+K`, z. B. Suche nach:

- `-K12`
- `DILM17`
- `Motor M1`
- `Seite 23`
- `Klemme X1`
- `Stückliste erzeugen`

### Verhalten der rechten Seitenleiste

Wenn ein Gerät markiert ist, zeige beispielsweise:

- BMK
- Funktion
- Einbauort
- Reihe
- Hersteller
- Artikelnummer
- elektrische Daten
- mechanische Daten
- Querverweise
- Validierungsstatus

Änderungen sollen möglichst direkt und ohne modale Dialoge möglich sein.

## 2. Stromlaufplan-Darstellung und Farben

Der Schaltplan darf moderat farbcodiert sein, statt ausschließlich schwarz dargestellt zu werden.

Erstelle ein professionelles, zurückhaltendes Farbsystem, zum Beispiel:

- L1/L2/L3 bzw. allgemeiner Hauptstrom: schwarz / neutral dunkel
- Neutralleiter N: **blau**
- PE: **grün bzw. grün-gelb-nahe Darstellungsfarbe**
- ausgewählte Steuerpotentiale: dezente eigene Farben
- Querverweise / Seitenfortsetzungen: kontrastierende, aber nicht dominante Akzentfarbe

Die Farbcodierung muss konfigurierbar sein und darf nicht die einzige Informationsquelle sein. Linienart, Text und Symbole müssen die Bedeutung weiterhin eindeutig zeigen.

Zeige im Mockup:

- mehrphasige Versorgung
- Neutralleiter in Blau
- PE in Grün
- Seitenfortsetzungsverweise
- Leistungsschutz-/FI-Geräte
- Schütz / Relais
- Klemmen
- Verbraucher

Bitte achte darauf, dass der Plan weiterhin wie professionelle technische Dokumentation wirkt und nicht wie ein buntes Diagramm.

## 3. Light Mode und Dark Mode

Erzeuge mindestens zwei Varianten des Haupteditors.

### Light Mode

- heller Arbeitsbereich
- weißer Plan
- neutrale graue Panels
- Blau/Cyan als Interaktionsfarbe

### Dark Mode – bevorzugter Standard

- dunkles Anthrazit für Fenster und Panels
- **Plan selbst weiterhin hell**, damit die Bearbeitungsansicht der späteren Druck-/PDF-Darstellung entspricht
- hohe, aber angenehme Kontraste
- keine rein schwarzen Flächen

### Optional zusätzlich

Zeige eine Variante `Dark UI + Dark Canvas` für lange Bildschirmarbeit. Beim PDF-Export würde die Darstellung trotzdem wieder auf einen weißen druckorientierten Plan umgesetzt.

## 4. Einfügezentrum / Geräteauswahl

Entwirf eine zentrale Suche, die Symbol-, Makro- und Artikelwahl zusammenführt.

Der Benutzer soll nicht entscheiden müssen, ob er zuerst ein Symbol oder einen Artikel sucht.

Beispielsuche:

`Schütz 24 V DC 18 A`

Als Referenzhersteller kann **Eaton** verwendet werden, beispielsweise Produktfamilien wie:

- DILM
- PKE
- xPole / Leitungsschutz- und FI-Geräte
- RMQ-Titan M22
- easyE4

Dreiteiliges Layout:

1. Filter / Hersteller / Kategorien
2. Trefferliste
3. Gerätevorschau und Daten

Vorschau soll zeigen können:

- Hersteller
- Artikelnummer
- elektrische Daten
- verfügbare Funktionen
- Symboldarstellungen
- mechanische Breite, z. B. TE
- Zubehör
- Datenqualität / Quelle

Drag & Drop bzw. `Gerät platzieren` soll der primäre Workflow sein.

## 5. Verteilerfrontansicht / Aufbauplan

Dies ist eine wichtige neue Ansicht und soll als eigener hochwertiger Mockup entworfen werden.

Ziel ist eine Frontansicht eines Installationsverteilers mit Hutschienen bzw. Geräte-Reihen.

Ein Verteiler besitzt beispielsweise:

- Gehäuseabmessungen
- mehrere Reihen
- definierte TE-Kapazität je Reihe, beispielsweise 12, 18, 24 oder 36 TE
- Hutschienen
- Geräte
- Reserve-/Blindfelder
- Beschriftungen

Geräte besitzen unter anderem:

- BMK
- Artikel
- Einbauort
- Reihe
- Breite in TE
- Breite/Höhe/Tiefe in mm
- 2D-Frontsymbol

### Automatische Frontgenerierung

Visualisiere einen Workflow, bei dem OpenE-CAD die Frontansicht automatisch aus den Gerätedaten erzeugt:

- Geräte werden nach Einbauort und Reihe gruppiert
- Breite in TE wird berücksichtigt
- freie TE werden angezeigt
- Überbelegung wird klar als Fehler markiert
- noch nicht platzierte Geräte erscheinen in einer Aufgaben-/Komponentenliste

### Manuelle Bearbeitung

Die automatische Ansicht muss anschließend extrem einfach korrigierbar sein:

- Drag & Drop eines Geräts innerhalb einer Reihe
- Gerät in andere Reihe verschieben
- mehrere Geräte markieren
- Abstand / Reserve-TE einfügen
- Position sperren
- automatische Neuplatzierung nur der ungesperrten Geräte
- sichtbare TE-Skala
- Anzeige `belegt 27 / 36 TE`
- Warnung bei Kollision / Überbelegung

Die Oberfläche soll vermitteln, dass Frontansicht und Stromlaufplan **dieselben Geräteinstanzen** verwenden.

Wenn beispielsweise `-F12` im Aufbauplan ausgewählt wird, soll man mit einer Aktion `Im Stromlaufplan anzeigen` direkt zu seiner Schaltplanfunktion wechseln können.

## 6. Datenmanager

Entwirf eine tabellarische Ansicht ähnlich der Effizienz eines guten Tabellenprogramms.

Register:

- Betriebsmittel
- Klemmen
- Verbindungen
- Kabel
- SPS / I/O
- Material
- Potentiale
- Texte / Übersetzungen

Benötigt:

- sortieren
- filtern
- Spalten ein-/ausblenden
- Copy/Paste
- Mehrfachbearbeitung
- direkt editierbare Zellen
- Fehler-/Hinweisfilter
- Navigation zum Objekt im Plan

Rechts kann eine Projektprüfung angezeigt werden, z. B.:

- Artikel fehlt
- BMK doppelt
- Anschluss offen
- Verteilerreihe überbelegt
- Gerätebreite fehlt
- Potentialkonflikt

## 7. Automatische Dokumentation / PDF-Ausgabe

Entwirf eine Ansicht `Auswertungen / Dokumentation` bzw. einen Exportdialog.

Ein vollständiges Projekt kann enthalten:

- Deckblatt
- Inhaltsverzeichnis
- technische Spezifikationen
- Verteiler-/Schrankspezifikationen
- Frontansicht / Aufbauplan
- Einspeisung
- Stromlaufpläne
- Material-/Gerätestückliste
- Bestellliste
- Klemmenpläne
- Kabellisten
- Verdrahtungslisten

Der Benutzer soll per Checkbox/Reihenfolge bestimmen können, was in das PDF kommt.

Zeige eine Seitenvorschau sowie Einstellungen:

- farbig / monochrom
- PDF
- ausgewählte Seiten / komplettes Projekt
- Titelblockprofil
- Revision
- Papierformat

Das resultierende Dokument soll wie eine professionelle technische Projektdokumentation wirken.

## 8. Datenmodell im UI sichtbar machen – aber nicht kompliziert

Intern gilt:

```text
Symbol / Darstellung
        ↓
Funktion / Anschlusslogik
        ↓
Gerät / Betriebsmittel
        ↓
Artikel / Herstellerdaten
        ↓
Platzierungen und Auswertungen
```

Der Benutzer soll von dieser Leistungsfähigkeit profitieren, ohne mit Datenbankbegriffen überfordert zu werden.

Beispiel:

Ein Schütz `-K1` kann besitzen:

- Spule auf Seite 4
- Hilfskontakt auf Seite 5
- Leistungskontakte auf Seite 3
- einen Eaton-Artikel
- eine Position im Verteiler
- einen Eintrag in der Stückliste

Alle Darstellungen gehören zu **einem Gerät**.

Gestalte Navigation und Eigenschaften so, dass diese Zusammenhänge verständlich werden.

## 9. Bedienphilosophie

Bitte priorisiere typische Aktionen mit sehr wenigen Klicks.

Beispiele:

### Gerät einfügen

`Ctrl+K` oder Einfügen → `DILM17` → Enter → auf Plan platzieren

### Leitung zeichnen

Anschluss anklicken → orthogonalen Leiter ziehen → Anschluss anklicken

### Eigenschaften ändern

Objekt anklicken → rechts direkt ändern; kein unnötiger Dialog.

### Querverweis verfolgen

Hover zeigt Vorschau → Klick springt zum Ziel.

### Frontansicht erzeugen

`Frontansicht öffnen` → automatisch generieren → einzelne Geräte bei Bedarf per Drag & Drop korrigieren.

### Fehler beheben

Prüfung meldet `Reihe 3: 39 / 36 TE` → Klick → betroffene Reihe fokussieren → Geräte verschieben.

## 10. CAD-Interaktion

Berücksichtige:

- Mausrad: Zoom auf Cursor
- mittlere Maustaste oder Space+Drag: Pan
- Esc: Werkzeug abbrechen
- Entf: löschen
- Ctrl+Z / Ctrl+Shift+Z: Undo/Redo
- Ctrl+K: globale Suche
- Mehrfachauswahl mit Shift/Ctrl
- Raster / Fang
- temporäres Deaktivieren des Fangs per Modifier
- Inline-Eingabe während Platzierung

## 11. Visuelle Sprache

Gesucht wird ein Design, das wirkt wie eine moderne professionelle Engineering-Anwendung aus 2026+.

Eigenschaften:

- klar
- präzise
- technisch
- hochwertig
- nicht verspielt
- nicht übermäßig minimalistisch
- hohe Informationsdichte, aber klare Hierarchie
- moderne Icons
- kleine Radien statt übertriebener Kartenoptik
- Tabellen sollen echte Arbeitswerkzeuge sein, keine Marketing-Dashboards
- kompakte Controls
- gute Typografie
- große Zeichenfläche

Vermeide:

- riesige Karten und unnötigen Leerraum
- Mobile-App-Optik
- Webshop-Optik
- zu große Buttons
- übermäßige Schatten
- starke Farbverläufe
- komplett versteckte Profi-Funktionen
- überladene Ribbon-Menüs

## 12. Gewünschte Ergebnisse

Bitte erstelle mindestens folgende Ansichten in konsistenter Designsprache:

1. **Haupteditor – Light Mode**
2. **Haupteditor – Dark Mode mit hellem Zeichenbogen**
3. **optional Haupteditor – Full Dark Canvas**
4. **Einfügezentrum / Gerätedatenbank**
5. **Verteilerfrontansicht / Aufbauplan**
6. **Datenmanager + Projektprüfung**
7. **Projektzentrum / Startansicht**
8. **PDF-/Dokumentations-Export mit Seitenvorschau**

Wenn möglich zusätzlich:

9. Symbol-/Makroeditor
10. Klemmenmanager

### Zielauflösung

Desktop-Entwurf primär für ungefähr **1600 × 1000 bzw. 1920 × 1080**.

Die Anwendung muss auch auf 1366/1920 Full-HD-Arbeitsplätzen sinnvoll skalierbar bleiben.

## 13. Zweite Meinung ausdrücklich erwünscht

Übernimm die vorgegebenen Grundanforderungen, aber hinterfrage Details des Layouts kritisch.

Wenn du für einen Bereich eine bessere UX-Lösung siehst als das klassische Drei-Zonen-Layout, zeige diese als Alternative und erkläre kurz, warum sie besser sein könnte.

Insbesondere wünsche ich deine zweite Meinung zu:

- Ribbon vs. kontextabhängige Toolbar
- Eigenschaften dauerhaft rechts vs. dynamischer Inspector
- Projektbaum links vs. alternative Navigation
- Gestaltung der Geräte-/Artikelsuche
- Umgang mit Querverweisen
- Frontansicht-Automatik und manuelle Nachbearbeitung
- Farbigkeit im Stromlaufplan
- Dark Mode
- Informationsdichte für Power-User

Bitte optimiere nicht nur auf Ästhetik, sondern vor allem auf **echte tägliche Engineering-Arbeit mit möglichst wenigen Klicks**.

---

## Hinweise zur Auswertung

Das v0-Ergebnis soll später nicht ungeprüft übernommen werden. Es dient als unabhängiger UX-Gegenentwurf und wird mit dem bestehenden OpenE-CAD-Konzept verglichen.

Bewertungskriterien:

- Verständlichkeit beim ersten Start
- Klickwege für häufige Aufgaben
- Informationsdichte
- Geschwindigkeit für Power-User
- Qualität der Stromlaufplan-Arbeitsfläche
- Qualität des Geräteworkflows
- Frontansicht-Workflow
- Light/Dark-Konsistenz
- Eignung für Full-HD und Multi-Monitor
- Umsetzbarkeit als native Rust-Desktopanwendung
