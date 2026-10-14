# Seitentypen und Dokumentstruktur

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument konkretisiert, wie OpenE-CAD Seiten, automatisch erzeugte Auswertungen und die spätere PDF-Dokumentation organisiert.

---

## 1. Grundprinzip

Eine Projektseite ist nicht nur eine Zeichenfläche. Ihr **Seitentyp** bestimmt:

- welche Objekte platziert werden dürfen
- welche Werkzeuge angeboten werden
- welche Regeln gelten
- ob die Seite manuell bearbeitet oder generiert wird
- welche Navigatoren und Inspector-Gruppen relevant sind
- wie sie in Dokumentation und Inhaltsverzeichnis erscheint

Dabei wird zwischen drei Klassen unterschieden:

```text
A) manuell editierbare Seiten
B) datenorientierte Spezialseiten
C) generierte Auswertungsseiten
```

---

# 2. Manuell editierbare Seiten

## 2.1 `schematic_multiline`

Mehrpoliger Stromlaufplan.

Typische Inhalte:

- Gerätefunktionen
- Anschlüsse
- mehrpolige Versorgung
- Potentiale
- Leitungen
- Klemmen
- Querverweise
- Kabeladern
- SPS-Anschlüsse
- freie Grafik/Text

Werkzeuge:

- Symbol/Gerät platzieren
- Leitung
- Potential
- Klemme
- Kabelreferenz
- Text
- freie Grafik

Dies ist der primäre Seitentyp des MVP.

## 2.2 `schematic_singleline`

Einpolige Darstellung.

Eigenschaften:

- eigene Symbolvarianten möglich
- Geräte bleiben dieselben Device-Objekte wie in anderen Sichten
- ein Gerät kann einpolige und mehrpolige Darstellungen besitzen
- keine doppelte Geräteidentität

Die vollständige Semantik wird nach dem Mehrpol-Modell implementiert.

## 2.3 `free_graphic`

Freie technische Zeichnung für:

- Übersichten
- Blockdiagramme
- Hinweise
- kundenspezifische Zusatzseiten

Elektrische Objekte dürfen optional verwendet werden, aber es gelten weniger strenge Routing-/Potentialregeln.

## 2.4 `technical_data`

Manuell bzw. templategestützt bearbeitbare technische Projektseite.

Mögliche Inhalte:

- Netzform
- Spannung/Frequenz
- Schutzmaßnahme
- Verdrahtungsfarben
- Verdrahtungsquerschnitte
- allgemeine Hinweise
- Verteilerparameter

Soll mit Datenbindungen arbeiten können, damit Projektfelder nicht doppelt gepflegt werden.

---

# 3. Datenorientierte Spezialseiten

## 3.1 `cabinet_front`

Verteilerfront / Aufbauansicht.

Datenquelle:

- Enclosure
- MountingSurface
- RailRows
- CabinetPlacements
- Devices / Articles

Besonderheiten:

- TE-/mm-basiertes Layout
- Auto-Layout
- manuelle Korrektur
- Türansicht
- Aufbauprüfung

Diese Seite ist editierbar, speichert jedoch **Platzierungsdaten**, keine bloße Zeichnung.

## 3.2 `mounting_plate`

Spätere Erweiterung für Montageplatte.

Datenquelle:

- MountingSurface
- DIN-Schienen
- Kabelkanäle
- frei montierte Komponenten
- mechanische Abmessungen

Nicht Bestandteil des ersten MVP.

## 3.3 `plc_overview`

SPS-/I/O-orientierte Spezialansicht.

Kann teilweise generiert sein, darf aber manuelle Strukturierung erlauben.

---

# 4. Generierte Seiten

Generierte Seiten sind Ansichten des aktuellen Projektmodells. Sie werden nicht als unabhängige zweite Datenquelle gepflegt.

## 4.1 `cover`

Deckblatt.

Datenquellen:

- Projekt
- Kunde
- Projektstatus
- Revision
- optional Logo/Bild

## 4.2 `index`

Inhaltsverzeichnis.

Wird aus der Dokumentstruktur erzeugt.

Mögliche Spalten:

- laufende Nummer
- Projektseite
- Seitentyp
- Bezeichnung
- Struktur
- Revision
- Datum

## 4.3 `bom`

Gerätestückliste.

Quellen:

- Devices
- Articles
- Strukturkontext

Konfigurierbare Gruppierung:

- jede Geräteinstanz einzeln
- nach Artikel zusammengefasst
- nach Einbauort
- nach Anlage

## 4.4 `order_list`

Bestellliste.

Quellen:

- Articles
- Device-Mengen
- Zusatzartikel/Zubehör

Im Unterschied zur Stückliste steht der Beschaffungsvorgang im Vordergrund.

## 4.5 `terminal_plan`

Klemmenplan.

Quellen:

- TerminalStrip
- Terminals
- Bridges
- ConnectionPoints
- Kabeladern
- Ziel-/Quellbeziehungen

Eine Klemmenleiste kann mehrere Ausgabeseiten erzeugen.

## 4.6 `cable_list`

Kabelliste.

Quellen:

- Cable
- CableCore
- Ziel/Quelle
- Artikel
- Länge

## 4.7 `wire_list`

Verdrahtungsliste.

Quellen:

- Wire
- ConnectionPoints
- Route/Länge, sofern vorhanden

## 4.8 `device_list`

Betriebsmittelliste mit referenzkennzeichenorientierter Sicht.

---

# 5. SheetDefinition vs. GeneratedPage

Für automatisch mehrseitige Auswertungen wird zwischen Definition und konkreter Renderseite unterschieden.

```text
DocumentationItem / ReportDefinition
        ↓
Generator
        ↓
GeneratedPage 1..n
```

Beispiel:

```text
Klemmenplan -X1
→ Seite 1
→ Seite 2
→ Seite 3
```

Die einzelnen GeneratedPages besitzen keine dauerhaft unabhängig bearbeiteten Fachinformationen.

---

# 6. Manuell vs. automatisch

Jeder Seitentyp erhält einen `content_mode`:

```text
manual
data_driven
generated
```

### manual

Frei platzierte Inhalte sind Primärdaten.

### data_driven

Platzierungen werden gespeichert, aber referenzieren Fachobjekte.

Beispiel: Aufbau.

### generated

Die sichtbare Seite ist eine Ausgabe eines Generators.

Beispiel: Stückliste.

---

# 7. Dokumentstruktur

Die Reihenfolge der Projektseiten und die Reihenfolge der exportierten Dokumentation werden getrennt modelliert.

Warum:

Ein Projekt kann intern technische Seiten enthalten, die nicht in jede Kundendokumentation exportiert werden.

## 7.1 ProjectSheetOrder

Arbeitsreihenfolge im Projekt.

## 7.2 DocumentationSet

Ausgabereihenfolge einer Dokumentation.

Beispiel:

```text
Projekt intern
├─ Testseite
├─ Deckblatt
├─ Stromlaufplan 1
├─ Stromlaufplan 2
└─ Aufbau

Kundendokumentation
├─ Deckblatt
├─ Inhaltsverzeichnis
├─ Aufbau
├─ Stromlaufplan 1
├─ Stromlaufplan 2
└─ Stückliste
```

Die Testseite bleibt im Projekt, aber nicht im Export.

---

# 8. Dokumentbaum

Der Dokumentationsbereich zeigt einen hierarchischen Baum.

Beispiel:

```text
Dokumentation „Kunde – Revision B“
├─ Deckblatt
├─ Inhaltsverzeichnis
├─ Technische Daten
├─ Aufbau
│  └─ +UV2 Frontansicht
├─ Stromlaufpläne
│  ├─ Seite 1 Einspeisung
│  ├─ Seite 2 Verteilung
│  └─ Seite 3 Steuerung
├─ Klemmenpläne
│  ├─ -X0
│  └─ -X1
├─ Kabellisten
└─ Stückliste
```

Gruppen können automatisch nach Seitentyp oder manuell definiert werden.

---

# 9. Seitennummern

OpenE-CAD trennt:

```text
internal_sheet_id
project_page_number
document_page_number
pdf_physical_page_number
```

Diese Werte dürfen nicht verwechselt werden.

## 9.1 `internal_sheet_id`

Stabile ID.

## 9.2 `project_page_number`

Technische Seitennummer im Projekt.

Beispiel:

```text
3
3.1
10
```

## 9.3 `document_page_number`

Nummer innerhalb einer Dokumentationsstruktur, wenn gewünscht.

## 9.4 `pdf_physical_page_number`

Tatsächliche Position im exportierten PDF.

### Konsequenz

Querverweise im Stromlaufplan verwenden grundsätzlich technische Projektseiten-/Koordinaten, nicht die physische PDF-Seitennummer.

---

# 10. Nummerierungsprofile

Ein Projektprofil legt fest, wie Seiten nummeriert werden.

Beispiele:

### kontinuierlich

```text
1, 2, 3, 4, 5
```

### gruppiert

```text
1.1, 1.2, 2.1, 2.2
```

### strukturorientiert

Seitennummer + Anlagen-/Einbauortkontext.

Die interne ID bleibt davon unabhängig.

---

# 11. Seitenrahmen und Titelblock

Jede editierbare bzw. gerenderte Seite referenziert:

- PageFormat
- FrameTemplate
- TitleBlockTemplate

## 11.1 PageFormat

```text
id
name
width_mm
height_mm
orientation
```

Standardprofile können z. B. A4/A3 enthalten, ohne das Datenmodell darauf zu beschränken.

## 11.2 FrameTemplate

Definiert:

- Rand
- Koordinatenzonen
- Faltmarken optional
- nutzbare Zeichenfläche

## 11.3 TitleBlockTemplate

Bindet Projekt-/Seiten-/Revisionsdaten dynamisch ein.

Keine festen Kundendaten in der Vorlage.

---

# 12. Titelblock-Bindings

Beispiele:

```text
project.name
project.project_number
project.customer.name
sheet.project_page_number
sheet.name
sheet.description
sheet.structure.location
revision.index
revision.description
revision.date
user.editor
user.checker
```

Zusätzlich frei definierbare Projektfelder.

Fehlende optionale Felder erzeugen keinen Fehler; fehlende Pflichtfelder können einen Prüfhinweis erzeugen.

---

# 13. Querverweise und Seitenkoordinaten

Ein Querverweis speichert keine fertige Zeichenkette wie `/5.D4` als Primärdaten.

Er referenziert die Zielplatzierung.

Renderer berechnet:

```text
target_sheet.project_page_number
+
target_placement.coordinate_zone
```

Daraus entsteht z. B.:

```text
/5.D4
```

Bei Seitenverschiebung oder Koordinatenänderung aktualisiert sich der Text automatisch.

---

# 14. Dokumentations-Preview

Die Vorschau im Bereich Dokumentation rendert denselben Output-Pfad wie der spätere Export so weit wie möglich.

Ziel:

**What you preview is what you export.**

Unterschiede sollen auf PDF-spezifische Funktionen beschränkt sein.

---

# 15. PDF-Export

Ein ExportProfile enthält mindestens:

```text
paper_scaling
color_mode
include_bookmarks
include_internal_links
include_cross_reference_links
include_table_of_contents_links
revision_mode
watermark
pdf_metadata
```

## 15.1 Farbmodi

```text
project_color
monochrome
print_profile
```

`project_color` verwendet die projektspezifische Darstellungsfarbgebung.

`monochrome` verwendet alternative Linienstile/Kennzeichnungen und darf nicht nur die Sättigung auf Null setzen.

## 15.2 Hyperlinks

Perspektivisch:

- Inhaltsverzeichnis → Seite
- Querverweis → Zielseite
- Stückliste → erste Geräteplatzierung optional
- Klemmenplan → Zielreferenz optional

---

# 16. Entwurf / vorläufige Ausgabe

Wenn Projektregeln einen Export trotz Befunden erlauben, kann ein Exportzustand gesetzt werden:

```text
final
preliminary
draft
```

Ein Watermark kann automatisch aus dem Zustand entstehen.

Beispiel:

```text
VORLÄUFIG
NICHT ZUR AUSFÜHRUNG
```

Konkrete Texte sind projekt-/firmenprofilabhängig.

---

# 17. Seitenstatus

Eine Seite kann Status besitzen:

```text
in_work
review
approved
obsolete
```

Dieser Status ist nicht identisch mit Revision.

Er kann für Filter, Dokumentation und Freigabe verwendet werden.

---

# 18. Seitenoperationen

Mindestens:

- hinzufügen
- duplizieren
- verschieben
- umnummerieren
- Strukturkontext ändern
- Vorlage ändern
- löschen
- aus Dokumentation ausschließen

Bei Umnummerierung müssen alle sichtbaren Querverweise automatisch aktualisiert werden.

---

# 19. Löschen einer Seite

Vor dem Löschen wird geprüft:

- welche SchematicPlacements betroffen sind
- welche Querverweise auf diese Seite zeigen
- ob Funktionen danach unplatziert bleiben
- ob Dokumentationssets die Seite referenzieren

Default:

Die Seite und ihre Platzierungen werden gelöscht, die zugrunde liegenden Devices/Functions bleiben erhalten, sofern der Benutzer nicht ausdrücklich deren Löschung verlangt.

Dadurch können Geräte danach im Navigator als „nicht platziert“ erscheinen.

---

# 20. Duplizieren einer Seite

Es muss zwei fachlich unterschiedliche Varianten geben:

### A. Seite/Darstellungen duplizieren

Neue grafische Platzierungen, aber dieselben Fachobjekte, soweit fachlich zulässig.

### B. Schaltung als neue Geräte kopieren

Erzeugt neue Devices/Functions/Placements mit neuen IDs und optional automatischer BMK-Vergabe.

Die UI muss diesen Unterschied klar ausdrücken.

---

# 21. Seitentypwechsel

Ein Seitentyp darf nicht beliebig geändert werden, wenn Inhalte inkompatibel sind.

Beispiel:

```text
schematic_multiline → free_graphic
```

kann möglich sein.

```text
schematic_multiline → bom
```

ist fachlich kein einfacher Typwechsel, sondern muss abgelehnt oder als neue Auswertung erzeugt werden.

---

# 22. Vordefinierte Dokumentationsstruktur für das Starterprofil

Ein erstes IEC-/Verteilerprofil kann folgende Reihenfolge anbieten:

```text
01 Deckblatt
02 Inhaltsverzeichnis
03 Technische Daten
04 Aufbauplan
05..n Stromlaufplan
n+1.. Klemmenpläne
... Kabellisten
... Stückliste
... Bestellliste
```

Dies ist nur ein Template, keine fest codierte Produktlogik.

---

# 23. Navigator-Darstellung

Der Seiten-Navigator zeigt mindestens:

- Projektstruktur
- Seitennummer
- Seitentitel
- Seitentyp optional per Icon
- Befundstatus
- Änderungs-/Freigabestatus optional

Generierte Seiten müssen im normalen Stromlaufplan-Navigator nicht zwingend als editierbare Seiten erscheinen; sie gehören primär in den Dokumentationsbereich.

---

# 24. Auswirkungen auf `.oecad`

Voraussichtlich werden getrennt gespeichert:

```text
project metadata
manual sheets
data-driven sheet definitions
report/documentation definitions
templates references
```

GeneratedPages müssen nicht zwingend persistent gespeichert werden, da sie rekonstruierbar sind.

Optionaler Render-Cache ist möglich, aber nicht Teil der fachlichen Wahrheit.

---

# 25. Noch offen

- genaue Seitenhierarchie bei sehr großen Anlagen
- Subpage-Syntax
- Seitentyp-Icons
- mehrere gleichzeitige Dokumentationssets / Kundenvarianten
- Revisionsstände einzelner Seiten
- Umgang mit eingefrorenen historischen PDF-Ausgaben
- digitale Signaturen / Freigabe
- DWG/DXF-Ausgabe einzelner Seitentypen

---

# 26. Verbindliche Entscheidungen v0.1

- technische Projektseite und physische PDF-Seite sind getrennte Begriffe
- Querverweise referenzieren Platzierungen, nicht fertige Seitentexte
- manuelle, datengetriebene und generierte Seiten werden unterschieden
- Aufbau ist datengetrieben, nicht bloß gezeichnet
- Stücklisten/Klemmenpläne/Kabellisten werden generiert
- Titelblöcke und Rahmen sind Templates
- Dokumentationssets bestimmen den Exportumfang unabhängig von der internen Projektseitenliste
- Seitenlöschung löscht standardmäßig nicht automatisch die Geräteidentität
