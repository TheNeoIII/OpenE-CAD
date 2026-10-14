# Elektrisches Modell: Anschlüsse, Leitungen, Netze und Potentiale

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument vertieft den elektrisch wichtigsten Teil des OpenE-CAD-Datenmodells. Ziel ist, dass die Software elektrische Zusammenhänge aus dem Domänenmodell kennt und nicht aus zufällig berührenden Linien ableiten muss.

---

## 1. Grundsatz

OpenE-CAD trennt vier Ebenen:

```text
1. ConnectionPoint        fachlicher Anschluss
2. Net                    elektrische Verbundenheit
3. ElectricalConnection   konkrete logische Verbindung
4. ConnectionPath         grafische Darstellung / Routing
```

Eine gezeichnete Linie ist damit **nicht automatisch** die elektrische Wahrheit.

---

# 2. ConnectionPoint

Jeder fachlich relevante Anschluss ist ein `ConnectionPoint`.

Beispiele:

- Schützspule A1/A2
- Kontakt 13/14
- Leistungskontakt 1L1/2T1
- Leitungsschutzschalter 1/2
- Klemme 17
- Motorklemme U/V/W/PE
- SPS-Kanal
- Kabelader-Ende

Minimaldaten:

```text
id
function_id
designation
connection_type
electrical_role
direction
```

Optional:

```text
max_connections
potential_constraint
signal_type
pin_number
channel_role
properties
```

---

# 3. Anschlussrollen

`connection_type` beschreibt die technische Klasse.

Startmenge:

```text
power
control
signal
neutral
protective_earth
shield
bus
communication
measurement
custom
```

`electrical_role` beschreibt die Rolle innerhalb der Funktion, z. B.:

```text
input
output
bidirectional
source
sink
passive
protective
```

Diese Felder dienen Prüfungen und Navigation, nicht der automatischen Simulation.

---

# 4. Anschlussrichtung

Richtung ist nicht zwingend physikalischer Stromfluss.

Sie unterstützt:

- SPS-I/O
- Signalfluss
- Funktionsprüfung
- automatische Darstellung

Mögliche Werte:

```text
in
out
inout
passive
undefined
```

Ein passiver Leistungskontakt benötigt beispielsweise keine erzwungene Quelle/Ziel-Semantik.

---

# 5. Net

Ein `Net` repräsentiert eine elektrisch zusammenhängende Menge von Anschlussknoten.

Beispiel:

```text
Net N-4711
├─ -F1:2
├─ -X1:17
├─ -M1:U
└─ mehrere grafische Leitungssegmente
```

Eigenschaften:

```text
id
name?
potential_id?
net_class
properties
```

`connection_point_ids` können als Index berechnet werden, müssen aber nicht die einzige gespeicherte Topologie sein.

---

# 6. Elektrische Topologie als Graph

Elektrische Verbindungen bilden einen Graphen.

Knoten können sein:

- ConnectionPoint
- JunctionNode
- ContinuationNode

Kanten:

- ElectricalConnection

```text
ConnectionPoint ─ Connection ─ Junction ─ Connection ─ ConnectionPoint
```

Damit lassen sich T-Verteilungen explizit abbilden.

---

# 7. JunctionNode

Ein `JunctionNode` ist ein expliziter elektrischer Verbindungsknoten ohne eigenes Gerät.

Eigenschaften:

```text
id
net_id
```

Grafische Platzierung:

```text
sheet_id
position
junction_style
```

Typischer Stil:

- Punkt
- kein Punkt, wenn Firmenprofil dies für bestimmte Situationen zulässt

Die Fachlogik bleibt vom sichtbaren Punkt getrennt.

---

# 8. Kreuzung ist nicht Verbindung

Zwei grafische Leiter, die sich kreuzen, werden standardmäßig **nicht** verbunden.

Elektrische Verbindung entsteht nur durch:

- gemeinsames ConnectionPoint-Ziel
- expliziten JunctionNode
- explizite Benutzeraktion „verbinden“

Dadurch sind versehentliche Netzzusammenführungen ausgeschlossen.

---

# 9. ElectricalConnection

Eine `ElectricalConnection` verbindet zwei elektrische Knoten.

```text
id
from_node_ref
to_node_ref
net_id
connection_class
wire_id?
properties
```

`node_ref` kann zeigen auf:

- ConnectionPoint
- JunctionNode
- ContinuationNode

---

# 10. Grafischer Verbindungspfad

`ConnectionPathPlacement` stellt eine ElectricalConnection auf einer Seite dar.

```text
id
electrical_connection_id
sheet_id
points[]
routing_mode
locked_segments[]
appearance_override?
```

Punkte sind geometrische Wegpunkte.

### Routing-Modi

```text
orthogonal_auto
orthogonal_manual
free
```

Für normale Stromlaufpläne ist `orthogonal_auto` Standard.

---

# 11. Segment-Sperren

Benutzer kann einen Teil einer Leitung bewusst positionieren.

Deshalb benötigt der Router segmentbezogene Sperren.

Beispiel:

```text
A ─────┐
       │  <- dieses vertikale Segment ist gesperrt
       └──── B
```

Auto-Routing darf gesperrte Geometrie nicht ungefragt verändern.

---

# 12. Anschluss eines Leitungswerkzeugs

Empfohlener Workflow:

1. Start-ConnectionPoint anklicken
2. Preview-Pfad folgt Cursor
3. Auto-Routing schlägt orthogonalen Weg vor
4. Zwischenpunkt optional setzen
5. Ziel-ConnectionPoint oder bestehendes Net anklicken
6. elektrische Verbindung wird erzeugt
7. Net-/Potentialregeln werden geprüft

Nicht nur Linien zeichnen und später interpretieren.

---

# 13. Verbindung mit bestehendem Net

Wird auf ein bestehendes Leitersegment geklickt, erzeugt OpenE-CAD logisch:

```text
bestehende Connection
→ Auftrennung am Punkt
→ JunctionNode
→ neue Connection zum neuen Ziel
```

Der Benutzer sieht weiterhin eine normale T-Verbindung.

---

# 14. PotentialDefinition

Potential ist die fachliche elektrische Kennzeichnung eines Netzes oder einer Netzgruppe.

Eigenschaften:

```text
id
name
potential_type
nominal_voltage?
frequency?
polarity?
description
appearance_profile_ref?
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
230V_CTRL
EXT_24V
```

---

# 15. PotentialType

Startmenge:

```text
phase
neutral
protective_earth
dc_positive
dc_negative
control
signal
foreign_voltage
measurement
bus
custom
```

PotentialType ist semantisch. Darstellungsfarbe stammt aus dem Appearance-/Potentialprofil.

---

# 16. Potentialzuweisung

Ein Net kann:

```text
A) explizit ein Potential besitzen
B) Potential aus verbundenem Ursprung erben
C) zunächst unbekannt sein
```

Das System darf unbekannte Netze erlauben und später prüfen.

---

# 17. Potentialquellen

Bestimmte Funktionen können ein Potential explizit definieren oder benennen.

Beispiele:

- Einspeiseklemme
- Potentialpfeil
- Netzanschluss
- Netzteil-Ausgang
- SPS-Spannungsversorgung

Ein Potential wird nicht allein aus Leitungsfarbe erkannt.

---

# 18. Potentialfortsetzung über Seiten

Seitenübergreifende Potentiale benötigen ein explizites Objekt.

## 18.1 ContinuationNode

```text
id
continuation_key
potential_id?
role
```

`continuation_key` verbindet Fortsetzungspaare bzw. -gruppen.

Grafische Platzierung enthält:

```text
sheet_id
position
direction
label_style
```

Sichtbare Referenz wird aus Zielplatzierung berechnet.

---

# 19. Fortsetzungsarten

Mindestens:

```text
incoming
outgoing
bidirectional
potential_bar
```

Die sichtbare Pfeilrichtung ist Darstellungs-/Leserichtung, nicht zwingend Stromfluss.

---

# 20. Seitenrand-Verweise

Im v0-Design erscheinen beispielsweise orange Verweislabels am Seitenrand.

Fachlich enthalten sie:

```text
target_placement_id
potential/net reference
```

Renderer berechnet sichtbare Daten wie:

```text
/4.1
/5.A2
```

abhängig vom Projektprofil.

---

# 21. Potentialvererbung

Potentiale propagieren über normale passive Verbindungen.

Nicht automatisch propagieren über Komponenten, die Netze fachlich trennen, z. B.:

- Schaltkontakte
- Sicherungen als eigenes Funktionsobjekt je nach Modell
- Transformatoren
- Netzteile
- Relaiskontakte
- Mess-/Trennelemente

Wichtig: OpenE-CAD betreibt keine vollständige elektrische Simulation. Ob ein FunctionType Potentialkontinuität zulässt, ist eine **Topologieeigenschaft der Funktion**.

---

# 22. Function Connectivity Model

Jede Function kann intern festlegen, welche ConnectionPoints topologisch zusammengehören.

Beispiele:

### Durchgangsklemme

```text
1 ↔ 2 dauerhaft verbunden
```

### Sicherung

Je nach Modell:

```text
1 ↔ 2 als durchgehender elektrischer Pfad für Dokumentationszwecke
```

### Schließerkontakt

```text
13 ↔ 14 nicht als statisch dasselbe Net behandeln
```

Das System kennt also Anschlussbeziehungen, simuliert aber keinen Schaltzustand.

---

# 23. Netze über schaltende Funktionen

Die beiden Seiten eines Kontakts gehören **nicht** zum selben statischen Net.

Beispiel:

```text
L1 ── 13 [Kontakt] 14 ── Lamp
```

Net A endet an 13.  
Net B beginnt an 14.

Die Function beschreibt die funktionale Beziehung zwischen 13 und 14, aber führt die Netze nicht zusammen.

Dies ist entscheidend für Potentialprüfung und Verdrahtung.

---

# 24. Geräteinterne feste Verbindungen

Ein Gerät kann interne permanente Verbindungen besitzen.

Beispiel Spezialgerät:

```text
X1 ↔ X2 intern verbunden
```

Dies wird als `InternalConnectivity` der Function/Device-Vorlage beschrieben.

Nicht als versteckte gezeichnete Leitung.

---

# 25. Potentialkonflikt

Ein Konflikt entsteht beispielsweise, wenn dasselbe Net gleichzeitig explizit unterschiedlichen inkompatiblen Potentialen zugeordnet wird.

Beispiel:

```text
+24V
   └─ Net N1 ─┐
              ├─ Junction
0V            │
   └─ Net N2 ─┘
```

Nach Verbindung entsteht ein Prüf-`error` oder `critical`, abhängig vom Profil.

Die Prüfung darf jedoch nicht behaupten, eine Anlage sei elektrisch sicher oder unsicher; sie prüft die Konsistenz der Projektdaten.

---

# 26. Potentialdarstellung

Default-Profil kann verwenden:

```text
N      → Blau
PE     → Grün
Steuer → Rot
Sonder → Violett
```

Aber:

```text
PotentialDefinition != Color
```

Theme und Druckprofil können andere Farben rendern.

---

# 27. Monochrome Darstellung

Für Schwarzweiß-Ausgabe kann ein AppearanceProfile alternative Linienstile definieren.

Beispiel:

```text
phase       solid
neutral     dashed
pe          dash-dot
control     solid + textual potential marker
```

Die genaue Standardzuordnung bleibt noch offen und wird nicht als Norm behauptet.

---

# 28. Draht / Wire

Eine `ElectricalConnection` muss im frühen Engineering nicht zwingend ein physisches Wire-Objekt besitzen.

Spätere Fertigungsstufe:

```text
ElectricalConnection
        ↓
Wire
```

Wire enthält:

```text
wire_number
cross_section
color
material
length
route
end_treatment
```

Ein Net kann aus mehreren physischen Drähten bestehen.

---

# 29. Leitungsattribute

Es muss unterschieden werden zwischen:

- Eigenschaften des Netzes/Potentials
- Eigenschaften einer konkreten physischen Ader
- reine Darstellungsattribute

Beispiel:

```text
Potential: N
Wire color physical: light blue
Canvas render color: blue
```

Diese drei Werte können zusammenhängen, sind aber nicht identisch.

---

# 30. Kabeladern

Eine CableCore kann eine ElectricalConnection bzw. einen Teil einer Verbindung realisieren.

```text
CableCore
├─ from_connection_point
├─ to_connection_point
├─ core_number
├─ color
└─ cross_section
```

Im Schaltplan wird die Kabelzugehörigkeit als Eigenschaft/Referenz dargestellt.

---

# 31. Klemmen

Terminal ConnectionPoints sind normale elektrische Anschlussknoten.

Klemme:

```text
extern ── CP-A [Terminal Function] CP-B ── intern
```

Je nach Klemmentyp kann interne Connectivity A ↔ B bestehen.

Dadurch kann der Klemmenplan aus demselben elektrischen Graphen erzeugt werden.

---

# 32. PE-Klemmen

PE-Klemmen besitzen spezielle semantische Eigenschaften, z. B. Verbindung zur Schutzleiterstruktur / Tragschiene, soweit das Projektmodell dies beschreibt.

Sie werden nicht nur durch grüne Farbe erkannt.

---

# 33. Mehrstockklemmen

Mehrstockklemmen benötigen mehrere Function-/ConnectionPoint-Gruppen innerhalb eines physischen Terminal-Devices.

Beispiel:

```text
Terminal 17
├─ Level 1: 1 ↔ 2
├─ Level 2: 3 ↔ 4
└─ PE-Level: 5 ↔ PE
```

Die genaue Modellierung wird in der Klemmen-Spezifikation vertieft.

---

# 34. SPS-I/O

PLCChannel besitzt einen ConnectionPoint.

Beispiel:

```text
%Q0.3
channel_type = digital_output
ConnectionPoint = OUT
```

Das angeschlossene Net kann zusätzlich Potential-/Signaltypen tragen.

Prüfungen können erkennen:

- doppeltes SPS-Adressobjekt
- Ausgang an Ausgang bei restriktivem Profil
- falscher Signaltyp

Keine Laufzeitsimulation der SPS.

---

# 35. Motor / Mehrphasenverbraucher

Mehrphasiges Gerät besitzt mehrere ConnectionPoints:

```text
U
V
W
PE
```

oder herstellerspezifische Anschlusskennzeichen.

Das Gerät wird nicht als ein „3-Phasen-Leitungsobjekt“ versteckt; die einzelnen Verbindungen bleiben explizit.

Komfortfunktionen dürfen mehrere Leiter gemeinsam erzeugen.

---

# 36. Mehrfachleitungswerkzeug

Perspektivisch kann ein Werkzeug mehrere zusammengehörige Leiter parallel verlegen.

Beispiel:

```text
L1 L2 L3 N PE
```

Intern entstehen weiterhin einzelne Nets/Connections.

Das Werkzeug ist nur eine Bedienvereinfachung.

---

# 37. Busse

Ein Bus darf nicht einfach wie mehrere normale Kupferleiter behandelt werden.

Geplantes Modell:

```text
BusNetwork
BusNode
BusConnection
```

Dies bleibt spätere Erweiterung. Das allgemeine ConnectionPoint-/Net-Modell muss aber genügend offen bleiben.

---

# 38. Löschen eines Leitungssegments

Bei grafischem Löschen muss unterschieden werden:

### Endsegment löschen

Kann ElectricalConnection entfernen.

### mittleres Segment löschen

Kann ein Net auftrennen.

Das System berechnet danach neue zusammenhängende Net-Komponenten.

Potentialzuweisungen werden auf Konsistenz geprüft.

---

# 39. Verschieben eines Symbols

Beim Verschieben einer SchematicPlacement bleiben seine ConnectionPoints fachlich identisch.

Der Router aktualisiert die ConnectionPaths.

Optionen:

```text
move_with_wires
stretch_wires
move_without_connections (nur mit Warnung / explizit)
```

Standard: Verbindungen erhalten.

---

# 40. Copy/Paste

Beim Kopieren eines Schaltungsbereichs müssen Netze korrekt gesplittet bzw. neu erzeugt werden.

Neue Geräte erhalten neue IDs.

PotentialDefinition kann je nach Kontext:

- wiederverwendet werden
- als lokales Potential neu erzeugt werden

Das genaue Verhalten wird über Copy/Paste-Regeln spezifiziert.

---

# 41. Automatische Netznamen

Netze können interne technische IDs besitzen, ohne sichtbaren Namen.

Sichtbare Netz-/Potentialnamen nur dort erzeugen, wo erforderlich.

Keine Notwendigkeit, jeden Draht mit einem automatisch sichtbaren Netznamen zu überladen.

---

# 42. Prüfregeln v0.1

Mindestens:

```text
E001 offene Pflichtverbindung
E002 unzulässiger Potentialkonflikt
E003 Verbindungstyp inkompatibel
E004 Anschluss überschreitet max_connections
E005 explizit unterschiedliches Potential im selben Net
E006 Kabelader mehrfach verwendet
E007 ConnectionPath ohne fachliche Connection
E008 fachliche Connection ohne darstellbare Platzierung, falls erforderlich
W001 Potential unbekannt
W002 physische Leiterdaten unvollständig
W003 unbenutzter Anschluss
```

Regelcodes sind vorläufig.

---

# 43. Net-Rebuild

Nach Topologieänderungen muss OpenE-CAD zusammenhängende Komponenten neu bestimmen können.

Algorithmisch:

```text
Graph aus elektrischen Knoten und Connections
→ Connected Components
→ Net-Zuordnung
→ Potential-Konsistenz
→ Indizes aktualisieren
```

Dies ist eine Kernfunktion des Rust-Cores.

---

# 44. Performance-Anforderung

Topologieänderungen sollen inkrementell verarbeitet werden.

Nicht bei jedem einzelnen Mausklick das gesamte Großprojekt vollständig neu analysieren.

Geplant:

- lokaler Dirty-Bereich
- inkrementeller Net-Rebuild
- Hintergrundprüfung
- vollständiger Projektcheck manuell/bei Export

---

# 45. Undo/Redo

Elektrische Aktionen sind atomare Commands.

Beispiele:

```text
ConnectPoints
DisconnectNodes
InsertJunction
RemoveJunction
AssignPotential
ChangeConnectionRoute
SplitNet
MergeNets
```

Ein Routing-Drag soll keine hunderte Undo-Schritte erzeugen, sondern eine logisch zusammenhängende Transaktion.

---

# 46. Verbindliche Entscheidungen v0.1

- Leitungsgeometrie und elektrische Topologie werden getrennt
- Linienkreuzung verbindet standardmäßig nicht
- T-Verbindungen verwenden explizite JunctionNodes
- ConnectionPoints sind die elektrischen Anker der Fachobjekte
- Netze sind elektrisch zusammenhängende Graphkomponenten
- schaltende Kontakte verbinden ihre beiden Netze statisch nicht
- Potentiale sind semantische Objekte und keine Farben
- Seitenfortsetzungen referenzieren stabile Ziele statt fertiger Textverweise
- physische Drähte/Kabeladern können später auf dem gleichen Graphen aufbauen
- Klemmen und SPS verwenden dasselbe ConnectionPoint-Prinzip

---

# 47. Nächster Detailbedarf

Noch separat zu spezifizieren:

- genaue Junction-/Crossing-UX
- Potentialpfeile / Quellenobjekte
- Verbindungsnummerierung
- interne Connectivity je FunctionType
- Copy/Paste-Netzregeln
- mehrpoliges Komfort-Routing
- Drahtnummerierungsprofile
- Kabelschirm / Pair / Twisted-Pair
- Busnetze
- Verbindungsrouting-Algorithmus
