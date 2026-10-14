# Klemmen- und Kabelmodell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument definiert Klemmenleisten, Einzel-/Mehrstockklemmen, Brücken, Kabel und Kabeladern so, dass Stromlaufplan, Klemmenplan, Kabelliste und Verdrahtung aus demselben elektrischen Graphen erzeugt werden können.

---

# 1. Grundsatz

Klemmen- und Kabeldaten werden nicht separat für Auswertungen nachgepflegt.

```text
Schematic / Electrical Graph
            ↓
Terminal / Cable domain objects
            ↓
Terminal plan / Cable list / Wiring list
```

Eine Änderung im Stromlaufplan muss deshalb in den Auswertungen sichtbar werden, ohne dass dieselbe Information nochmals manuell eingetragen wird.

---

# 2. TerminalStrip

Eine Klemmenleiste ist ein fachlicher Container mit stabilem Bezug.

```text
id
designation
structure_assignments[]
description
mounting_context?
sort_order
properties{}
```

Beispiel:

```text
-X1
```

Das vollständige sichtbare Kennzeichen wird über das Referenzkennzeichenprofil formatiert.

---

# 3. Terminal

Eine `Terminal` ist ein physisches Element innerhalb einer TerminalStrip.

```text
id
terminal_strip_id
position_index
designation
article_id?
terminal_type
levels[]
locked_order
properties{}
```

Beispiele für sichtbare TerminalDesignations:

```text
1
2
17
PE
N
```

Vollständige Anzeige:

```text
-X1:17
```

Die Terminal-ID bleibt stabil, auch wenn die sichtbare Klemmennummer geändert wird.

---

# 4. Warum Terminal nicht nur Text ist

Eine Klemme kann besitzen:

- Herstellerartikel
- mehrere Ebenen
- interne Connectivity
- Brückenmöglichkeiten
- PE-Funktion
- Trennfunktion
- Zubehör
- mehrere elektrische Anschlussstellen

Deshalb wird sie als echtes Domänenobjekt modelliert.

---

# 5. TerminalLevel

Mehrstockklemmen besitzen Ebenen.

```text
id
terminal_id
level_index
level_name?
level_type
connection_points[]
internal_connectivity[]
```

Beispiel:

```text
Terminal 17
├─ Level 1: A ↔ B
├─ Level 2: C ↔ D
└─ PE-Level: E ↔ PE
```

---

# 6. TerminalType

Startwerte:

```text
feed_through
protective_earth
neutral
disconnect
fuse
multi_level
sensor_actuator
plug_connector
custom
```

TerminalType beeinflusst Validierung und Standarddarstellung, nicht die Objektidentität.

---

# 7. Terminal ConnectionPoints

Die elektrischen Anschlüsse einer Klemme sind normale `ConnectionPoint`-Objekte.

Sie können Rollen besitzen:

```text
external
internal
bridge
pe
shield
```

Diese Rolle dient insbesondere der Klemmenplandarstellung.

Beispiel:

```text
Kabelseite ─ CP external [Terminal] CP internal ─ Schaltschrankseite
```

---

# 8. Interne Connectivity

Eine Durchgangsklemme kann definieren:

```text
external ↔ internal permanent
```

Eine Trennklemme kann andere statische Regeln besitzen.

Diese Connectivity kommt aus Terminal-/FunctionTemplate und wird nicht aus Liniengeometrie geraten.

---

# 9. PE-Klemmen

PE-Klemmen besitzen eine explizite semantische Rolle.

Mögliche Beziehungen:

```text
terminal connection point
  ↕
PE potential / protective structure
```

Eine grüne Darstellung allein erzeugt keine PE-Semantik.

---

# 10. TerminalBridge

Brücken werden als eigene Objekte modelliert.

```text
id
terminal_strip_id
bridge_type
connection_point_ids[]
article_id?
color?
properties{}
```

Typen:

```text
fixed_bridge
jumper_wire
comb_bridge
plug_in_bridge
custom
```

Eine Bridge erzeugt eine definierte elektrische Beziehung zwischen den betroffenen ConnectionPoints.

---

# 11. Brücken und Netzgraph

Bridge ist kein rein grafisches Zeichen.

Beim Anlegen einer elektrischen Brücke wird der Netzgraph konsistent aktualisiert bzw. verbunden.

Der Renderer kann dieselbe Bridge unterschiedlich darstellen in:

- Stromlaufplan
- Klemmenplan
- Aufbau

---

# 12. TerminalAccessories

Spätere Erweiterung:

```text
end_plate
end_bracket
marker_carrier
separator
partition
bridge_accessory
```

Diese Elemente können Artikel und Stücklistenpositionen sein, müssen aber nicht dieselbe elektrische Semantik wie Terminal besitzen.

---

# 13. Reihenfolge einer Klemmenleiste

Die physische Reihenfolge ist unabhängig von der sichtbaren Klemmennummer.

```text
position_index
```

Beispiel:

```text
position 1 → Terminal designation 1
position 2 → Terminal designation 2
position 3 → Terminal designation PE
position 4 → Terminal designation 3
```

Dadurch sind Sonderklemmen zwischen Nummern möglich.

---

# 14. Auto-Nummerierung von Klemmen

Nummerierungsprofil kann definieren:

```text
start
step
prefix
skip_pe
skip_named_terminals
reuse_gaps
```

Manuelle Klemmennummern müssen möglich sein.

Renummerierung arbeitet wie BMK-Renummerierung mit Preview + Undo.

---

# 15. TerminalStripManager

Der Klemmenmanager zeigt mindestens:

```text
Position
Klemmennummer
Typ
Ebene
Potential
Ziel extern
Ziel intern
Brücken
Artikel
Befunde
```

Operationen:

- Reihenfolge ändern
- Nummerieren
- Brücken setzen/lösen
- Artikel ändern
- Ebenen prüfen
- unplatzierte Klemmen anzeigen
- zum Stromlaufplan springen

---

# 16. TerminalPlan

Der Klemmenplan ist eine generierte Dokumentansicht.

Er verwendet:

```text
TerminalStrip
Terminals
TerminalLevels
ConnectionPoints
ElectricalConnections
Cables/Cores
Bridges
CrossReferences
```

Er besitzt keine unabhängige zweite Verkabelungsdatenbank.

---

# 17. Seitenaufteilung Klemmenplan

Große Klemmenleisten können über mehrere Dokumentseiten verteilt werden.

Die Aufteilung ist Präsentationslogik:

```text
terminals_per_page
available_height
column_template
```

Die TerminalStrip bleibt ein Objekt.

---

# 18. Cable

Ein `Cable` ist ein physisches Mehraderobjekt.

```text
id
local_designation
structure_assignments[]
article_id?
description
source_context?
target_context?
length?
route?
status
properties{}
```

Beispiel sichtbares Kennzeichen:

```text
-W1
```

---

# 19. CableType / Artikeldaten

Kabelartikel können liefern:

```text
core_count
nominal_cross_section
shielded
outer_diameter
material
color
manufacturer data
```

Projektobjekt und Artikel bleiben getrennt.

---

# 20. CableCore

```text
id
cable_id
core_index
core_designation
color?
cross_section?
pe_role
reserve
from_connection_point_id?
to_connection_point_id?
electrical_connection_ids[]
properties{}
```

CoreDesignation kann sein:

```text
1
2
3
N
PE
WH
BN
```

Sie ist nicht die stabile ID.

---

# 21. Aderzuweisung

Eine CableCore kann eine Verbindung zwischen zwei ConnectionPoints realisieren.

Workflow:

1. Cable auswählen/erzeugen
2. Core auswählen
3. elektrische Verbindung zuordnen
4. Endpunkte aus Graph übernehmen
5. Querschnitt/Farbe prüfen
6. Kabel-/Klemmenauswertung aktualisieren

---

# 22. Eine Ader – mehrere grafische Segmente

Eine CableCore kann durch mehrere ConnectionPathPlacements dargestellt werden, wenn die Verbindung über Fortsetzungen/Seiten läuft.

Die physische Ader bleibt ein Objekt.

---

# 23. Reserveadern

```text
reserve = true
```

Reserveader darf ohne elektrische Endpunkte existieren.

Sie erscheint in Kabelliste als Reserve und erzeugt keinen Fehler „unverbunden“.

Projektprofile können Mindestreserve fordern.

---

# 24. PE-Adern

Eine CableCore kann `pe_role=true` besitzen.

Dies ist fachlich getrennt von:

- physischer Aderfarbe
- Potentialdefinition PE
- Renderfarbe

Prüfregeln vergleichen diese Informationen auf Plausibilität.

---

# 25. Schirm

Kabelschirm ist kein normaler nummerierter Leiter.

`CableShield`:

```text
id
cable_id
shield_type
termination_points[]
properties{}
```

Terminierung kann sein:

```text
one_end
two_end
via_terminal
direct_pe
not_connected
```

Die genaue EMV-Bewertung ist nicht Aufgabe des Core; das Modell dokumentiert die geplante Verbindung.

---

# 26. CableCoreAssignment

Um Änderungen nachvollziehbar zu halten, kann die Zuordnung explizit modelliert werden:

```text
id
cable_core_id
electrical_connection_id
assignment_role
```

Eine Ader darf standardmäßig nicht widersprüchlich mehreren unabhängigen Verbindungen zugewiesen werden.

---

# 27. Kabel über Klemmen

Typischer Fall:

```text
Field Device
  ↕ CableCore
-X1 external
[Terminal]
-X1 internal
  ↕ internal wire
Cabinet Device
```

Der Klemmenplan kann daraus automatisch externe und interne Ziele bestimmen.

---

# 28. Zielermittlung

„Ziel extern/intern“ wird nicht als manuell gepflegter Text gespeichert.

Es wird aus Graph + Terminal-Rollen berechnet.

Manuelle Anzeigetexte sind nur Override/Kommentar.

---

# 29. CableList

Generierte Kabelliste kann enthalten:

```text
Kabel-BMK
Artikel/Typ
Von
Nach
Aderzahl
Querschnitt
Länge
Reserveadern
Schirm
Befunde
```

Die Spalten sind Dokument-/Exportprofil.

---

# 30. CoreList

Optional detaillierte Aderliste:

```text
Kabel
Ader
Farbe
Querschnitt
Von BMK:Anschluss
Nach BMK:Anschluss
Potential
```

---

# 31. WiringList

Verdrahtungsliste umfasst sowohl Einzeladern/Drähte als auch Kabeladern.

Ausgabe wird aus:

```text
ElectricalConnections
Wire
CableCoreAssignments
ConnectionPoints
```

generiert.

---

# 32. Cable Manager

Tabellarische Bearbeitung:

- Kabel anlegen
- Artikel zuweisen
- Adern verwalten
- Endpunkte anzeigen
- Reserve markieren
- Aderzuweisung ändern
- Schirm verwalten
- zum Stromlaufplan springen
- nur Befunde filtern

---

# 33. Auto-Zuordnung von Adern

Optionale Automatik:

```text
assign_next_free_core
```

Sie darf nur Vorschläge machen bzw. deterministisch freie Adern zuweisen.

Bestehende manuelle Zuweisungen werden nicht ungefragt überschrieben.

---

# 34. Mehradrige Leistungskabel

Bei einem typischen Mehrphasenanschluss können mehrere CableCores logisch zu einer Cable gehören.

Das Cable-Objekt gruppiert sie, aber die einzelnen Netze bleiben getrennt.

```text
L1 → core 1
L2 → core 2
L3 → core 3
N  → core 4
PE → core 5
```

Das Kabel verbindet nicht automatisch alle Potentiale miteinander.

---

# 35. Kabeldarstellung im Stromlaufplan

Darstellungsoptionen können sein:

- Kabelklammer / Gruppensymbol
- Kabel-BMK an Adern
- Adernummer/-farbe
- Querschnitt
- Zielverweis

Das sind renderer-/profilabhängige Darstellungselemente.

---

# 36. Connector / Steckverbinder

Steckverbinder können dieselbe Grundlogik wie TerminalStrip verwenden, benötigen aber eventuell ein eigenes spezialisiertes Modell.

Für v0.1:

- ConnectionPoints bleiben normale elektrische Knoten
- Pins besitzen stabile IDs
- sichtbare Pin-Nummern sind Eigenschaften

Vertiefung folgt später.

---

# 37. Prüfregeln Klemmen

Mindestens:

```text
DUPLICATE_TERMINAL_DESIGNATION
TERMINAL_WITHOUT_ARTICLE
TERMINAL_LEVEL_INVALID
TERMINAL_CONNECTION_OVER_CAPACITY
BRIDGE_CONFLICT
BRIDGE_DIFFERENT_POTENTIALS
UNPLACED_TERMINAL
TERMINAL_TARGET_UNRESOLVED
```

Severity kommt aus RuleProfile.

---

# 38. Prüfregeln Kabel

Mindestens:

```text
DUPLICATE_CABLE_DESIGNATION
CABLE_CORE_USED_MULTIPLE_TIMES
CABLE_CORE_ENDPOINT_MISMATCH
CABLE_CORE_CROSS_SECTION_MISMATCH
CABLE_CORE_COLOR_POTENTIAL_WARNING
CABLE_CORE_COUNT_EXCEEDED
CABLE_WITHOUT_ARTICLE
UNUSED_CORE
MISSING_REQUIRED_PE
SHIELD_TERMINATION_MISSING
```

Nicht jede Regel ist immer Error; das Projektprofil bestimmt Severity.

---

# 39. Löschen

Löschen einer Klemme oder Ader mit bestehenden Beziehungen ist eine abhängige Operation.

UI zeigt Auswirkungen:

```text
3 Connections betroffen
1 CableCore-Zuweisung betroffen
2 Dokumentauswertungen ändern sich
```

Erst danach Transaktion ausführen.

---

# 40. Umordnen

Das Verschieben einer Terminal innerhalb der Strip ändert `position_index`, nicht die stabile Terminal-ID.

Alle Verbindungen bleiben bestehen.

Je nach Nummerierungsprofil kann sichtbare Nummer separat gleich bleiben oder anschließend neu nummeriert werden.

---

# 41. Import

Externe Klemmen-/Kabellisten werden später über Importadapter auf stabile Objekte gemappt.

Import muss zwischen:

- neues Objekt
- bestehendes Objekt aktualisieren
- Konflikt

unterscheiden.

Keine Identifikation ausschließlich über aktuelle Tabellenzeile.

---

# 42. Offene Punkte v0.2

- Zubehör/BOM von Klemmenleisten
- Endhalter/Abschlussplatten
- Steckverbinderfamilien
- Potentialverteiler
- mehrstöckige Brückenregeln
- Kabelbündel
- Kabelwege/Routing
- Längenberechnung
- Aderendbehandlung
- Beschriftungs-/Markerexport

---

# 43. Konsequenz für Rust

Klemmenplan und Kabelliste dürfen keine eigene fachliche Datenhaltung erhalten.

Sie sind Projektionen aus stabilen Domänenobjekten:

```text
project domain
  → query/projection
  → terminal plan model
  → renderer/export
```

Damit bleiben Editor, Datenmanager und PDF konsistent.
