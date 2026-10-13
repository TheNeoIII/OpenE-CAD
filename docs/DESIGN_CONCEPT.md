# UI/UX- und Designkonzept

Stand: 13.10.2026

## Designziel

OpenE-CAD soll wie ein modernes Engineering-Werkzeug wirken, nicht wie ein historisch gewachsenes CAD mit dauerhaft sichtbaren Funktionsleisten. Die Oberfläche muss für erfahrene Elektrotechniker schnell sein, gleichzeitig aber für neue Anwender verständlich bleiben.

## Designprinzipien

### 1. Arbeitsfläche im Mittelpunkt
Der Stromlaufplan ist der wichtigste Bereich. Navigatoren und Inspektoren unterstützen die Arbeit, dürfen den Canvas aber nicht dominieren.

### 2. Drei-Zonen-Layout
Standardlayout:

```text
┌───────────────────────────────────────────────────────────────┐
│ Menü / Modi / globale Suche                                  │
├───────────────┬───────────────────────────┬───────────────────┤
│ Projekt /     │                           │ Eigenschaften /   │
│ Navigatoren   │      Zeichenfläche        │ Prüfung / Details │
│               │                           │                   │
├───────────────┴───────────────────────────┴───────────────────┤
│ Status / Raster / Fang / Prüfung / Zoom                       │
└───────────────────────────────────────────────────────────────┘
```

Alle Seitenpanels sollen ein-/ausblendbar, in der Breite veränderbar und perspektivisch dockbar sein.

### 3. Kontextabhängige Werkzeugleiste
Oben gibt es wenige Hauptmodi, beispielsweise:

- Projekt
- Zeichnen
- Einfügen
- Daten
- Auswertungen
- Prüfen
- Ansicht

Darunter erscheint eine kompakte Werkzeugleiste passend zum aktiven Modus und zur Auswahl.

Beispiele:

- Leitung markiert → Potential, Querschnitt, Farbe, Nummerierung, Routing
- Gerät markiert → BMK, Funktion, Artikel, Querverweise
- Text markiert → Inhalt, Sprache, Stil, Platzhalter
- Seite markiert → Rahmen, Raster, Seitentyp, Titelblock

### 4. Globales Einfügen und Suchen
Ein zentrales Einfügezentrum kombiniert Symbol-, Makro- und Artikelsuche. Anwender sollen nicht vorher wissen müssen, in welcher Datenbank oder Bibliothek ein Objekt liegt.

Suchbeispiele:

- `Schütz 24 VDC 18 A`
- `DILM17`
- `NOT-HALT`
- `SPS Ausgang`
- `Klemme PE`

Ergebnisgruppen können sein:

- Geräte
- Symbole
- Makros
- eigene Favoriten
- zuletzt verwendet

## Light Mode

Der aktuelle erste Entwurf verwendet:

- helle Arbeitsflächen
- neutrale graue Panels
- weißen Zeichenbogen
- blau als primäre Interaktionsfarbe
- grün für gültig/OK
- orange für Hinweise
- rot für Fehler

Der Schaltplan selbst soll möglichst drucknah bleiben und deshalb auch im Light Mode nur zurückhaltend eingefärbt werden.

## Dark Mode

Dark Mode ist eine feste Anforderung und wird als gleichwertiges Theme geplant.

Wichtig: Nicht einfach alle Farben invertieren.

### Vorgesehene Regeln

- Hauptfenster: dunkles Anthrazit statt Schwarz
- Panels: leicht voneinander abgestufte dunkle Flächen
- Text: gebrochenes Weiß statt reines Weiß
- Canvas-Hintergrund: dunkler Arbeitsbereich
- Zeichenbogen standardmäßig weiterhin hell **oder optional dark-canvas**
- Raster muss in beiden Varianten klar, aber nicht dominant sein
- Auswahlfarbe: kräftiges Blau/Cyan
- Statusfarben mit ausreichendem Kontrast
- Symbole und Leiter müssen unabhängig vom Theme lesbar bleiben

### Zwei Canvas-Modi im Dark Theme

**A. Dark UI + heller Plan**

Empfohlener Standard für klassische Stromlaufplanarbeit. Die Anwendung ist dunkel, der eigentliche Plan entspricht weitgehend der späteren Druckausgabe.

**B. Dark UI + dunkler Plan**

Optional für lange Bildschirmarbeit. Die Darstellung wird thematisch angepasst, der Export bleibt normgerecht und druckorientiert.

## Haupteditor

Links:

- Seiten-/Projektbaum
- umschaltbare Navigatoren für Betriebsmittel, Klemmen, Kabel, SPS, Kommentare

Mitte:

- Infinite/Document Canvas
- Seitenrahmen
- Raster und Fang
- orthogonale Leitungen
- Handles für Leitungswege
- Auswahlrahmen
- Mehrfachauswahl
- Zoom und Pan

Rechts:

- Eigenschaften
- Gerätestatus
- Artikelinformationen
- Querverweise
- Online-Prüfung

## Einfügezentrum

Dreiteilig:

1. Filter / Bibliotheken / Hersteller
2. Suchergebnisse
3. Geräte-/Symbolvorschau

Bei einem Geräteartikel sollen direkt sichtbar sein:

- Hersteller
- Typ
- Artikelnummer
- elektrische Eckdaten
- verfügbare Funktionsschablonen
- Symbole
- Makros
- Zubehör
- Datenqualität / Quelle

## Datenmanager

Tabellarische Ansicht für schnelle Massenbearbeitung.

Geplante Register:

- Betriebsmittel
- Klemmen
- Verbindungen
- Kabel
- SPS / I/O
- Material
- Potentiale
- Texte / Übersetzungen

Anforderungen:

- Spalten frei konfigurierbar
- sortieren / filtern
- Mehrfachbearbeitung
- Copy/Paste wie in Tabellenprogrammen
- direkte Navigation zur Platzierung
- Fehler-/Hinweisfilter

## Projektprüfung

Die Prüfung soll permanent im Hintergrund des Datenmodells möglich sein und Probleme verständlich formulieren.

Beispiele:

- fehlender Artikel
- doppelte BMK
- unvollständige Funktionsschablone
- offener Anschluss
- unzulässige Potentialverbindung
- doppelte SPS-Adresse
- nicht platzierte Klemme
- Kabelader mehrfach verwendet

Jeder Hinweis erhält eine direkte Aktion wie „anzeigen“, „korrigieren“, „Artikel wählen“ oder „ignorieren“.

## Symbol- und Makroeditor

Der Editor verwaltet nicht nur Grafik, sondern semantische Eigenschaften:

- Anschlussname
- Anschlusstyp
- Richtung
- elektrischer Typ
- Funktionsklasse
- Standard-BMK-Kennbuchstabe
- Platzhaltertexte
- Varianten
- Funktionsschablonen

## Projektzentrum

Startansicht mit:

- Neues Projekt
- letzte Projekte
- Vorlagen
- Bibliotheken
- Herstellerdaten
- Standards & Regeln
- Einstellungen

Projektvorlagen z. B.:

- IEC Maschinenbau
- Schaltschrank
- Gebäude / Verteilung
- SPS-Anlage
- Leeres Projekt

## Tastatur und Maus

Ziel: CAD-typische Präzision ohne unnötige Moduswechsel.

Vorgesehene Grundregeln:

- Mausrad: Zoom auf Cursor
- mittlere Maustaste / Space+Drag: Pan
- Esc: aktuelles Werkzeug abbrechen
- Entf: Auswahl löschen
- Ctrl+Z / Ctrl+Shift+Z: Undo / Redo
- Ctrl+K: globale Suche / Command Palette
- Fänge temporär per Modifier steuerbar
- Tab: während Platzierung durch relevante Werte springen

Die endgültigen Shortcuts werden erst nach Definition der Zeichen-Workflows festgelegt.

## Barrierefreiheit und Skalierung

- hohe DPI-Auflösungen berücksichtigen
- UI-Skalierung unabhängig vom Zeichnungszoom
- ausreichend große Klickziele
- Status nie ausschließlich über Farbe ausdrücken
- konfigurierbare Schrift-/Icon-Größe prüfen
- Light/Dark mit ausreichendem Kontrast testen
