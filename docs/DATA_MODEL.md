# OpenE-CAD Datenmodell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1 – erster Entwurf**

Dieses Dokument definiert das fachliche Kernmodell, auf dem Stromlaufplan, Aufbau, Datenmanager, Prüfung und Dokumentation gemeinsam aufbauen.

Es ist absichtlich **unabhängig von Rust-Structs, Datenbanktabellen und Dateiformat** formuliert. Die spätere Implementierung soll dieses Modell möglichst direkt abbilden.

---

## 1. Kernprinzip

OpenE-CAD ist kein reiner Grafikeditor.

Die zentrale Trennung lautet:

```text
Artikel / Herstellerdaten
        ↓
Gerät / Betriebsmittel
        ↓
Funktionen
        ↓
Anschlüsse
        ↓
logische Netze / Verbindungen
        ↓
Darstellungen / Platzierungen
```

Parallel besitzt dasselbe Gerät weitere Sichten:

```text
Gerät
 ├─ Stromlaufplan-Platzierungen
 ├─ Verteiler-/Schaltschrank-Platzierung
 ├─ Material-/Stücklisteneintrag
 ├─ Dokumentationsbeziehungen
 └─ Prüfstatus
```

Ein Objekt wird fachlich **einmal** angelegt und in mehreren Sichten verwendet.

---

## 2. Grundregeln

### 2.1 Stabile interne IDs

Jedes persistente Domänenobjekt besitzt eine stabile interne ID, beispielsweise UUID/ULID.

Diese ID ist nicht dasselbe wie:

- BMK / Referenzkennzeichen
- Seitenname
- Artikelnummer
- Klemmenbezeichnung
- SPS-Adresse

Menschenlesbare Kennzeichnungen dürfen sich ändern, interne Referenzen müssen stabil bleiben.

### 2.2 Keine fachlichen Beziehungen über Text

Unzulässig als Primärlogik:

```text
"-K1" == "-K1" → muss dasselbe Gerät sein
```

Stattdessen:

```text
device_id = <stable-id>
```

Das BMK `-K1` ist eine Eigenschaft des Geräts und kann von Regeln geprüft bzw. neu vergeben werden.

### 2.3 Eine Quelle der Wahrheit

Informationen sollen nicht mehrfach unabhängig gespeichert werden.

Beispiel:

- Artikelbreite stammt aus dem Artikel-/Gerätedatensatz.
- Aufbauansicht verwendet diese Breite.
- Stückliste verwendet denselben Artikel.
- Inspector zeigt dieselben Daten.

Abgeleitete Werte werden möglichst berechnet oder klar als Cache gekennzeichnet.

### 2.4 Grafik ist Darstellung, nicht Identität

Das Löschen eines Symbols aus einer Seite darf nicht automatisch bedeuten, dass das physische Gerät gelöscht wird.

Der Benutzer muss unterscheiden können zwischen:

- Darstellung löschen
- Funktion entfernen
- Gerät vollständig löschen

### 2.5 Schema-Versionierung

Jede Projektdatei besitzt mindestens:

```text
format_version
schema_version
application_version_created
application_version_last_saved
```

Migrationen müssen deterministisch und testbar sein.

---

# 3. Objektübersicht

```text
Project
├─ ProjectStructure
├─ Sheets
│  └─ SchematicPlacements
├─ Devices
│  ├─ Functions
│  │  └─ ConnectionPoints
│  └─ CabinetPlacement
├─ Nets / Potentials
│  └─ Connections
├─ TerminalStrips
│  └─ Terminals
├─ Cables
│  └─ Cores
├─ PLC systems
│  └─ Modules / Channels
├─ Articles / article references
├─ Enclosures / mounting structures
├─ Documentation definitions
├─ Revisions
└─ Project rules / profiles
```

---

# 4. Projekt

## 4.1 Project

Wurzelobjekt eines OpenE-CAD-Projekts.

Eigenschaften:

```text
id
name
project_number
customer
customer_project_number
status
created_at
modified_at
created_by
schema_version
active_language
project_languages[]
structure_profile_id
rule_profile_id
appearance_profile_id
default_manufacturer_preference[]
```

Zusätzliche frei definierbare Projektfelder werden über ein strukturiertes Custom-Property-System geführt.

### Beziehungen

Project enthält bzw. referenziert:

- Seiten
- Strukturkennzeichen
- Geräte
- Netze/Potentiale
- Klemmen
- Kabel
- SPS-Strukturen
- Gehäuse/Verteiler
- Dokumentationsdefinitionen
- Revisionen

---

# 5. Projektstruktur / Kennzeichnung

## 5.1 StructureNode

Strukturknoten repräsentieren Anlage, Funktion, Einbauort oder andere konfigurierbare Aspekte.

Beispiele:

```text
=ANL
+UV2
-Funktionsteil
```

Das konkrete Präfix und die Semantik werden durch das Struktur-/Normprofil bestimmt.

Eigenschaften:

```text
id
aspect
identifier
description
parent_id
sort_order
```

`aspect` ist fachlich typisiert, nicht nur Freitext.

Mögliche Startwerte:

```text
functional
location
product
installation
custom
```

Die konkrete IEC-81346-orientierte Logik wird in einem eigenen Regelprofil definiert.

## 5.2 ReferenceDesignation

Ein zusammengesetztes Referenzkennzeichen wird **berechnet** aus:

- relevanten StructureNodes
- lokalem Gerätekennzeichen
- Regelprofil

Dadurch kann dasselbe Datenmodell unterschiedliche Firmen-/Normprofile unterstützen.

---

# 6. Seitenmodell

## 6.1 Sheet

Eigenschaften:

```text
id
page_number
subpage
name
description
sheet_type_id
structure_context[]
page_format_id
frame_template_id
title_block_template_id
scale
grid_profile_id
sort_order
revision_state
```

### Geplante Seitentypen

Mindestens:

```text
cover
index
technical_data
schematic_multiline
schematic_singleline
cabinet_front
terminal_plan
cable_plan
bom
order_list
wire_list
plc_overview
free_graphic
```

Nicht alle Seitentypen müssen im MVP editierbar sein; das Datenmodell berücksichtigt sie früh.

## 6.2 SheetCoordinateSystem

Eine Seite besitzt ein Koordinatensystem für Querverweise.

Eigenschaften:

```text
horizontal_zones
vertical_zones
zone_labels
origin
orientation
```

Querverweise sollen auf stabile Placement-IDs zeigen; die sichtbare Koordinate wird daraus berechnet.

---

# 7. Artikel / Herstellerdaten

## 7.1 Manufacturer

```text
id
name
short_name
website
external_ids{}
```

## 7.2 Article

Ein Artikel beschreibt ein bestellbares oder katalogisiertes Produkt.

Eigenschaften:

```text
id
manufacturer_id
article_number
type_designation
short_description
long_description
status
gtin
etim_class
eclass_id
source
source_version
source_updated_at
```

### Technische Eigenschaften

Nicht als unstrukturierter großer Textblock, sondern über typisierte Property-Sets.

Beispiele:

```text
rated_voltage
rated_current
coil_voltage
breaking_capacity
number_of_poles
contact_configuration
power_rating
ip_rating
```

### Mechanische Eigenschaften

```text
width_mm
height_mm
depth_mm
width_te
mounting_type
weight
```

`width_te` und `width_mm` sind **separate Werte**. 1 TE darf nicht als einzige interne Maßeinheit verwendet werden.

### Beziehungen

Ein Artikel kann besitzen:

- FunctionTemplates
- SymbolMappings
- CabinetMacro / FrontRepresentation
- Zubehör
- erforderliches Zubehör
- Alternativartikel
- Dokumente/URLs

---

# 8. Geräte / Betriebsmittel

## 8.1 Device

Device ist die physische bzw. logisch zusammengehörige Betriebsmittelinstanz im Projekt.

Beispiel:

```text
-K1
Eaton DILM17
```

Eigenschaften:

```text
id
local_designation
function_text
structure_assignments[]
article_id?
quantity = 1
status
notes
custom_properties{}
```

Abgeleitet:

```text
full_reference_designation
article_data
mechanical_data
validation_state
```

### Device != Article

Mehrere Devices dürfen denselben Article referenzieren.

```text
-K1 → DILM17
-K2 → DILM17
-K3 → DILM17
```

sind drei Geräteinstanzen, aber ein Artikeltyp.

### Device ohne Artikel

Muss erlaubt sein.

Ein Gerät kann zunächst nur mit:

- BMK
- Funktion
- Funktionen/Anschlüssen

existieren. Die Prüfung kann einen fehlenden Artikel als Hinweis/Befund melden.

---

# 9. Funktionen

## 9.1 Function

Eine Function beschreibt einen fachlichen Teil eines Geräts.

Beispiel `-K1`:

```text
coil
power_contact_1
power_contact_2
power_contact_3
aux_contact_13_14
```

Eigenschaften:

```text
id
device_id
function_type
function_index
description
function_template_id?
is_main_function
properties{}
```

### Typische FunctionTypes

```text
coil
no_contact
nc_contact
changeover_contact
power_contact
circuit_breaker_pole
fuse
motor
lamp
push_button
terminal_function
plc_channel
sensor
actuator
power_supply
black_box
custom
```

Die Liste muss erweiterbar sein.

## 9.2 FunctionTemplate

Hersteller-/Bibliotheksvorlage für eine Funktion.

```text
id
article_id?
function_type
connection_templates[]
default_symbol_mapping
properties{}
```

Ein Artikel kann mehrere FunctionTemplates bereitstellen.

---

# 10. Anschlüsse

## 10.1 ConnectionPoint

ConnectionPoint ist ein fachlicher Anschluss einer Function.

Eigenschaften:

```text
id
function_id
designation
connection_type
electrical_role
direction
potential_constraint?
connection_group?
properties{}
```

Beispiele:

```text
A1
A2
1L1
2T1
13
14
PE
N
```

### ConnectionType Beispiele

```text
power
control
signal
neutral
protective_earth
shield
bus
communication
mechanical
custom
```

### Anschluss und Grafik

Der fachliche ConnectionPoint besitzt keine feste Seitenposition.

Die Position ergibt sich aus der jeweiligen SchematicPlacement + Symbol-Anschlussposition.

---

# 11. Symbole und grafische Platzierungen

## 11.1 SymbolDefinition

Bibliotheksobjekt mit Vektorgeometrie und Anschlussankern.

Eigenschaften:

```text
id
name
standard_profile
symbol_class
variants[]
graphics
connection_anchors[]
text_anchors[]
bounding_box
```

SymbolDefinition enthält **keine Projektgeräte-ID**.

## 11.2 SymbolVariant

Beispiele:

```text
horizontal
vertical
normally_open
normally_closed
single_line
multi_line
compact
```

## 11.3 SchematicPlacement

Eine konkrete Darstellung einer Function auf einer Sheet.

Eigenschaften:

```text
id
sheet_id
function_id
symbol_definition_id
symbol_variant_id
position
rotation
mirror_x
mirror_y
scale
text_overrides{}
layer_id?
locked
```

### Wichtig

Eine Function kann mehrere Platzierungen besitzen, wenn dies fachlich zulässig ist.

Das System muss dennoch Regeln anbieten, die versehentliche Doppelplatzierung erkennen.

## 11.4 GraphicObject

Nicht-semantische Grafikobjekte:

```text
line
polyline
rectangle
circle
arc
text
image
revision_cloud
```

Diese Objekte sind bewusst von elektrischen Objekten getrennt.

---

# 12. Potentiale und Netze

## 12.1 PotentialDefinition

Beschreibt die fachliche Bedeutung eines Potentials.

Eigenschaften:

```text
id
name
potential_type
nominal_voltage?
polarity?
frequency?
description
appearance_override?
```

Beispiele:

```text
L1
L2
L3
N
PE
+24V
0V
Fremdspannung
```

### PotentialType

Beispiele:

```text
phase
neutral
protective_earth
dc_positive
dc_negative
control
signal
foreign_voltage
bus
custom
```

### Farbe ist keine Fachlogik

`PotentialDefinition` referenziert optional eine Darstellungsregel. Die fachliche Bedeutung bleibt unabhängig von Blau/Grün/Rot.

## 12.2 Net

Ein Net beschreibt elektrisch verbundene ConnectionPoints.

Eigenschaften:

```text
id
potential_id?
name?
connection_point_ids[]
properties{}
```

Netze sollen aus der Verbindungsgraphstruktur deterministisch ableitbar oder konsistent aktualisierbar sein.

Ein Net kann seitenübergreifend fortgesetzt werden.

---

# 13. Verbindungen

Hier muss zwischen fachlicher Verbindung und gezeichneter Linie unterschieden werden.

## 13.1 ElectricalConnection

Fachliche Verbindung zwischen ConnectionPoints bzw. Netzsegmenten.

Eigenschaften:

```text
id
net_id
source_connection_point_id?
target_connection_point_id?
wire_id?
connection_class
properties{}
```

## 13.2 ConnectionPathPlacement

Grafische Darstellung auf einer Seite.

```text
id
sheet_id
electrical_connection_id
points[]
routing_mode
line_style_override?
locked_segments[]
```

`points[]` bilden orthogonale oder freie Segmente ab.

### Knoten

T-Abzweige und Verbindungspunkte müssen graphisch und elektrisch eindeutig modelliert sein. Eine bloße Linienkreuzung darf **nicht automatisch** elektrische Verbindung bedeuten.

---

# 14. Leiter / Drähte

## 14.1 Wire

Optionales physisches Leiterobjekt.

Eigenschaften:

```text
id
connection_id
wire_number?
cross_section?
color?
material?
from_connection_point_id
to_connection_point_id
length?
route?
```

Für frühe Projekte kann eine ElectricalConnection ohne explizites Wire-Objekt existieren. Fertigungsfunktionen können später physische Wire-Objekte erzeugen.

---

# 15. Klemmen

## 15.1 TerminalStrip

```text
id
device_id?
designation
structure_assignments[]
description
sort_order
```

Eine Klemmenleiste kann technisch als spezialisiertes Gerät betrachtet werden; für Bedienung und Auswertungen erhält sie dennoch einen eigenen Domänenbereich.

## 15.2 Terminal

```text
id
terminal_strip_id
designation
terminal_type
level_count
article_id?
position_index
pe_function
bridge_groups[]
connection_points[]
```

TerminalTypes:

```text
feed_through
pe
neutral
multi_level
disconnect
fuse
sensor_actuator
custom
```

### Brücken

Brücken sind eigene fachliche Beziehungen und nicht nur gezeichnete Linien.

```text
TerminalBridge
- id
- terminal_ids[]
- level
- bridge_type
- article_id?
```

---

# 16. Kabel

## 16.1 Cable

```text
id
designation
article_id?
from_context
to_context
length?
description
cores[]
shielding{}
```

## 16.2 CableCore

```text
id
cable_id
core_number
core_color
cross_section
from_connection_point_id?
to_connection_point_id?
reserve
```

Eine Ader darf nur gemäß Projektregel einmal aktiv verwendet werden.

---

# 17. SPS / I/O

## 17.1 PLCDevice

Kann auf Device aufbauen bzw. dieses spezialisieren.

```text
id
device_id
station_name
bus_system
address
```

## 17.2 PLCModule

```text
id
plc_device_id
device_id?
slot
module_type
article_id?
```

## 17.3 PLCChannel

```text
id
module_id
channel_number
channel_type
address
symbolic_name
function_text
connection_point_id?
```

Prüfregeln:

- doppelte Adresse
- ungültiges Format
- Kanal ohne Zuordnung
- falscher Kanaltyp

---

# 18. Verteiler / Aufbau

## 18.1 Enclosure

Physisches Gehäuse / Verteiler.

```text
id
device_id?
article_id?
designation
width_mm
height_mm
depth_mm
ip_rating
protection_class
door_configuration
properties{}
```

### Wichtig

Die Anzahl Reihen und TE-Kapazitäten sind **nicht global fest codiert**.

## 18.2 MountingSurface

Montagefläche innerhalb eines Enclosure.

Beispiele:

```text
front
backplate
door_inside
door_outside
side_left
side_right
custom
```

Eigenschaften:

```text
id
enclosure_id
surface_type
width_mm
height_mm
coordinate_system
```

## 18.3 RailRow

Eine TE-basierte Gerätereihenfläche.

```text
id
mounting_surface_id
name
index
capacity_te
usable_width_mm
position_mm
height_mm
te_pitch_mm
```

Damit sind z. B. 12/18/24/34/36 TE oder individuelle Reihen möglich.

## 18.4 CabinetPlacement

Physische Platzierung eines Device.

```text
id
device_id
enclosure_id
mounting_surface_id
rail_row_id?
position_te?
position_mm
rotation
locked
placement_mode
```

`placement_mode`:

```text
auto
manual
manual_locked
```

### Breite

Belegte Breite wird bevorzugt aus Article übernommen:

```text
article.width_te
article.width_mm
```

Projektbezogene Overrides sind möglich, müssen aber sichtbar gekennzeichnet werden.

## 18.5 ReservePlacement

Reserve-/Blindbereich ist ein eigenes Aufbauobjekt und kein Fake-Gerät.

```text
id
rail_row_id
start_te
width_te
label?
locked
```

## 18.6 Auto-Layout

Auto-Layout arbeitet auf Devices mit passenden Aufbauinformationen.

Eingaben:

- Enclosure
- MountingSurface
- gewünschte RailRow
- Gerätebreiten
- gesperrte Platzierungen
- Reserven
- Sortierprofil

Ausgabe:

- CabinetPlacements
- nicht platzierbare Geräte
- Befunde

Auto-Layout darf gesperrte Platzierungen niemals still verschieben.

---

# 19. Tür / Türgeräte

Eine Tür ist eine MountingSurface bzw. besitzt eigene MountingSurfaces.

Türmontierte Geräte, z. B.:

- Leuchtmelder
- Taster
- Displays
- Hauptschaltergriffe

werden über CabinetPlacement auf der Türfläche platziert.

Der UI-Zustand „Tür geöffnet/geschlossen“ ist Darstellungszustand und ändert keine fachlichen Platzierungsdaten.

---

# 20. Texte und Übersetzungen

## 20.1 TranslatableText

Texte mit fachlicher Identität sollen nicht pro Sprache als unabhängige Freitexte verteilt werden.

```text
id
translations {
  de: "...",
  en: "...",
  ...
}
```

Verwendet u. a. für:

- Funktionstexte
- Seitentitel
- Gerätetexte
- Hinweise
- Dokumentationstexte

## 20.2 Freie Grafiktexte

Freie Texte dürfen ebenfalls mehrsprachig sein, müssen aber nicht zwingend eine zentrale Übersetzungs-ID besitzen.

---

# 21. Titelblöcke und Rahmen

## 21.1 FrameTemplate

Definiert:

- Papierformat
- Zeichnungsrahmen
- Koordinatenraster
- Randbereiche

## 21.2 TitleBlockTemplate

Template mit Feldern / Bindings.

Beispiele:

```text
project.name
project.project_number
customer.name
sheet.page_number
sheet.name
revision.index
editor.name
checker.name
structure.location
```

Titelblockwerte dürfen nicht separat manuell dupliziert werden, wenn sie aus Projekt-/Seitenobjekten kommen können.

---

# 22. Dokumentation / Auswertungen

## 22.1 DocumentationSet

Definiert eine exportierbare Dokumentationszusammenstellung.

```text
id
name
items[]
export_profile_id
```

## 22.2 DocumentationItem

Typen:

```text
sheet
sheet_group
index
bom
order_list
terminal_plan
cable_list
wire_list
custom_report
```

Eigenschaften:

```text
id
type
source_query
sort_order
template_id?
page_format_id?
```

Auswertungen sollen **generiert**, nicht als zweite unabhängige Datenhaltung gepflegt werden.

Beispiel:

Die Stückliste wird aus Devices + Articles abgeleitet.

## 22.3 ExportProfile

```text
paper_mode
color_mode
include_bookmarks
include_hyperlinks
revision_filter
watermark_mode
pdf_metadata
```

---

# 23. Prüfung / Befunde

## 23.1 Finding

Befunde sind normalerweise berechnet und nicht permanent als fachliche Wahrheit gespeichert.

```text
id_or_runtime_key
rule_id
severity
object_refs[]
message
suggested_actions[]
```

Severity:

```text
info
warning
error
critical
```

## 23.2 Rule

Regeldefinition:

```text
id
category
severity_default
scope
parameters
can_ignore
```

Beispiele:

- doppeltes BMK
- fehlender Artikel
- offener Anschluss
- unzulässiger Potentialmix
- SPS-Adresse doppelt
- Kabelader doppelt verwendet
- Aufbaugerät nicht platziert
- Reihe überbelegt
- Gerätebreite fehlt

## 23.3 RuleException

Falls ein Befund fachlich ignorierbar ist:

```text
id
rule_id
object_ref
reason
created_by
created_at
```

Ignorieren darf den Befund nicht unsichtbar vernichten; Ausnahme bleibt auditierbar.

---

# 24. Revisionen

## 24.1 Revision

```text
id
index
date
author
checker?
description
status
```

## 24.2 RevisionMarker

Optionaler Bezug auf geänderte Seiten/Objekte.

Die genaue Änderungsverfolgung wird später spezifiziert. Wichtig ist, Revision bereits im Projektmodell und Titelblock vorzusehen.

---

# 25. Eigenschaften / Custom Properties

OpenE-CAD benötigt Erweiterbarkeit, darf aber nicht alles zu untypisiertem JSON degradieren.

Prinzip:

1. häufige fachliche Kernfelder sind stark typisiert
2. Klassen dürfen definierte Property-Sets erweitern
3. benutzerdefinierte Eigenschaften werden über schemaartige Definitionen geführt

## 25.1 PropertyDefinition

```text
id
key
label
data_type
unit?
allowed_values?
default_value?
validation?
```

DataTypes:

```text
string
integer
decimal
boolean
date
enum
reference
quantity
```

`quantity` kombiniert Wert + Einheit sauber.

---

# 26. Einheiten

Intern sollen physikalische Größen nicht als formatierte Strings gespeichert werden.

Nicht:

```text
"18 A"
```

sondern logisch:

```text
value = 18
unit = ampere
```

Für häufige Größen wird eine kanonische interne Einheit festgelegt; Anzeigeeinheit ist UI-/Projektprofil.

Relevante Dimensionen:

- Spannung
- Strom
- Leistung
- Frequenz
- Länge
- Querschnitt
- Winkel
- Masse
- Temperatur

---

# 27. Löschen / Lebenszyklus

Wegen der Datenorientierung müssen Löschaktionen eindeutig sein.

Beispiel Symbol `-K1` auf Seite löschen:

Mögliche Aktionen:

```text
A) nur Darstellung entfernen
B) Funktion aus Gerät entfernen
C) gesamtes Gerät inkl. aller Darstellungen löschen
```

Default soll die **kleinstmögliche zerstörerische Aktion** sein.

Bei referenzierten Objekten müssen Auswirkungen vor dem Löschen sichtbar sein.

---

# 28. Undo / Redo – fachliche Anforderung

Alle benutzerinitiierten Änderungen am Projektmodell müssen als rückgängig machbare Commands formulierbar sein.

Beispiele:

```text
AddDevice
AssignArticle
PlaceFunction
MovePlacement
ConnectPoints
ChangePotential
MoveCabinetDevice
AutoLayoutCabinet
EditProperty
DeletePlacement
DeleteDevice
```

Ein Auto-Layout wird als **eine** transaktionale Benutzeraktion betrachtet, auch wenn intern viele Platzierungen geändert werden.

---

# 29. Abgeleitete Indizes

Für Performance dürfen Indizes/Caches existieren, z. B.:

- BMK → Device-ID
- Seite → Placements
- Device → Functions
- Function → Placements
- ConnectionPoint → Net
- Article → verwendete Devices
- Device → CabinetPlacement

Diese Daten sind rekonstruierbar und nicht die primäre fachliche Wahrheit.

---

# 30. Beispiel: Schütz `-K1`

```text
Device
  id: dev-k1
  local_designation: K1
  article_id: article-dilm17

Article
  manufacturer: Eaton
  article_number: DILM17...
  width_te: 2.5
  width_mm: 45

Functions
  fn-coil
    type: coil
    ConnectionPoints: A1, A2

  fn-power-1
    type: power_contact
    ConnectionPoints: 1L1, 2T1

  fn-power-2
    type: power_contact
    ConnectionPoints: 3L2, 4T2

  fn-power-3
    type: power_contact
    ConnectionPoints: 5L3, 6T3

  fn-aux-1
    type: no_contact
    ConnectionPoints: 13, 14

SchematicPlacements
  Seite 3: drei Leistungskontakte
  Seite 5: Spule
  Seite 5: Hilfskontakt

CabinetPlacement
  Enclosure: +UV2
  RailRow: 2
  position_te: 3
  width: aus Article
```

Die Stückliste enthält **ein Gerät**, nicht fünf Symbole.

---

# 31. Beispiel: Seitenübergreifender Querverweis

Querverweis entsteht aus Beziehung:

```text
Device dev-k1
├─ Function fn-coil → Placement p-501 auf Seite 5 / Zone D4
└─ Function fn-aux  → Placement p-603 auf Seite 6 / Zone C2
```

Sichtbarer Text wird berechnet:

```text
/5.D4
/6.C2
```

Wenn die Seite verschoben oder neu nummeriert wird, ändert sich der sichtbare Querverweis automatisch. Die interne Beziehung bleibt stabil.

---

# 32. Beispiel: Verteilerreihe

```text
Enclosure +UV2
  MountingSurface front
    RailRow 1: capacity 36 TE
    RailRow 2: capacity 36 TE
    RailRow 3: capacity 36 TE
```

Geräte:

```text
-F1   3 TE
-F2   2 TE
-K1   2.5 TE
-X1   6 TE
Reserve 4 TE
```

CabinetPlacements referenzieren echte Device-IDs.

Prüfung berechnet:

```text
used_te = Summe belegter Bereiche
remaining_te = capacity_te - used_te
```

Überlappung und Überbelegung sind Befunde, keine bloßen roten Grafiken.

---

# 33. Noch bewusst offen

Folgende Bereiche werden in separaten Spezifikationen vertieft:

- vollständige IEC-81346-/BMK-Regellogik
- elektrische Netzerkennung und Junction-Regeln
- Potentialfortsetzung über Seiten
- Klemmen-/Brückenmodell für komplexe Mehrstockklemmen
- Kabelschirm-/Twisted-Pair-Modell
- PLC-Bus-Topologien
- 2D-Montageplatte und Kabelkanäle
- Varianten / Optionen / Makroprojekte
- Revisionsvergleich
- Kollaboration / Merge
- Import-/Exportadapter

---

# 34. Konsequenzen für die Architektur

Aus diesem Modell ergeben sich bereits einige klare technische Anforderungen:

1. Projektmodell ist ein referenziertes Objektgraph-Modell, kein Canvas-Dokumentbaum allein.
2. Grafik-Renderer darf keine fachliche Wahrheit besitzen, die im Projektmodell fehlt.
3. Navigatoren und Tabellen sind alternative Queries auf denselben Datenbestand.
4. Prüfengine arbeitet auf dem Domänenmodell, nicht auf gerenderten Symbolen.
5. PDF-/Auswertungsengine liest ebenfalls dasselbe Modell.
6. stabile IDs sind für Undo/Redo, Querverweise und spätere Git-/Merge-Funktionen zwingend.
7. Auto-Layout im Aufbau ist eine Transformation vorhandener CabinetPlacements, keine separate Zeichnung.

---

# 35. Nächste fachliche Spezifikationen

Auf Basis dieses Entwurfs werden als Nächstes detailliert:

1. **Seitentypen und Dokumentstruktur**
2. **Symbol-, Function- und ConnectionPoint-Modell**
3. **Leitungs-/Netz-/Potentiallogik**
4. **BMK / Strukturkennzeichen / IEC-81346-Profil**
5. **Verteiler-/Reihen-/Auto-Layout-Regeln**
6. **Klemmen und Kabel**
7. **Undo/Redo-Kommandos und Transaktionen**
8. **`.oecad`-Container und Schema-Versionierung**

Erst danach sollte die langfristige Rust-Core-Struktur verbindlich festgelegt werden.
