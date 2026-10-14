# v0 UI/UX Review – Designiteration 2

Stand: 14.10.2026

## Status

Der von v0 erzeugte interaktive Frontend-Prototyp wurde anhand der drei Haupteditor-Screenshots sowie des vollständigen ZIP-Exports geprüft.

**Entscheidung:** Der Entwurf wird als bevorzugte UI/UX-Richtung für OpenE-CAD übernommen und dient ab jetzt als zweite Designiteration / Referenzbasis. Der Next.js/React-Code ist ausschließlich Designprototyp und wird nicht als spätere Produktivbasis betrachtet. Die eigentliche Anwendung bleibt als eigenständige Rust-Neuentwicklung geplant.

## Besonders überzeugende Entscheidungen

### Arbeitsbereiche

Die obere Hauptnavigation ist kompakt und fachlich nachvollziehbar:

- Projekt
- Stromlaufplan
- Aufbau
- Daten
- Dokumentation

Sie trennt Arbeitskontexte klar, ohne eine große Ribbon-Leiste zu benötigen.

### Haupteditor

Beibehalten werden soll:

- Seiten-/Navigatorbereich links
- große zentrale Zeichenfläche
- permanenter Eigenschaften-/Prüf-Inspector rechts
- kompakte Werkzeugleiste oberhalb des Plans
- globale Suche / Command Palette über `Ctrl+K`
- Statusleiste mit Raster, Fang, Zoom, Werkzeug, Auswahl und Prüfergebnis
- sichtbare Seitennavigation
- direkte Aktion `Im Aufbau` für das ausgewählte Gerät

### Theme-System

Der Prototyp bestätigt die geplanten drei Arbeitsmodi:

1. Light Mode
2. Dark UI + heller Zeichenbogen
3. Full Dark Canvas

**Bevorzugter Standard für Dark Mode:** dunkle Anwendung mit hellem Zeichenbogen.

Der Full-Dark-Canvas bleibt eine optionale Arbeitsansicht für lange Bildschirmarbeit. Export und Druckdarstellung bleiben unabhängig vom UI-Theme.

### Potential- und Verweisfarben

Die zurückhaltende Farbcodierung funktioniert visuell gut:

- Hauptstrom neutral
- N blau
- PE grün
- Steuer-/Sonderpotentiale mit eigener dezenter Farbe
- Querverweise / Seitenfortsetzungen orange
- Auswahl / aktive Geräte cyan

Farbe bleibt eine Darstellungsoption des Potentialtyps und kein fachlich hart codiertes Merkmal.

Für monochrome Ausgabe müssen zusätzlich eindeutige Linienstile / Kennzeichnungen vorgesehen werden.

### Aufbau / Verteilerfront

Der v0-Prototyp enthält bereits wesentliche Anforderungen:

- automatische Generierung aus Gerätedaten
- TE-Bilanz je Reihe
- Drag & Drop zwischen Reihen
- 1-TE- und 1/2-TE-Schritte
- Mehrfachauswahl
- Reserve-/Blindfelder
- Position sperren
- Neu-Layout mit Respekt vor gesperrten Geräten
- Liste nicht platzierter Geräte
- Aufbau-Prüfung
- direkte Navigation `Im Stromlaufplan anzeigen`

Diese Interaktionsrichtung wird übernommen.

### Datenmanager

Positiv und beizubehalten:

- tabellenartige Power-User-Bedienung
- direkte Zellbearbeitung
- Tastaturnavigation
- Copy/Paste
- Mehrfachbearbeitung
- Filter `Nur mit Befunden`
- Suchen/Ersetzen
- frei ein-/ausblendbare Spalten
- Projektprüfung als dauerhaft sichtbare Seitenleiste

### Dokumentation

Der Prototyp deckt die richtige Richtung ab:

- Dokumentstruktur links
- Seitenvorschau zentral
- Exporteinstellungen rechts
- PDF als primäres Ausgabeformat
- zusätzliche Formate perspektivisch möglich
- Papierformat / Revision / Querverweise als Einstellungen
- Export trotz Prüfbefunden möglich, aber als vorläufig kennzeichnbar

## Vor der Rust-Implementierung noch verfeinern

### 1. Verteilergeometrie nicht fest codieren

Der Prototyp arbeitet beispielhaft mit `4 × 36 TE`. Im Produkt muss die Geometrie aus dem Verteiler-/Gehäusedatensatz kommen:

- Anzahl Reihen frei
- TE-Kapazität pro Reihe frei
- unterschiedliche Kapazität je Reihe möglich
- Teilungseinheit und reale mm-Abmessung getrennt
- Gerätebreite in TE und mm
- optionale seitliche / obere / untere Montagebereiche

### 2. Navigatorbreite / lange Seitennamen

Bei schmalem Navigator werden Seitentitel gekürzt. Geplant:

- Panelbreite veränderbar
- Tooltip für abgeschnittene Titel
- optional kompakte und komfortable Dichte
- Suche / Filter bleibt dauerhaft leicht erreichbar

### 3. Monochrome Lesbarkeit tatsächlich umsetzen

Nicht nur Farben entfernen. Für S/W-Druck und Barrierefreiheit:

- Potentiale optional über Linienstile unterscheiden
- Symbole / Texte dürfen sich nicht ausschließlich auf Farbe verlassen
- Querverweise auch in Schwarz eindeutig kennzeichnen

### 4. Potentialfarben als Profil

Farbregeln sollen konfigurierbar und projekt-/firmenprofilfähig sein, z. B.:

- N = Blau
- PE = Grün
- 24 V DC = Blau / Rot nach Profil
- Steuerstrom = Rot
- Fremdspannung = Orange / Violett

Das Norm-/Firmenprofil definiert Defaults; einzelne Netze können abweichend formatiert werden.

### 5. Seitennummerierung konsistent aus einem Modell

Navigator, Statusnavigation, Titelblock, Inhaltsverzeichnis und PDF-Seitenzahl müssen aus derselben Projekt-/Dokumentstruktur gespeist werden. Im Prototyp sind Beispielwerte teilweise unabhängig voneinander.

### 6. Titelblock als Template

Der gezeigte Titelblock ist eine gute Darstellungsreferenz, muss aber vollständig templatebasiert werden:

- eigene Firmenvorlagen
- Logo
- Projektfelder
- Kunde
- Anlage / Ort
- Seitentyp
- Bearbeiter / Prüfer
- Revision
- Papierformat
- automatische Felder

### 7. Panels perspektivisch dockbar

Für Multi-Monitor- und Power-User-Szenarien:

- Navigator und Inspector ein-/ausblendbar
- Breite veränderbar
- später optional abdockbar
- Workspace-Layouts speicherbar

## Designentscheidung

Der v0-Entwurf ersetzt nicht alle bisherigen Mockups, sondern konkretisiert sie. Für die weitere Spezifikation gilt daher:

> Die v0-Haupteditor-Richtung mit kompakter Top-Navigation, schmaler Werkzeugleiste, linkem Navigator, großem Dokument-Canvas, rechtem dynamischen Inspector, farbcodierten Potentialen und drei Theme-Modi ist die aktuelle bevorzugte OpenE-CAD-Designbasis.

## Nächster UI-Schritt

Vor dem ersten Rust-UI-Spike sollen noch die folgenden Ansichten visuell finalisiert bzw. aus dem Prototyp in ein konsistentes Designsystem überführt werden:

- Aufbau / Verteilerfront
- Einfügezentrum
- Datenmanager
- Dokumentation / PDF-Export
- Projektzentrum
- Klemmenmanager
- Symbol-/Makroeditor

Danach: Design Tokens (Farben, Typografie, Abstände, Icons, Zustände) festlegen und die Rust-UI-Evaluierung gegen diese Referenz durchführen.
