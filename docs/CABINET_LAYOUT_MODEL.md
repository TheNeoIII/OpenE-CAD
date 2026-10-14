# Verteiler-, Reihen- und Auto-Layout-Modell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument vertieft die im v0-Prototyp gezeigte Aufbau-/Frontansicht.

Ziel ist eine automatisch generierbare, aber jederzeit kontrolliert manuell korrigierbare Frontansicht, die dieselben Device-IDs verwendet wie der Stromlaufplan.

---

# 1. Grundsatz

Die Aufbauansicht besitzt **keine zweite Geräteliste**.

```text
Project Device
   ├─ SchematicPlacements
   └─ CabinetPlacement
```

Das Gerät `-F12` im Stromlaufplan und das Gerät `-F12` in Reihe 3 sind dasselbe `Device`.

---

# 2. Scope der ersten Aufbauversion

Phase 2 konzentriert sich auf:

- Installationsverteiler / Frontansicht
- Hutschienen-/Reihenlogik
- Teilungseinheiten
- Gerätefrontdarstellung
- Türansicht
- automatische Platzierung
- manuelle Korrektur
- Kollisions- und Kapazitätsprüfung
- PDF-Ausgabe

Noch **nicht** erforderlich:

- vollständiges 3D
- Drahtkanalrouting
- thermische Simulation
- exakte Fertigungsbohrbilder
- Kollisionsvolumen in 3D

Das spätere Schaltschrankmodul erweitert dieses Modell.

---

# 3. Enclosure

`Enclosure` beschreibt den physischen Verteiler/Schrank.

```text
id
name
article_id?
structure_assignments[]
width_mm
height_mm
depth_mm
protection_class?
color?
door_configuration
mounting_surfaces[]
properties{}
```

Ein Enclosure kann aus Herstellerdaten stammen oder frei definiert werden.

---

# 4. MountingSurface

Nicht jedes Gerät sitzt auf derselben Fläche.

```text
id
enclosure_id
surface_type
name
origin
width_mm
height_mm
coordinate_system
```

Starttypen:

```text
front_rail_area
door_front
door_inside
mounting_plate
side_panel
custom
```

Die erste Produktphase nutzt primär `front_rail_area` und `door_front`/`door_inside`.

---

# 5. RailRow

Eine Front-Reihe wird als `RailRow` modelliert.

```text
id
mounting_surface_id
name
index
capacity_te
te_pitch_mm
start_offset_mm
height_mm?
y_position_mm
allowed_mounting_types[]
layout_direction
properties{}
```

Wichtig:

- Anzahl Reihen ist frei.
- Kapazität kann je Reihe unterschiedlich sein.
- `4 × 36 TE` ist nur Beispieldaten.
- reale mm-Geometrie und TE-Kapazität bleiben getrennte Werte.

---

# 6. TE-Raster

Standardmäßig arbeitet eine RailRow mit TE-basierten Slots.

Intern sollte nicht nur Integer-TE möglich sein.

Empfohlen:

```text
slot_resolution_te = 0.5
```

oder abstrakter:

```text
slot_unit = 1/2 TE
```

Damit sind Geräte/Reserveelemente mit halben Teilungsschritten darstellbar.

Das Profil darf andere Raster erlauben.

---

# 7. MechanicalRepresentation

Der Article liefert, sofern vorhanden:

```text
width_mm
height_mm
depth_mm
width_te
mounting_type
front_geometry
mounting_anchor
```

`width_te` ist für Reihenbelegung maßgeblich, `width_mm` für reale Maßdarstellung.

Wenn beide Werte vorhanden sind, dürfen sie plausibilisiert werden, aber nicht still ineinander umgerechnet und überschrieben werden.

---

# 8. CabinetPlacement

```text
id
device_id
enclosure_id
mounting_surface_id
row_id?
position_te?
x_mm?
y_mm?
orientation
placement_mode
locked
sort_key?
manual_offset?
properties{}
```

`placement_mode`:

```text
unplaced
auto
manual
locked
```

`locked` kann alternativ aus `placement_mode` abgeleitet werden; fachlich wichtig ist, dass Auto-Layout gesperrte Positionen nicht verschiebt.

---

# 9. Platzierungszustände

### unplaced

Gerät gehört zum Verteiler, hat aber noch keinen Platz.

### auto

Position wurde durch Auto-Layout erzeugt und darf bei Neu-Layout verändert werden.

### manual

Benutzer hat die Position bewusst verändert. Neu-Layout verändert sie standardmäßig nicht oder nur nach expliziter Option.

### locked

Position ist fix und wird nie automatisch verschoben.

---

# 10. Enclosure-Zuordnung

Device kann explizit besitzen:

```text
enclosure_id
preferred_row_id?
row_hint?
```

Zusätzlich kann die Zuordnung aus Strukturinformationen vorgeschlagen werden.

Beispiel:

```text
Device location = +UV2
Enclosure structure = +UV2
```

Dann kann `+UV2` automatisch als Verteiler vorgeschlagen werden.

Die tatsächliche Beziehung bleibt aber eine Device/Placement-Referenz, nicht nur Textvergleich.

---

# 11. Row Assignment

Ein Device kann eine gewünschte Reihe besitzen:

```text
preferred_row_id
```

Quellen:

```text
manual
article/template hint
import
rule
existing placement
```

Die UI kann weiterhin ein menschenlesbares Feld `Reihe = 2` zeigen.

---

# 12. Reihenreihenfolge

Innerhalb einer Reihe benötigt ein Gerät einen stabilen Layout-Sortierschlüssel.

```text
layout_order
```

Auto-Layout kann initial aus folgenden Daten ableiten:

```text
explicit order
existing placement
reference designation
functional group
page/order context
```

Die konkrete Sortierstrategie ist Projekt-/Layoutprofil.

---

# 13. ReserveField

Freie Teilungseinheiten sollen als eigenes Layoutobjekt darstellbar sein.

```text
ReserveField
  id
  row_id
  width_te
  position_te
  label?
  locked
```

ReserveField ist **kein Device** und erscheint nicht automatisch in der Stückliste.

Optional kann ein echtes Blindabdeckungs-Device stattdessen als Artikel geführt werden.

---

# 14. DoorPlacement

Türgeräte werden über eine eigene MountingSurface platziert.

Beispiele:

- Leuchttaster
- Wahlschalter
- Bediengerät
- Display

`door_front` und `door_inside` können separate Flächen sein.

Eine aufgeklappte Tür im Editor ist eine **Ansichts-/Transformationsfunktion**, keine Änderung der fachlichen Position.

---

# 15. Türzustand in der UI

UI View State:

```text
door_view = closed | open_left | open_right | hidden
```

Dieser Zustand muss nicht als fachliche Projektänderung gespeichert werden, kann aber im Workspace gespeichert werden.

Die tatsächliche Scharnierseite gehört dagegen zum Enclosure-Modell.

---

# 16. Auto-Layout-Ziel

Auto-Layout soll:

1. deterministisch sein
2. vorhandene gesperrte Positionen respektieren
3. manuelle Positionen standardmäßig respektieren
4. möglichst wenig unnötig verschieben
5. Kapazitätsfehler nachvollziehbar anzeigen
6. nie still Geräte löschen oder in einen anderen Verteiler verschieben

---

# 17. Auto-Layout-Phasen

Empfohlene deterministische Pipeline:

```text
1. Geräte filtern, die zum Enclosure gehören
2. mechanische Daten laden
3. locked/manual Placements als belegte Intervalle markieren
4. Devices mit expliziter RowAssignment gruppieren
5. unzugeordnete Devices über Regeln einer Reihe zuweisen
6. innerhalb jeder Reihe stabil sortieren
7. freie Intervalle berechnen
8. Auto-Devices platzieren
9. Überbelegung/Unplatzierbarkeit sammeln
10. Ergebnis als Preview anzeigen
11. Benutzer bestätigt eine Undo-fähige Transaktion
```

---

# 18. Platzierungsalgorithmus v0

Für eine Reihe kann zunächst ein stabiler **First-Fit in Sortierreihenfolge** verwendet werden.

Pseudoablauf:

```text
for device in sorted_auto_devices:
    width = device.width_te
    position = first_free_interval_that_fits(width)
    if position exists:
        place(device, position)
    else:
        mark_unplaced(device, ROW_CAPACITY_EXCEEDED)
```

Wichtig ist nicht maximale Packungsoptimierung, sondern vorhersehbares Verhalten.

Später können alternative Strategien ergänzt werden.

---

# 19. Kein zufälliges Umsortieren

Ein Neu-Layout darf nicht bei jeder kleinen Änderung eine gesamte Reihe optisch neu mischen.

Stabilitätsregel:

- vorhandene gültige Auto-Position behalten, wenn sie nicht im Konflikt steht
- nur betroffene nachfolgende Elemente neu positionieren, wenn möglich

Dadurch bleibt der Aufbau für den Benutzer räumlich vertraut.

---

# 20. Einfügen eines neuen Geräts

Beispiel:

Reihe 2 enthält:

```text
F1 | F2 | K1 | Reserve | F3
```

Neues Device mit Row=2:

Standardstrategie:

- freie passende Lücke nutzen
- sonst ans Ende des belegten Bereichs setzen
- falls kein Platz: `unplaced` + Befund

Bestehende manuelle/locked Elemente werden nicht verdrängt.

---

# 21. Drag & Drop

Beim Ziehen eines Devices zeigt die UI:

- Zielreihe
- TE-Startposition
- belegte Breite
- Konfliktvorschau
- mögliche Snap-Position

Drop auf belegten Bereich:

Konfigurierbare Aktion:

```text
reorder
insert_and_shift_auto_items
reject
```

Locked Devices dürfen nie automatisch verdrängt werden.

---

# 22. Mehrfachauswahl

Mehrere Devices können gemeinsam verschoben werden.

Dabei bleibt ihre relative Reihenfolge erhalten.

Bei nicht ausreichendem Platz:

- gesamte Operation ablehnen
oder
- Preview mit Konflikt anzeigen

Keine teilweise stille Platzierung.

---

# 23. Numerische Position

Inspector erlaubt:

```text
Reihe
Start-TE
Breite TE (aus Artikel, ggf. Override)
X/Y nur bei freien Montageflächen
```

Direkte Eingabe `Start-TE = 12.5` ist möglich, wenn das Raster dies erlaubt.

---

# 24. Gerätebreite Override

Normalfall:

```text
CabinetPlacement.width_te ← Article.MechanicalRepresentation.width_te
```

Projektlokaler Override ist möglich, aber muss sichtbar markiert werden:

```text
mechanical_override = true
```

So wird nicht versehentlich der globale Katalog verändert.

---

# 25. Fehlende mechanische Daten

Wenn `width_te` fehlt:

- Device darf im Stromlaufplan existieren.
- Aufbau zeigt es in `Nicht platziert`.
- Befund: `MISSING_DEVICE_WIDTH_TE`.
- Benutzer kann projektlokal Breite ergänzen oder Artikeldaten bearbeiten.

Keine erfundene Standardbreite im Core.

---

# 26. Reihen-Auslastung

Pro Reihe werden berechnet:

```text
used_te
reserved_te
free_te
overflow_te
capacity_te
```

Anzeige:

```text
28 / 36 TE
36 / 36 TE
39 / 36 TE   Fehler
```

Die Anzeige stammt aus Placement-Daten, nicht aus manuell gepflegten Summen.

---

# 27. Interval-Modell

Für Kollisionsprüfung wird jede Platzierung als Intervall betrachtet:

```text
[start_te, start_te + width_te)
```

Zwei Devices kollidieren, wenn sich die Intervalle überschneiden.

Dadurch bleibt die Prüfung unabhängig vom Renderer.

---

# 28. Mechanische Plausibilitätsprüfung

Neben TE-Überlappung:

```text
DEVICE_OUTSIDE_ROW
ROW_CAPACITY_EXCEEDED
DEVICE_OVERLAP
MOUNTING_TYPE_NOT_ALLOWED
MISSING_MECHANICAL_DATA
DEVICE_IN_WRONG_ENCLOSURE
DEVICE_STRUCTURE_ENCLOSURE_CONFLICT
LOCKED_DEVICE_CONFLICT
DOOR_DEVICE_OUTSIDE_SURFACE
```

Später zusätzlich:

- Mindestabstände
- Reserven
- thermische Gruppenregeln
- Zubehörabstände

---

# 29. Einbaubreite vs. reale Darstellung

Ein 2-TE-Gerät kann reale Geometrie besitzen, die nicht exakt der gezeichneten Slotbreite entspricht.

Deshalb:

```text
logical occupancy = width_te
visual geometry = front_geometry / width_mm
```

Der Renderer positioniert die reale Darstellung innerhalb der logischen Belegung.

---

# 30. Einbauhöhe

Für einfache DIN-Reihen reicht zunächst die Reihenzuordnung.

Das Modell hält dennoch `height_mm` vor, damit spätere Front-/Montageansichten Geräte mit unterschiedlicher Höhe korrekt darstellen können.

---

# 31. Accessories

Zubehör kann später Einfluss auf Belegung haben.

Beispiele:

- Hilfskontaktblock seitlich
- Sammelschiene
- Distanzstück

Das Grundmodell sollte `MechanicalAssembly` zulassen:

```text
Device main article
 + attached accessory articles
 → effective occupancy
```

v0.1 berechnet zunächst aus der Hauptdarstellung; Zubehörlogik wird in v0.2 vertieft.

---

# 32. Gruppen

Benutzer kann Layoutgruppen definieren:

```text
RCD + zugehörige LS
Motorstartergruppe
Steuergruppe
```

Eine Gruppe kann bevorzugt zusammenbleiben.

```text
CabinetLayoutGroup
  device_ids[]
  keep_together
  order
```

Wenn Gruppe nicht passt, Auto-Layout meldet Konflikt statt sie unbemerkt aufzuteilen, sofern `keep_together=true`.

---

# 33. Auto-Layout-Regelprofil

`CabinetLayoutProfile`:

```text
slot_resolution
row_assignment_strategy
sort_strategy
preserve_manual_positions
preserve_valid_auto_positions
allow_shift_auto_devices
reserve_policy
group_policy
```

Damit können Firmen unterschiedliche Layoutgewohnheiten abbilden.

---

# 34. Aufbau-Inspector

Bei ausgewähltem Gerät zeigt der Inspector mindestens:

```text
BMK
Funktion
Artikel
Hersteller
Einbauort
Verteiler
Montagefläche
Reihe
Start-TE
Breite TE
B × H × T
Placement mode
Position gesperrt
```

Aktionen:

- Im Stromlaufplan anzeigen
- Artikel öffnen/tauschen
- Position sperren/entsperren
- aus Aufbau entfernen

`aus Aufbau entfernen` setzt Placement auf unplaced bzw. entfernt CabinetPlacement, nicht das Device.

---

# 35. Nicht platzierte Geräte

Eigener Bereich:

```text
UnplacedDevice
  device_id
  reason[]
  preferred_row?
```

Gründe:

```text
no_row_assignment
missing_width
row_full
invalid_mounting_type
conflict
```

Drag & Drop aus dieser Liste in eine Reihe ist der primäre manuelle Korrekturweg.

---

# 36. Navigation Stromlaufplan ↔ Aufbau

Von CabinetPlacement:

```text
Im Stromlaufplan anzeigen
```

Falls mehrere Placements existieren:

- Main Function bevorzugen
- alternativ Liste/Popup der Platzierungen

Vom Stromlaufplan:

```text
Im Aufbau
```

Fokussiert dasselbe `device_id`.

---

# 37. Auswahl synchronisieren

Optionales Workspace-Verhalten:

Wenn mehrere Views nebeneinander geöffnet sind, kann die Auswahl über `device_id` synchronisiert werden.

Dies ist UI-Komfort, nicht Domänenabhängigkeit.

---

# 38. PDF-Ausgabe

Die Aufbau-Dokumentseite wird aus:

```text
Enclosure
MountingSurfaces
RailRows
CabinetPlacements
MechanicalRepresentations
```

generiert.

Mögliche Ansichten:

- Front ohne Tür
- Front mit geschlossener Tür
- Tür geöffnet
- nur Türfront

Titelblock und Maßstab kommen aus dem Sheet-/Dokumentmodell.

---

# 39. Aktualität generierter Aufbau-Seite

Wenn Device-Artikel oder Breite geändert wird:

- CabinetPlacement bleibt als Beziehung erhalten
- Layout wird erneut geprüft
- Überlappung wird sofort als Befund angezeigt
- Auto-Layout wird **nicht ungefragt** ausgeführt

Der Benutzer entscheidet über Neu-Layout.

---

# 40. Undo/Redo

Folgende Aktionen sind einzelne Commands/Transaktionen:

```text
move_device
move_device_group
change_row
lock_position
unlock_position
add_reserve
remove_reserve
auto_layout_preview_apply
clear_auto_layout
```

Ein vollständiges Auto-Layout wird als **eine** Undo-Aktion behandelt.

---

# 41. Auto-Layout Preview

Vor größeren Änderungen zeigt OpenE-CAD:

```text
unverändert
verschoben
neu platziert
nicht platzierbar
Konflikt
```

Benutzer kann:

- alles übernehmen
- einzelne Änderungen ausschließen
- abbrechen

Dies ist besonders wichtig bei bestehenden Verteilern.

---

# 42. Determinismus

Gleiche Eingabedaten + gleiches Layoutprofil müssen dasselbe Auto-Layout ergeben.

Keine Abhängigkeit von:

- HashMap-Reihenfolge
- zufälligen IDs
- Renderreihenfolge

Sortierung muss explizit definiert sein.

Dies erleichtert Tests und Git-/Projektvergleiche.

---

# 43. Projektvergleich

Spätere Diff-Ansicht kann unterscheiden:

```text
Device unverändert, Position geändert
Device Artikel geändert
Device neu
Device entfernt
Row capacity geändert
```

Weil Device-ID und CabinetPlacement-ID stabil sind, ist ein semantischer Vergleich möglich.

---

# 44. Offene Punkte für v0.2

- Herstellergehäuse-/Verteilerkataloge
- effektive Breite mit Zubehör
- Phasenschienen/Sammelschienen als mechanische Gruppen
- freie Montageplatte
- Beschriftungsfelder
- Mindestabstände
- Montagezonen
- 2D-Maßketten
- Bohr-/Ausschnittdaten für Türgeräte
- Import von Schaltschrankmakros

---

# 45. Konsequenz für Rust

Der Layoutalgorithmus soll als **reine Domänenlogik** implementierbar sein:

```text
input:
  enclosure geometry
  rows
  devices + mechanical data
  existing placements
  layout profile

output:
  proposed placements
  conflicts
  validation findings
```

Er darf nicht von GUI-Widgets oder Renderer-Koordinaten abhängen.
