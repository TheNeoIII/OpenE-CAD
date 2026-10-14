# Symbol-, Funktions- und Anschlussmodell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument vertieft die Beziehung zwischen Bibliothek, Herstellerartikel, Geräteinstanz, Funktion, Anschluss und grafischer Darstellung.

Ziel ist, dass ein Symbol niemals selbst die fachliche Identität eines Betriebsmittels darstellt. Ein Symbol ist eine mögliche Darstellung einer Funktion.

---

# 1. Kernmodell

```text
Article
  └─ FunctionTemplateSet
       ├─ FunctionTemplate
       │    └─ ConnectionTemplate[]
       ├─ SymbolMapping[]
       └─ MechanicalRepresentation[]

Device
  └─ Function[]
       └─ ConnectionPoint[]

Function
  └─ SchematicPlacement[]
       └─ SymbolDefinition + SymbolVariant
```

Daraus folgen drei wichtige Regeln:

1. **Article definiert, was ein Produkt typischerweise kann.**
2. **Device ist die konkrete Instanz im Projekt.**
3. **SymbolDefinition beschreibt nur, wie eine Function dargestellt werden kann.**

---

# 2. FunctionType

`FunctionType` ist eine erweiterbare fachliche Klassifikation.

Startmenge:

```text
coil
power_contact
no_contact
nc_contact
changeover_contact
circuit_breaker_pole
fuse
motor
lamp
push_button
selector_switch
terminal_function
plc_channel
sensor
actuator
power_supply
transformer_winding
black_box
custom
```

Ein FunctionType kann Regeln bereitstellen für:

```text
allowed_connection_roles
internal_connectivity_behavior
preferred_symbol_classes
reference_designation_class_hint
placement_rules
validation_rules
```

Diese Regeln sind konfigurierbare Fachregeln und keine elektrische Simulation.

---

# 3. FunctionTemplate

Ein `FunctionTemplate` beschreibt eine vom Artikel oder von einer Bibliothek angebotene Funktion.

```text
id
key
function_type
description
quantity
optional
main_function_candidate
connection_templates[]
default_symbol_mapping_id?
properties{}
```

`key` ist innerhalb des Template-Sets stabil und maschinenlesbar, beispielsweise:

```text
coil
power_contact_l1
power_contact_l2
power_contact_l3
aux_no_1
```

Der sichtbare Text ist nicht der Schlüssel.

---

# 4. ConnectionTemplate

Ein `ConnectionTemplate` beschreibt einen Anschluss, bevor ein konkretes Device im Projekt instanziiert wurde.

```text
id
key
default_designation
connection_type
electrical_role
direction
max_connections?
potential_constraint?
connection_group?
properties{}
```

Beispiel:

```text
key = coil_a1
default_designation = A1
connection_type = control
```

Wichtig:

- `key` dient der stabilen Zuordnung.
- `default_designation` darf projekt- oder artikelabhängig überschrieben werden.
- Grafiksymbole referenzieren primär `key`/Portrollen und nicht zufällige Textpositionen.

---

# 5. FunctionTemplateSet

Ein Artikel kann ein oder mehrere Template-Sets besitzen.

Grund:

- Produktvarianten
- optionales Zubehör
- unterschiedliche Kontaktbestückungen
- unterschiedliche Darstellungsschemata
- regionale Varianten

```text
id
article_id
name
variant_key
function_templates[]
compatibility_rules[]
```

Ein Device speichert, aus welchem Set seine Funktionen ursprünglich erzeugt wurden, bleibt danach aber als Projektobjekt eigenständig.

---

# 6. Artikelwechsel

Die im v0-UI vorgesehene Aktion **„Artikel tauschen“** benötigt eine kontrollierte Migration.

Ablauf:

1. neuen Article wählen
2. dessen FunctionTemplateSet laden
3. bestehende Functions anhand stabiler Rollen/Keys vergleichen
4. kompatible Funktionen zuordnen
5. neue Funktionen hinzufügen
6. entfallende Funktionen nicht still löschen
7. Konflikte dem Benutzer anzeigen
8. bestehende Leitungsverbindungen möglichst erhalten
9. Aufbauabmessungen aktualisieren
10. Prüfungen neu ausführen

Beispiel Konflikt:

```text
Alt: 1 Schließer-Hilfskontakt vorhanden und verwendet
Neu: kein Hilfskontakt vorhanden
```

Dann muss der Artikelwechsel blockiert oder als bewusst zu lösender Konflikt dargestellt werden.

---

# 7. Device-Instanziierung

Beim Einfügen eines Artikels wird nicht nur ein Symbol erzeugt.

Stattdessen:

```text
Article
  → Device
  → Functions aus FunctionTemplateSet
  → ConnectionPoints aus ConnectionTemplates
  → ausgewählte Function erhält SchematicPlacement
```

Andere Funktionen des Geräts können zunächst unplatziert bleiben.

Der Navigator kann deshalb anzeigen:

```text
-K1
 ├─ Leistungskontakte   platziert
 ├─ Spule               platziert
 └─ Hilfskontakt        nicht platziert
```

---

# 8. Beispiel: mehrfunktionales Schütz

Illustratives Modell eines dreipoligen Schützes mit Spule und Hilfskontakt:

```text
Device -K1
├─ Function: coil
│  ├─ A1
│  └─ A2
├─ Function: power_contact_1
│  ├─ 1L1
│  └─ 2T1
├─ Function: power_contact_2
│  ├─ 3L2
│  └─ 4T2
├─ Function: power_contact_3
│  ├─ 5L3
│  └─ 6T3
└─ Function: aux_no_1
   ├─ 13
   └─ 14
```

Das ist ein Gerätebeispiel und keine verbindliche Aussage über einen konkreten Herstellerartikel.

In der Stückliste bleibt es **ein Device**.

Im Stromlaufplan kann es auf mehreren Seiten dargestellt sein.

Im Aufbau besitzt es normalerweise **eine** mechanische Platzierung.

---

# 9. Main Function

Ein Device darf eine `main_function_id` besitzen.

Sie dient unter anderem für:

- bevorzugte Navigation
- Artikel-/Gerätebeschriftung
- Standardplatzierung
- Querverweis-Startpunkt

Die Main Function ist keine zweite Geräteidentität.

Wenn mehrere Funktionen als Hauptfunktion geeignet wären, entscheidet Template oder Benutzer.

---

# 10. SymbolDefinition

`SymbolDefinition` ist ein wiederverwendbares Bibliotheksobjekt.

```text
id
library_id
name
symbol_class
standard_profile?
version
geometry
ports[]
text_anchors[]
variants[]
bounding_box
metadata{}
```

Es enthält keine:

- Device-ID
- Function-ID
- Projekt-BMK
- fest verdrahtete Herstellerartikel-ID

---

# 11. SymbolPort

Der grafische Anschluss eines Symbols ist ein `SymbolPort`.

```text
key
position
orientation
role_hint
connection_type_hint?
```

Beim Placement wird der SymbolPort explizit einem fachlichen ConnectionPoint zugeordnet.

```text
SymbolPort coil_a1
        ↓ binding
ConnectionPoint A1
```

Damit kann ein Symbol für mehrere Artikel mit unterschiedlichen sichtbaren Anschlussbezeichnungen verwendet werden.

---

# 12. PortBinding

`SchematicPlacement` speichert eine Bindung:

```text
port_bindings[]
  symbol_port_key
  connection_point_id
```

Prüfungen erkennen:

- fehlende Bindungen
- doppelte unzulässige Bindungen
- falschen Anschlusstyp
- ConnectionPoint ohne passenden SymbolPort

---

# 13. SymbolVariant

Varianten beschreiben alternative Darstellungen derselben Symbolklasse.

Mögliche Merkmale:

```text
horizontal
vertical
left_to_right
right_to_left
normally_open
normally_closed
single_line
multi_line
compact
expanded
```

Eine Variant darf Geometrie und Portpositionen ändern, nicht aber unbemerkt die fachliche Funktion austauschen.

---

# 14. SymbolMapping

`SymbolMapping` verbindet FunctionTemplate und passende Symbolklasse/-varianten.

```text
id
function_template_id
symbol_definition_id
preferred_variant_id?
representation_context
priority
```

`representation_context` kann beispielsweise sein:

```text
schematic_multiline
schematic_singleline
overview
terminal_plan
```

Dadurch kann dieselbe Function in unterschiedlichen Dokumenttypen anders dargestellt werden.

---

# 15. Textanker

Symbole enthalten keine fest eingebrannten Projekttexte.

Stattdessen:

```text
TextAnchor
  key
  position
  alignment
  rotation
  default_expression
  visibility_rule
```

Beispielausdrücke:

```text
{device.reference}
{function.description}
{article.type_designation}
{connection.A1.designation}
{cross_reference}
```

Die endgültige Ausdruckssyntax wird später definiert.

---

# 16. Sichtbare Texte und Overrides

Ein Placement kann lokale Darstellungsänderungen speichern:

```text
text_overrides
hidden_text_anchors
manual_text_offsets
```

Dabei gilt:

- BMK-Wert bleibt fachliche Device-Eigenschaft.
- Nur seine Darstellung darf lokal verschoben/versteckt werden.
- Ein Textoverride darf nicht versehentlich eine zweite fachliche Wahrheit erzeugen.

---

# 17. Parameterisierte Symbole

Bestimmte Symbole können parameterisiert sein.

Beispiele:

- Anzahl Pole
- Anzahl Pins
- SPS-Kanalblock
- Klemmenblock
- Black Box mit variabler Anschlusszahl

Parameter verändern kontrolliert:

```text
geometry
ports
text anchors
```

Die resultierenden Ports müssen weiterhin explizit an ConnectionPoints gebunden sein.

---

# 18. Macros

Ein Makro ist größer als ein Symbol.

`MacroDefinition` beschreibt eine wiederverwendbare Platzierungs-/Schaltungsstruktur.

Kann enthalten:

- mehrere Function-Platzierungen
- mehrere Gerätevorlagen
- Verbindungen
- Texte
- grafische Objekte
- relative Positionen
- Parameter

Ein Makro ist **keine** dauerhafte Containeridentität im Projekt.

Beim Einfügen entstehen normale Projektobjekte und stabile IDs.

---

# 19. DeviceMacro vs. CircuitMacro

Unterscheidung:

### DeviceMacro

Mehrere Darstellungen/Funktionen eines Geräts oder einer Gerätebaugruppe.

### CircuitMacro

Vollständiger Schaltungsausschnitt mit mehreren Devices und Connections.

Beide verwenden nach dem Einfügen dieselben Domänenobjekte wie manuell erzeugte Projektteile.

---

# 20. Mechanische Darstellung

Die mechanische Frontansicht ist **nicht** dasselbe Objekt wie das Stromlaufplansymbol.

`MechanicalRepresentation`:

```text
id
article_id?
name
representation_type
width_mm
height_mm
depth_mm?
width_te?
mounting_type
front_geometry
mounting_anchor
label_anchors[]
```

Mögliche `representation_type`:

```text
front
side
mounting_plate
rail_front
door_front
```

Ein Article kann mehrere mechanische Darstellungen besitzen.

---

# 21. Herstellerdaten und neutrale Bibliothek

Herstellerdaten dürfen das Kernmodell nicht bestimmen.

Importer übersetzen externe Daten in:

```text
Article
FunctionTemplateSet
MechanicalRepresentation
SymbolMapping
```

Fehlende Daten sind erlaubt und werden als Datenqualitätsstatus geführt.

---

# 22. Datenqualität

Jedes importierte Bibliotheksobjekt kann besitzen:

```text
source
source_version
source_updated_at
quality_state
verified_fields[]
unverified_fields[]
```

Mögliche Zustände:

```text
complete
partial
manual
imported_unverified
verified
```

Damit kann das Einfügezentrum die bereits im v0-Design vorgesehene Datenqualität anzeigen.

---

# 23. Bibliotheksversionierung

Symbol- und Templateänderungen dürfen bestehende Projekte nicht unkontrolliert verändern.

Deshalb speichert ein Placement/Device mindestens:

```text
source_definition_id
source_definition_version
```

Bei Bibliotheksupdates:

- Projekt bleibt zunächst reproduzierbar.
- Update wird explizit angeboten.
- Änderung kann als Diff angezeigt werden.
- Migration wird über Undo/Redo rücksetzbar.

---

# 24. Projektportabilität

Das Projektformat muss festlegen, wie benötigte Bibliotheksstände verfügbar bleiben.

Bevorzugtes Modell:

- globale Bibliothek enthält Masterdaten
- Projekt speichert verwendete Versionen / IDs
- notwendige Definitionen können als Projekt-Snapshot eingebettet werden

Damit bleibt ein altes Projekt auch nach Katalogänderungen renderbar.

---

# 25. Eigene Symbole

Benutzer können eigene SymbolDefinitions anlegen.

Der Symbol-Editor muss mindestens unterstützen:

- Vektorgeometrie
- Ports
- Textanker
- Varianten
- Symbolklasse
- Prüfregeln
- Vorschau mit Test-Function

Speichern ist nur erlaubt, wenn mindestens die interne Symbolkonsistenz geprüft wurde. Warnungen dürfen bewusst bestätigt werden.

---

# 26. Eigene FunctionTemplates

Eigene Artikel oder freie Geräte benötigen editierbare FunctionTemplates.

Beispiel:

```text
Black Box
├─ Input 1
├─ Input 2
├─ Output 1
└─ PE
```

Dies erlaubt Projekte ohne Herstellerkatalog.

---

# 27. Validierungsregeln

Mindestens folgende Befunde:

```text
FUNCTION_WITHOUT_CONNECTIONS
REQUIRED_FUNCTION_MISSING
REQUIRED_FUNCTION_UNPLACED
SYMBOL_PORT_UNBOUND
CONNECTION_POINT_WITHOUT_PORT
INCOMPATIBLE_SYMBOL_PORT
DUPLICATE_FUNCTION_PLACEMENT
ARTICLE_TEMPLATE_CONFLICT
ARTICLE_CHANGE_ORPHANED_CONNECTION
MISSING_MECHANICAL_REPRESENTATION
```

Severity kommt aus dem RuleProfile.

---

# 28. Löschen

Drei getrennte Aktionen:

### Darstellung löschen

Nur `SchematicPlacement` entfernen.

### Funktion entfernen

Function + deren ConnectionPoints entfernen; bestehende Verbindungen müssen vorher aufgelöst oder bestätigt werden.

### Gerät löschen

Device mit allen Funktionen, Platzierungen, Aufbauplatzierung und abhängigen Beziehungen entfernen.

Die UI muss diese Ebenen sprachlich eindeutig unterscheiden.

---

# 29. Kopieren

### Placement kopieren

Standardmäßig entsteht **eine weitere Darstellung derselben Function** nur dann, wenn der FunctionType Mehrfachdarstellung erlaubt oder Benutzer dies bewusst wählt.

### Gerät kopieren

Erzeugt neue Device-ID, neue Function-IDs, neue ConnectionPoint-IDs und neues BMK nach Nummerierungsregel.

### Schaltung kopieren

Erzeugt einen vollständigen neuen Objektgraphen; interne Beziehungen werden auf die neuen IDs umgebogen.

---

# 30. Querverweise

Querverweise sind Ergebnis der Beziehung:

```text
Device
  ↕
Functions
  ↕
Placements
```

Nicht Ergebnis gleicher Textwerte.

Ein Kontakt kann deshalb zuverlässig zur Spule desselben Geräts navigieren.

---

# 31. Navigation

Von einer Function/Placement muss mindestens möglich sein:

- Hauptfunktion anzeigen
- nächste/vorherige Platzierung desselben Geräts
- alle Funktionen anzeigen
- Artikel öffnen
- Aufbauposition öffnen
- verbundene ConnectionPoints anzeigen

Der Back-Stack der UI bleibt unabhängig davon erhalten.

---

# 32. Offene Punkte für v0.2

- genaue Symbol-Vektorprimitive
- Expression-Sprache für Textanker
- Bibliotheks-Dateiformat
- Artikel-Importer-Mapping
- parametrische Symbol-Engine
- Makroparameter und Variantensystem
- Zubehör-/Baugruppenmodell
- Regeln für mehrfache Platzierung je FunctionType

---

# 33. Konsequenz für Rust

Spätere Rust-Module sollten mindestens logisch trennen:

```text
catalog
library
project_domain
schematic
validation
cabinet
```

Es soll **keine** zentrale `Symbol`-Struct geben, die gleichzeitig Herstellerartikel, Projektgerät, elektrische Funktion und Grafik repräsentiert.
