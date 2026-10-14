# OpenE-CAD Designsystem

Stand: 14.10.2026  
Status: **Designiteration 2 – erste verbindliche Spezifikation**

Dieses Dokument leitet das Designsystem aus der bevorzugten v0-UI/UX-Richtung ab. Die Werte sind die Ausgangsbasis für den späteren Rust-UI-Spike und werden bei der technischen Umsetzung gegen reale DPI-Skalierung, Rendering und Barrierefreiheit validiert.

Das Designsystem ist bewusst **frameworkneutral**. Es beschreibt Semantik, Maße, Zustände und visuelle Regeln – nicht CSS oder eine bestimmte Rust-UI-Bibliothek.

---

## 1. Gestaltungsprinzipien

1. **Der technische Inhalt dominiert.** Die Zeichenfläche, Tabelle oder Dokumentvorschau erhält mehr Raum als Navigation und Chrom.
2. **Kompakt statt luftig.** OpenE-CAD ist ein Engineering-Werkzeug; Informationsdichte ist erwünscht, solange Hierarchie und Lesbarkeit erhalten bleiben.
3. **Kontext statt Ribbon.** Eine schmale Werkzeugleiste reagiert auf Arbeitsbereich, Werkzeug und Auswahl.
4. **Ein Gerät, viele Sichten.** Stromlaufplan, Aufbau, Tabellen und Dokumentation zeigen unterschiedliche Sichten auf dieselben Datenobjekte.
5. **Farbe unterstützt, ersetzt aber keine Information.** Potentiale, Fehler und Auswahlzustände bleiben auch monochrom unterscheidbar.
6. **Dark Mode ist kein invertierter Light Mode.** Kontraste, Linien, Raster und Statusfarben erhalten eigene Theme-Werte.
7. **Direkte Bearbeitung vor modalen Dialogen.** Eigenschaften werden nach Möglichkeit im Inspector oder in Tabellenzellen geändert.
8. **Fehler dort anzeigen, wo sie behoben werden.** Befunde müssen zum betroffenen Objekt navigieren und dessen Kontext fokussieren.

---

## 2. Hauptlayout

Die bevorzugte Grundstruktur lautet:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ App-Bar: Projekt | Stromlaufplan | Aufbau | Daten | Dokumentation | Suche   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Kontext-Toolbar                                                               │
├──────────────┬──────────────────────────────────────────────┬─────────────────┤
│ Navigator    │                                              │ Inspector       │
│ / Struktur   │               Arbeitsfläche                  │ Eigenschaften   │
│              │                                              │ / Prüfung       │
├──────────────┴──────────────────────────────────────────────┴─────────────────┤
│ Statusleiste                                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 App-Bar

Zielhöhe bei 100 % UI-Skalierung: **36 px**.

Enthält:

- Projektname / Projektkennung links
- Hauptarbeitsbereiche
- globale Suche / Command Palette zentral oder leicht rechts der Mitte
- Theme / Hilfe / Benutzer- bzw. Workspace-Aktionen rechts

Die Hauptarbeitsbereiche sind:

- **Projekt**
- **Stromlaufplan**
- **Aufbau**
- **Daten**
- **Dokumentation**

Aktiver Bereich wird durch Akzentfarbe und/oder Unterstreichung markiert. Keine großen Ribbon-Tabs.

### 2.2 Kontext-Toolbar

Zielhöhe: **36–40 px**.

Regeln:

- primäre Werkzeuge links
- kontextuelle Aktionen neben dem aktiven Werkzeug
- Undo/Redo dauerhaft erreichbar
- seltene Optionen über Overflow-Menü
- Buttonhöhe 28–30 px
- Icons 16–18 px
- Text nur, wenn er die Erkennbarkeit verbessert

### 2.3 Linker Navigator

Standardbreite: **240 px**.  
Sinnvoller Bereich: **200–420 px**.

Anforderungen:

- frei in der Breite veränderbar
- vollständig einklappbar
- abgeschnittene Texte erhalten Tooltip
- aktive Zeile klar markiert
- verschachtelte Strukturen mit geringer Einrückung
- eigene Such-/Filterzeile
- später optional abdockbar

### 2.4 Rechter Inspector

Standardbreite: **300 px**.  
Sinnvoller Bereich: **280–440 px**.

Register mindestens:

- **Eigenschaften**
- **Prüfung**

Je nach Objekt können weitere Register hinzukommen, z. B. Verbindungen, Querverweise oder Artikel.

Eigenschaftsgruppen sind einklappbar und verwenden ein zweispaltiges Raster: Bezeichnung links, Wert rechts.

### 2.5 Statusleiste

Zielhöhe: **22–26 px**.

Typische Inhalte:

- Speichestatus
- X/Y bzw. Cursor-/Objektkoordinate
- Zoom
- Raster
- Fangzustand
- aktives Werkzeug
- aktuelle Auswahl
- Fehler-/Warnungszähler
- Sprache / Normprofil

---

## 3. Dichte und Raster

### 3.1 UI-Abstandsskala

Basiseinheit: **4 px**.

```text
space-1 = 4 px
space-2 = 8 px
space-3 = 12 px
space-4 = 16 px
space-5 = 24 px
space-6 = 32 px
space-7 = 48 px
```

Engineering-Oberflächen verwenden überwiegend 4, 8 und 12 px. 24+ px nur zwischen größeren Bereichen.

### 3.2 Radien

```text
radius-xs = 2 px
radius-sm = 4 px
radius-md = 6 px
radius-lg = 8 px
```

Standardbuttons und Eingabefelder: **4 px**.  
Karten / größere Overlays: maximal **6–8 px**.

Keine stark gerundeten „Mobile-App“-Elemente.

### 3.3 Tabellen

Standardzeilenhöhe:

- kompakt: **28 px**
- normal: **32 px**

Tabellenkopf: **32 px**.

Spalten werden möglichst datenorientiert dimensioniert. Numerische Werte rechtsbündig, Identifikatoren und Texte linksbündig.

---

## 4. Typografie

### 4.1 Schriftfamilie

Primär: **native System-UI-Schrift** der Plattform. Dadurch gute Lesbarkeit, native Darstellung und keine zwingende Font-Abhängigkeit.

Geeignete Fallback-Klasse:

```text
system-ui / Segoe UI / Inter / Noto Sans / sans-serif
```

Monospace nur dort, wo technische Identifikatoren oder strukturierte Werte davon profitieren:

```text
BMK, Anschlusskennzeichen, SPS-Adressen, Koordinaten, Artikelcodes optional
```

### 4.2 Größen

Bei 100 % UI-Skalierung:

```text
caption        10–11 px
small          11–12 px
body           12–13 px
body-strong    12–13 px semibold
section        13–14 px semibold
panel-title    14–15 px semibold
view-title     16–18 px semibold
```

Große Marketing-/Dashboard-Typografie wird vermieden.

### 4.3 Zahlen

Wo möglich tabellarische Ziffern verwenden, insbesondere für:

- TE-Auslastung
- Koordinaten
- Seitenzahlen
- elektrische Werte
- Artikelnummern
- Revisionsstände

---

## 5. Farbsemantik

Die Farbwerte sind **Startwerte**, keine normativen elektrischen Festlegungen. Potentialtyp und Darstellungsfarbe bleiben getrennte Eigenschaften.

### 5.1 Interaktionsfarben

```text
accent-primary          #0B9CC1
accent-primary-hover    #0786A7
accent-primary-active   #066F8C
selection-outline       #11A7CC
focus-ring              #1FAFD2
```

Cyan/Blau bleibt der primäre Interaktionsakzent, weil er sich in Light und Dark klar von technischen Potentialfarben und Befundfarben unterscheiden lässt.

### 5.2 Statusfarben

```text
status-ok               #2E9B55
status-info             #2C82C9
status-warning          #D99A1B
status-error            #D84A4A
status-muted            #7B858E
```

Status wird immer zusätzlich mit Icon, Text oder Form dargestellt.

### 5.3 Technische Standardfarben

Default-Profil:

```text
potential-phase         theme.neutral-line
potential-neutral       #1677D2
potential-pe            #27884A
potential-control       #D45454
potential-special       #8C63C7
cross-reference         #E97922
active-object           #0AA6C7
```

Diese Werte sind UI-/Projektprofil-Defaults. Firmen- und Projektprofile dürfen sie ändern.

---

## 6. Theme-Tokens

### 6.1 Light

```text
window-bg               #F0F2F3
appbar-bg               #F7F8F9
toolbar-bg              #FAFBFC
panel-bg                #FFFFFF
panel-bg-secondary      #F5F6F7
canvas-workspace        #E4E7E9
document-bg             #FFFFFF
text-primary            #1D2328
text-secondary          #5E6871
text-disabled           #9AA2A8
border-default          #D4D9DD
border-strong           #B8C0C6
grid-minor              #E7EBED
grid-major              #D7DDE1
neutral-line            #202427
```

### 6.2 Dark UI + heller Plan

Dies ist der **bevorzugte Dark-Standard**.

```text
window-bg               #151719
appbar-bg               #1A1D1F
toolbar-bg              #1D2022
panel-bg                #202326
panel-bg-secondary      #25292C
canvas-workspace        #101214
document-bg             #FFFFFF
text-primary            #E8ECEF
text-secondary          #AAB2B8
text-disabled           #6F777D
border-default          #34393D
border-strong           #484F54
grid-minor              #E7EBED   (auf hellem Dokument)
grid-major              #D7DDE1   (auf hellem Dokument)
neutral-line            #202427   (auf hellem Dokument)
```

Der Zeichenbogen bleibt drucknah. Canvas-Chrom, Navigatoren und Inspector sind dunkel.

### 6.3 Full Dark Canvas

Optionaler Arbeitsmodus.

```text
document-bg             #1B1E20
document-border         #4A5055
grid-minor              #252A2D
grid-major              #30363A
neutral-line            #D5DADD
text-on-document        #DDE2E5
```

Potentialfarben erhalten für diesen Modus hellere Varianten, damit sie nicht absaufen.

Export-/Druckfarben werden **nicht** aus dem aktuellen UI-Theme abgeleitet.

---

## 7. Canvas / Stromlaufplan

### 7.1 Dokumentdarstellung

- Arbeitsbereich außerhalb des Dokuments klar vom Blatt trennen
- Dokumentrand dünn, ohne starken Schatten
- Seitengröße physisch maßstabstreu zum gewählten Papierformat darstellen
- Titelblock und Rahmen sind Teil des Dokuments, nicht der UI

### 7.2 Raster

Raster besitzt mindestens zwei Ebenen:

- Minor Grid
- Major Grid

Regeln:

- bei kleinem Zoom Minor Grid ausblenden
- Major Grid nie dominanter als technische Linien
- Raster ist reine Arbeitshilfe und standardmäßig nicht Bestandteil des Exports

### 7.3 Auswahl

Ausgewählte Objekte:

- Akzent-Outline
- dezente transparente Füllung nur bei flächigen Objekten
- Handles klar sichtbar
- Anschluss-/Fangpunkte getrennt vom Auswahlrahmen darstellen

Mehrfachauswahl erhält gemeinsamen Rahmen, Einzelobjekte können zusätzlich eigene Anker anzeigen.

### 7.4 Hover

Hover darf bestehende technische Farbe nicht komplett überschreiben. Bevorzugt:

- dünner Glow/Outline
- leicht erhöhte Linienhelligkeit
- optional kompakter Tooltip

### 7.5 Leitungswerkzeug

Während des Zeichnens:

- aktiver Startanschluss hervorgehoben
- Fangziele zeigen sichtbaren Snap-Zustand
- Vorschauleitung gestrichelt oder akzentuiert
- orthogonale Knickpunkte sichtbar
- Esc bricht ab
- Backspace entfernt den letzten Zwischenpunkt
- Enter bestätigt nur, wenn fachlich sinnvoll

---

## 8. Navigatoren

Navigator-Register im Stromlaufplan:

- Seiten
- Betriebsmittel
- Klemmen
- Kabel
- SPS

Regeln:

- gleiche Panelstruktur für alle Navigatoren
- Suche/Filter an gleicher Position
- Kontextmenü und Doppelklick konsistent
- Status-/Befundpunkte rechts an der Zeile
- Zielnavigation bei Aktivierung
- Pfad / Hierarchie über Einrückung und optional Breadcrumb

Markierungen:

- aktiv: Akzenthintergrund + Akzentkante
- Fehler: roter Punkt/Icon
- Warnung: gelber Punkt/Icon
- nicht platziert: spezielles neutrales Symbol

---

## 9. Inspector

### 9.1 Eigenschaften

Eigenschaften werden semantisch gruppiert, z. B.:

- Kennzeichnung
- Artikel
- elektrische Daten
- mechanische Daten
- Platzierung
- Darstellungen / Vorkommen

Regeln:

- direkt editierbar, wenn sicher
- Dropdown nur für echte Auswahllisten
- Einheit separat und dezent anzeigen
- lange Werte vollständig über Tooltip / Expand sichtbar
- geerbte oder automatisch berechnete Werte kennzeichnen

### 9.2 Prüfung

Befundzeile enthält:

- Schweregrad
- Kurztext
- betroffenes Objekt
- direkte Aktion

Typische Aktionen:

- Anzeigen
- Korrigieren
- Artikel wählen
- Im Aufbau öffnen
- Im Stromlaufplan öffnen
- Ignorieren / Ausnahme definieren, falls fachlich zulässig

---

## 10. Datenmanager

Tabs:

1. Betriebsmittel
2. Klemmen
3. Verbindungen
4. Kabel
5. SPS / I/O
6. Material
7. Potentiale
8. Texte / Übersetzungen

### 10.1 Tabellenverhalten

- Ein-Zellen-Fokus sichtbar
- Mehrfachauswahl deutlich getrennt von aktuellem Zellfokus
- direkte Bearbeitung per F2 / Doppelklick / Tippen
- Enter übernimmt und bewegt Fokus
- Esc verwirft aktuelle Zelländerung
- Copy/Paste kompatibel zu tabellarischem Text
- Spaltenbreiten speicherbar
- Spaltenreihenfolge speicherbar

### 10.2 Mehrfachänderung

Bei Mehrfachauswahl erscheint ein klarer Mehrfachbearbeitungsbereich. Werte erhalten drei Zustände:

- identischer Wert
- gemischte Werte
- nicht verfügbar für alle Objekte

Eine Änderung wird vor Anwendung mit der betroffenen Objektanzahl angezeigt.

### 10.3 Befundfilter

`Nur mit Befunden` ist ein primärer Tabellenfilter und kein verstecktes Expertenmerkmal.

---

## 11. Aufbau / Verteilerfront

### 11.1 Ansicht

Die Frontansicht verwendet dieselben UI-Prinzipien wie der Stromlaufplan:

- Navigator/Objektliste links
- große Arbeitsfläche
- Inspector/Prüfung rechts
- Statusleiste unten

### 11.2 Reihen

Jede Reihe zeigt:

- Name / Nummer
- belegte TE
- verfügbare TE
- Überbelegung
- optional reale mm-Breite

Normal:

```text
Reihe 2     28 / 36 TE
```

Fehler:

```text
Reihe 3     39 / 36 TE   [Fehler]
```

Überbelegung wird nicht nur rot, sondern auch mit Icon/Text dargestellt.

### 11.3 Geräte

Gerätekarte/-körper zeigt mindestens:

- BMK
- optionale Kurzbezeichnung
- optische Frontdarstellung
- belegte TE

Interaktionen:

- Drag & Drop
- Mehrfachauswahl
- Sperren
- numerische Position
- Wechsel in andere Reihe
- Sprung zum Stromlaufplan

### 11.4 Türansicht

Türzustände werden als Sicht-/Darstellungsmodus behandelt:

- geschlossen
- geöffnet
- optional ausgeblendet

Türmontierte Geräte bleiben eigene mechanische Platzierungen auf der Türfläche.

---

## 12. Einfügezentrum

Dreispaltige Struktur:

1. Filter / Hersteller / Kategorien
2. Trefferliste
3. Vorschau / technische Daten

Suche durchsucht gemeinsam:

- Artikel
- Gerätevorlagen
- Symbole
- Makros

Treffer zeigen Quelle und Datenqualität. Eaton ist im Referenzprofil bevorzugt, aber nicht technisch fest verdrahtet.

Primäraktion: **Platzieren**.

---

## 13. Command Palette

Shortcut: `Ctrl+K`.

Funktionen:

- Navigation
- Suche
- Befehle
- Einfügen
- Auswertungen
- Einstellungen

Leerer Zustand zeigt:

- kürzlich verwendete Befehle
- wichtige Shortcuts
- kontextbezogene Vorschläge

Suche gruppiert Ergebnisse nach Typ und zeigt Keyboard-Navigation.

---

## 14. Dokumentation

Dreispaltige Struktur:

1. Dokumentbaum
2. Seitenvorschau
3. Exporteinstellungen

Dokumenttypen u. a.:

- Deckblatt
- Inhaltsverzeichnis
- Aufbauplan
- Stromlaufplan
- Stückliste
- Bestellliste
- Klemmenplan
- Kabelliste
- Verdrahtungsliste

Exportzustände:

- bereit
- mit Hinweisen
- mit Fehlern / vorläufig

Der Benutzer darf trotz nichtkritischer Befunde exportieren, sofern die Projektregeln dies zulassen. Ein solcher Export kann automatisch als `VORLÄUFIG` / Draft gekennzeichnet werden.

---

## 15. Icons

Bevorzugt ein konsistenter, einfacher Outline-Icon-Stil.

Größen:

```text
small   14 px
normal  16 px
toolbar 18 px
large   20 px
```

Icons erhalten Text-Tooltip. Kritische Befehle wie Löschen dürfen nicht ausschließlich durch ein unbekanntes Symbol repräsentiert werden.

---

## 16. Fokus, Tastatur und Barrierefreiheit

### 16.1 Fokus

Keyboard-Fokus ist immer sichtbar. Fokus-Ring ist vom Auswahlzustand unterscheidbar.

### 16.2 Zielgrößen

Klickziele im Desktop-UI mindestens ca. 24 px, bevorzugt 28–32 px. Kleine technische Fangpunkte auf dem Canvas sind eine Ausnahme und erhalten vergrößerte unsichtbare Hit-Areas.

### 16.3 Farbe

Kein Status ausschließlich über Farbe.

Beispiele:

- Fehler = Rot + Icon + Text
- gesperrt = Schloss-Icon + Zustand
- Auswahl = Akzent + Rahmen
- Potential = Farbe + Bezeichnung; monochrom optional Linienstil

### 16.4 Skalierung

Zu prüfen:

- 100 %
- 125 %
- 150 %
- 200 %

UI-Skalierung und CAD-Zoom sind vollständig getrennt.

---

## 17. Dichteprofile

Perspektivisch zwei UI-Dichten:

### Kompakt

Für große Monitore / Power-User:

- Tabellenzeilen 28 px
- kleinere vertikale Abstände
- mehr sichtbare Eigenschaften

### Komfort

Für Touchpad / hohe DPI / bessere Lesbarkeit:

- Tabellenzeilen 32–36 px
- größere Controls
- etwas mehr Gruppenabstand

Die fachliche Funktion bleibt identisch.

---

## 18. Design-Tokens – Namenskonvention

Die Implementierung soll semantische Tokens verwenden, nicht rohe Farben direkt in Komponenten.

Beispiele:

```text
color.surface.window
color.surface.panel
color.surface.document
color.text.primary
color.text.secondary
color.border.default
color.interaction.accent
color.status.error
color.potential.neutral
color.potential.pe
color.reference.cross
spacing.1 ... spacing.7
radius.sm
control.height.normal
panel.navigator.width.default
panel.inspector.width.default
```

Dadurch können Theme, Firmenprofil und Accessibility-Varianten getrennt entwickelt werden.

---

## 19. Offene Punkte vor Implementierung

- exakte Icon-Bibliothek auswählen
- finale System-/Fallback-Typografie im Rust-Spike testen
- Dark-Potentialfarben messtechnisch auf Kontrast prüfen
- monochrome Linienstile festlegen
- minimale und maximale Panelbreiten im Prototyp testen
- Docking/Abdocken technisch evaluieren
- gespeicherte Workspace-Layouts spezifizieren
- Touch-Unterstützung nur als Nebenziel bewerten

---

## 20. Verbindliche Designrichtung für den Rust-Spike

Der erste Rust-UI-Spike soll mindestens diese Referenzoberfläche nachbilden können:

- kompakte App-Bar
- kontextuelle Toolbar
- linker Navigator
- zentraler Stromlaufplan-Canvas
- rechter Eigenschaften-/Prüf-Inspector
- Statusleiste
- Light Mode
- Dark UI + heller Zeichenbogen
- Full-Dark-Canvas
- Tabelle mit mindestens 1.000 sicht-/scrollbaren Datensätzen
- skalierbares Docking-/Panel-Konzept

Erst danach wird das UI-Framework festgelegt.
