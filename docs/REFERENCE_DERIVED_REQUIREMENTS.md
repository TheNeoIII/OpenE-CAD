# Anforderungen aus privaten ECAD-Referenzdokumenten

Stand: 14.10.2026

## Datenschutz / Ablage

Für die Produktdefinition wurden zwei vom Projektinhaber bereitgestellte private Beispiel-PDFs aus ELCAD und WSCAD analysiert.

**Die Original-PDFs werden bewusst nicht in diesem öffentlichen Repository gespeichert.**

Es werden ausschließlich abstrahierte, nicht personenbezogene Produktmerkmale dokumentiert. Namen, Adressen, Firmenangaben, Logos, Projekt-/Auftragsnummern, konkrete Kundeninformationen und sonstige identifizierende Inhalte der Beispieldokumente werden nicht übernommen.

## 1. Vollständige PDF-Projektdokumentation

OpenE-CAD soll ein vollständiges Projekt als zusammenhängende, druckfähige PDF-Dokumentation ausgeben können. Relevante Seitentypen sind insbesondere:

- Deckblatt
- Inhaltsverzeichnis
- technische Projektdaten / technische Spezifikationen
- Verteiler-/Schrankspezifikationen
- Verteilerfrontansicht / Aufbauplan
- Einspeisung
- mehrseitige Stromlaufpläne
- Gerätestückliste / Materialliste
- Bestellliste
- Klemmenpläne
- Kabellisten
- Verdrahtungslisten
- weitere automatisch erzeugte Auswertungen

### Anforderungen an den PDF-Export

- Vektor-PDF wo technisch möglich
- Text im PDF soll durchsuchbar bleiben
- frei definierbare Seitenrahmen und Titelblöcke
- automatische Seitenzählung und Inhaltsverzeichnis
- Seitenkoordinaten / Rasterbezüge für Querverweise
- Ausgabe wahlweise farbig oder monochrom
- Farben im Stromlaufplan müssen bei farbigem Export erhalten bleiben
- saubere Linien- und Schriftqualität unabhängig vom Bildschirmzoom
- konfigurierbare Auswahl der zu exportierenden Seitentypen
- komplette Projektausgabe oder Teilbereich
- Wiederholbarkeit: gleiche Projektdaten sollen reproduzierbare Ausgaben erzeugen

Perspektivisch sinnvoll:

- klickbare Inhaltsverzeichnis-Einträge
- klickbare Querverweise zwischen Seiten
- PDF-Metadaten
- Revisionsmarkierungen

## 2. Verteilerfrontansicht / Aufbauplan

Neben dem Stromlaufplan wird eine eigene editorierbare Verteilerfrontansicht benötigt.

Diese Ansicht ist von einem späteren vollständigen 2D-/3D-Schaltschrank-Engineering zu unterscheiden. Sie soll bereits früh eine praxisnahe Dokumentation von Installationsverteilern ermöglichen.

### Grundmodell

Ein Verteiler besteht beispielsweise aus:

- Gehäuse / Verteiler
- Außenabmessungen
- Tür / Frontabdeckung optional
- mehreren Reihen
- Hutschienen / Gerätezeilen
- definierter nutzbarer Breite je Reihe
- Teilungseinheiten (TE) je Reihe
- eingebauten Geräten
- Reserve-/Blindfeldern
- Beschriftungen

### Geräteattribute für die Frontansicht

Artikel bzw. Geräte sollen zusätzliche mechanische Daten besitzen können:

- Breite in TE
- Breite in mm
- Höhe in mm
- Tiefe in mm
- bevorzugte Montageart
- Einbauort
- Verteiler / Feld
- Reihe
- optionale feste Position innerhalb einer Reihe
- Frontdarstellung / 2D-Footprint
- Zubehör, das zusätzlichen Platz benötigt

Als Standard kann eine TE-Basisbreite von 17,5 mm verwendet werden; das Profil soll jedoch konfigurierbar bleiben.

### Automatische Generierung

Die Frontansicht soll automatisch aus den vorhandenen Projektdaten erzeugt werden können.

Beispiel:

1. Geräte besitzen `Einbauort`, `Verteiler`, `Reihe` und `Breite_TE`.
2. OpenE-CAD gruppiert die Geräte nach Verteiler und Reihe.
3. Die Geräte werden in einer sinnvollen Reihenfolge auf der jeweiligen Reihe platziert.
4. Der benötigte und freie TE-Platz wird berechnet.
5. Überbelegung wird als Fehler angezeigt.
6. Nicht zuordenbare Geräte werden als Hinweis gelistet.

### Manuelle Nachbearbeitung

Automatik darf die manuelle Kontrolle nicht verhindern.

Benötigt werden:

- Drag & Drop innerhalb einer Reihe
- Verschieben zwischen Reihen
- Mehrfachauswahl
- Einfügen von freien TE / Reservefeldern
- Position sperren
- automatische Platzierung nur für nicht gesperrte Geräte erneut ausführen
- Ausrichten / Verteilen
- Beschriftung bearbeiten
- Geräteposition numerisch anpassen
- optional sichtbare TE-Skala
- Warnung bei Kollision oder Überbreite

Ein manuell verschobenes Gerät behält weiterhin die Verknüpfung zu seiner Geräteinstanz im Stromlaufplan.

### Synchronisation

Änderungen müssen nachvollziehbar synchronisiert werden:

- Artikelbreite geändert → Frontansicht neu prüfen
- Gerät gelöscht → Platzierung entfernen / als verwaist markieren
- Reihe geändert → automatische Verschiebeoption anbieten
- BMK geändert → Beschriftung aktualisieren
- neues Gerät mit Einbauort/Reihe → als noch nicht platzierte Komponente anzeigen

## 3. Farbige Potential- und Leitungsdarstellung

Eine wichtige UX-Anforderung ist, dass ein Stromlaufplan nicht ausschließlich aus schwarzen Linien bestehen muss.

Die Farbdarstellung dient als **visuelle Orientierung** und muss vom eigentlichen elektrischen Datenmodell getrennt bleiben.

### Beispiel für ein Standard-Farbprofil

- Außenleiter / allgemeiner Hauptstrom: schwarz bzw. dunkel
- Neutralleiter `N`: blau
- Schutzleiter `PE`: grün bzw. grün/gelb-nahe Darstellungsfarbe
- ausgewählte Steuer-/Sonderpotentiale: konfigurierbare Akzentfarben
- Querverweise / Fortsetzungsverweise: dezente Kontrastfarbe

Wichtig:

- Farben sind konfigurierbar
- Potentialtyp und Darstellungsfarbe sind getrennte Eigenschaften
- Status darf niemals ausschließlich über Farbe vermittelt werden
- Light- und Dark-Theme benötigen jeweils abgestimmte Farbsätze
- monochromer PDF-Export muss weiterhin lesbar bleiben
- Linienart und Beschriftung ergänzen die Farbcodierung

## 4. Querverweise und Seitenfortsetzungen

Aus den Referenzdokumenten ergibt sich, dass Seitenfortsetzungen und Querverweise ein zentrales Navigations- und Dokumentationselement sind.

OpenE-CAD soll daher:

- Potentialfortsetzungen über Seitengrenzen automatisch verwalten
- Zielseite und Rasterkoordinate anzeigen können
- Querverweise automatisch aktualisieren
- im Editor einen Klick zur Zielstelle ermöglichen
- im PDF perspektivisch klickbare Sprungziele unterstützen
- Referenzen optional farblich hervorheben

## 5. Automatisch erzeugte Listen

Aus dem Datenmodell sollen ohne manuelle Doppelpflege erzeugt werden können:

### Stück-/Materialliste

Typische Spalten:

- Position
- BMK
- Benennung
- Hersteller
- Typ
- Artikel-/Bestellnummer
- Menge
- Platzierung / Seite
- Einbauort

### Bestellliste

Gleiche Artikel werden aggregiert und nach Hersteller / Bestellnummer zusammengeführt.

### Klemmenplan

Soll aus den im Stromlaufplan vorhandenen Klemmen und Verbindungen generiert werden und mindestens unterstützen:

- Klemmennummer
- interne und externe Ziele
- Anschlüsse
- Brücken
- PE/N-Funktionen
- Seiten-/Pfadangabe
- Kabelbezug

### Kabelliste

Soll Kabel, Adern, Ziele und relevante Artikeldaten automatisch zusammenstellen.

## 6. Konsequenz für das Datenmodell

Die neuen Anforderungen bestätigen das zentrale OpenE-CAD-Prinzip:

```text
Grafische Darstellung
        ↓
Funktion / Anschluss
        ↓
Gerät / Betriebsmittel
        ↓
Artikel / mechanische Daten
        ↓
Platzierung Stromlaufplan + Platzierung Frontansicht
        ↓
Auswertungen / PDF
```

Eine Geräteinstanz kann deshalb mehrere Darstellungen besitzen:

- eine oder mehrere Schaltplanfunktionen
- Frontansicht / Verteilerplatzierung
- später Montageplatten-/Schaltschrankdarstellung
- Listen-/Auswertungsdatensatz

Alle Darstellungen beziehen sich auf dieselbe Geräteinstanz und denselben Artikelstamm.
