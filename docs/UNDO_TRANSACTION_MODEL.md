# Undo/Redo-, Command- und Transaktionsmodell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument definiert, wie OpenE-CAD Änderungen atomar, nachvollziehbar und rückgängig machbar behandelt.

Ziel: Keine Ansicht darf Daten „nebenbei“ verändern. Jede fachliche Mutation läuft über einen klaren Command-/Transaktionspfad.

---

# 1. Grundsatz

```text
User Action
   ↓
Command
   ↓
Validate intent
   ↓
Transaction
   ↓
Domain changes
   ↓
Derived indices / validation refresh
   ↓
Undo record
```

Die GUI mutiert Domänenobjekte nicht direkt.

---

# 2. Command

Ein `Command` beschreibt eine Benutzerabsicht.

Beispiele:

```text
PlaceDevice
MovePlacement
ConnectPoints
ChangeArticle
RenameDevice
MoveDeviceToRow
AutoLayoutCabinet
DeleteDevice
RenumberDevices
AssignCableCore
```

Ein Command kann mehrere Domänenobjekte ändern.

---

# 3. Transaction

Eine Transaktion ist die atomare fachliche Änderung, die aus einem Command entsteht.

Beispiel `ChangeArticle` kann gleichzeitig ändern:

- Device.article_id
- Function-Zuordnung
- neue/entfallene ConnectionPoints
- mechanische Daten
- Cabinet validation
- Findings

Für Undo ist dies **eine** Aktion.

---

# 4. Atomarität

Eine Transaktion ist entweder vollständig erfolgreich oder verändert das Projekt nicht.

Unzulässig:

```text
Artikel geändert
aber Function-Migration nach Fehler nur halb durchgeführt
```

Bei Fehler:

```text
rollback
```

---

# 5. UndoRecord

Jede erfolgreiche editierende Transaktion erzeugt einen UndoRecord.

Konzeptionell:

```text
id
command_name
description
timestamp
forward_changes
inverse_changes
affected_object_ids[]
```

Die konkrete Implementierung kann Snapshots, Patches oder inverse Commands verwenden. Diese Entscheidung folgt im Rust-Spike.

---

# 6. Undo-Grenze

Undo betrifft fachliche Änderungen.

Beispiele **undo-fähig**:

- Gerät verschieben
- Leitung erzeugen
- BMK ändern
- Artikel tauschen
- Tabelle editieren
- Reihe ändern
- Auto-Layout anwenden
- Gerät löschen

Nicht zwingend undo-fähig:

- Zoom
- Pan
- Panelbreite
- Tab wechseln
- Auswahl ändern
- Suchbegriff

Diese sind Workspace-/View-State.

---

# 7. View State vs. Project State

Strikte Trennung:

```text
Project State
  Device, Sheet, Net, Placement, Article refs ...

Workspace State
  Zoom, Scroll, offene Panels, aktuelle Auswahl, Theme ...
```

Nur Project State landet zwingend im `.oecad`-Projekt.

Workspace State kann optional separat gespeichert werden.

---

# 8. Command Validation

Vor Mutation prüft ein Command:

- Objekt existiert
- Benutzeraktion ist fachlich zulässig
- referenzierte IDs existieren
- harte Invarianten werden nicht verletzt

Weiche Projektbefunde dürfen eine Änderung oft zulassen und danach als Finding erscheinen.

Beispiel:

`39 / 36 TE` darf bei manueller Platzierung eventuell entstehen, wird aber als Fehler markiert.

Ein ungültiger Objektverweis darf nicht entstehen.

---

# 9. Preview Commands

Einige Aktionen benötigen eine Vorschau:

- BMK-Renummerierung
- Artikelwechsel
- Auto-Layout
- Massenänderung
- Profilwechsel
- Import

Pipeline:

```text
Prepare
→ PreviewResult
→ user confirms
→ Commit Transaction
```

Preview verändert Project State nicht.

---

# 10. Composite Commands

Mehrere fachliche Einzelschritte können eine Benutzeraktion bilden.

Beispiel „Gerät einfügen“:

```text
CreateDevice
CreateFunctions
CreateConnectionPoints
AssignReferenceDesignation
CreateSchematicPlacement
```

Für den Benutzer ist dies **ein Undo-Schritt**.

---

# 11. Command Coalescing

Einige häufige Mikroänderungen sollen zusammengefasst werden.

Beispiele:

### Drag

Viele Mausbewegungen ergeben am Ende:

```text
MovePlacement from A to B
```

nicht 120 Undo-Schritte.

### Texteingabe

Kontinuierliche Eingabe in ein Feld kann als ein Edit zusammengefasst werden, solange Fokus/Objekt gleich bleiben.

---

# 12. Move Preview

Während Drag:

- UI zeigt temporäre Geometrie
- Project State bleibt noch unverändert
- Drop erzeugt Command

Dadurch bleibt Undo sauber.

---

# 13. Leitungswerkzeug

Während des Zeichnens ist der Vorschaupfad Workspace State.

Erst beim gültigen Abschluss:

```text
ConnectPoints command
```

Dieser erzeugt atomar:

- Junctions falls nötig
- ElectricalConnections
- Net-Updates
- ConnectionPathPlacements

Abbruch mit Esc erzeugt keine Projektdaten.

---

# 14. Tabellenbearbeitung

Direkte Zellbearbeitung führt ebenfalls Commands aus.

Beispiel:

```text
EditDeviceProperty(device_id, function_text, value)
```

Tabellen-UI darf nicht direkt die zugrunde liegende Struct ändern.

Damit gelten dieselben Prüfungen wie im Inspector.

---

# 15. Mehrfachänderung

Bulk Edit wird als eine Transaktion behandelt.

Beispiel 20 Geräte:

```text
ChangeStructureAssignmentBulk
```

Undo stellt alle 20 Objekte gemeinsam zurück.

Wenn ein Objekt die Operation hart verhindert, muss vor Commit entschieden werden:

- gesamte Aktion ablehnen
- problematische Objekte in Preview ausschließen

Kein stilles Teilresultat.

---

# 16. Löschen mit Abhängigkeiten

Delete Command berechnet vorher `ImpactReport`.

Beispiel Device löschen:

```text
Device
5 Functions
12 ConnectionPoints
8 ElectricalConnections
4 SchematicPlacements
1 CabinetPlacement
```

UI zeigt Auswirkungen.

Nach Bestätigung wird alles in einer Transaktion entfernt bzw. angepasst.

Undo stellt den vollständigen Objektgraph wieder her.

---

# 17. IDs bei Undo

Undo eines Löschens stellt möglichst dieselben stabilen IDs wieder her.

Sonst würden externe/innere Referenzen unnötig brechen.

Redo verwendet ebenfalls dieselbe Transaktionsidentität, soweit sinnvoll.

---

# 18. Validation nach Commit

Projektprüfung läuft nach einer erfolgreichen Mutation inkrementell.

Idee:

```text
transaction affected IDs
        ↓
validation dependency graph
        ↓
only affected rules re-run
```

Für frühe Versionen darf zunächst vollständig validiert werden, sofern Performance ausreicht.

---

# 19. Findings sind abgeleitet

Viele Findings sollen nicht als manuell gepflegte Projektwahrheit gespeichert werden.

Sie werden aus Project State berechnet.

Ausnahmen:

- Ignorierentscheidung
- Begründung
- Benutzerquittierung

Diese referenzieren Rule ID + Object IDs.

---

# 20. Dirty State

Projekt besitzt einen Save Marker.

```text
current_transaction_index
saved_transaction_index
```

Wenn unterschiedlich:

```text
modified = true
```

Undo bis zum Save Marker kann das Projekt wieder in „gespeichert“-Zustand bringen.

---

# 21. Save ist kein Undo Command

Speichern verändert normalerweise nicht den fachlichen Projektinhalt.

Es setzt nur den Save Marker und persistiert den aktuellen Zustand.

---

# 22. Autosave / Recovery

Autosave darf den Undo-Stack nicht beeinflussen.

Es persistiert eine Recovery-Repräsentation des aktuellen Zustands oder Journals.

Nach Absturz:

```text
Projektdatei Stand A
Recovery Stand B
```

UI bietet Wiederherstellung an.

---

# 23. Recovery Journal

Optionales späteres Modell:

```text
base_project_checksum
transactions since base
last_flush_time
```

Das Journal liegt außerhalb der eigentlichen Projektdatei, damit eine beschädigte Recovery-Datei nicht die letzte saubere Projektdatei zerstört.

---

# 24. Atomic Save

Projekt speichern:

1. neuen temporären Container schreiben
2. vollständig validieren/abschließen
3. fsync soweit Plattform unterstützt
4. alte Datei atomar ersetzen
5. optional Backup behalten

Nie die einzige Projektdatei Stück für Stück überschreiben.

---

# 25. Transaktionsgrenzen beim Import

Großer Import kann:

- eine Transaktion sein
- oder in logisch benannte Teiltransaktionen aufgeteilt werden

Wichtig: Benutzer muss klar erkennen, was Undo zurücknimmt.

Für normalen Import bevorzugt:

```text
1 import action = 1 undo step
```

---

# 26. Generierte Seiten

„Klemmenplan neu erzeugen“ ist normalerweise keine Mutation der elektrischen Wahrheit.

Wenn nur die View/Projection neu gerendert wird:

- kein Undo nötig

Wenn Dokumentdefinitionen geändert werden:

- Command + Undo

---

# 27. Auto-Layout

Auto-Layout läuft zunächst als Preview.

Nach Bestätigung:

```text
ApplyCabinetLayoutProposal
```

Eine Transaktion enthält alle Positionsänderungen.

Undo stellt die gesamte vorherige Anordnung wieder her.

---

# 28. Renummerierung

Gleiches Prinzip:

```text
PreviewRenumbering
→ ApplyRenumbering
```

Alle BMK-Änderungen sind eine Transaktion.

---

# 29. Artikelwechsel

Artikelwechsel darf nicht als simples Setzen von `article_id` implementiert werden.

Er ist ein fachlicher Command mit Migrationsplan und ImpactReport.

---

# 30. Command Result

Ein Command liefert strukturiertes Ergebnis:

```text
success
changed_object_ids[]
created_object_ids[]
deleted_object_ids[]
warnings[]
selection_hint?
navigation_hint?
```

So kann die UI nach einer Aktion gezielt reagieren, ohne Domänenlogik zu kennen.

---

# 31. Fehlerklassen

Unterscheidung:

```text
CommandRejected       Benutzerabsicht fachlich nicht möglich
ValidationWarning     Änderung möglich, aber Befund
InternalInvariant     Programm-/Datenfehler
IOError               Persistenzproblem
```

UI darf diese nicht als denselben generischen Fehler anzeigen.

---

# 32. Transaktions-IDs

Jede committed Transaktion kann eine ID erhalten.

Nutzen:

- Debugging
- Recovery
- Revisionen
- später Kollaboration
- Logs

Sie ist nicht zwingend im normalen UI sichtbar.

---

# 33. Ereignisse

Nach Commit kann der Core Domain Events erzeugen:

```text
DeviceChanged
PlacementMoved
NetChanged
ArticleChanged
CabinetLayoutChanged
```

Diese Events informieren:

- UI
- Indizes
- Validierung
- Suchindex

Events ersetzen nicht die persistente Domänenwahrheit.

---

# 34. Kein volles Event Sourcing als Voraussetzung

OpenE-CAD muss nicht von Anfang an Event Sourcing verwenden.

Das Kernmodell bleibt ein aktueller Project State mit Command-/Transaction-Historie für Undo.

Ein späterer Audit-/Collaboration-Layer kann darauf aufbauen.

---

# 35. Undo Stack Limits

Konfigurierbar nach:

- Anzahl Commands
- Speicherbudget

Sehr große Transaktionen können komprimierte Snapshots/Patches verwenden.

Niemals still Undo vollständig deaktivieren, ohne Benutzer zu informieren.

---

# 36. Projektwechsel

Undo-Historie ist projektbezogen.

Jedes geöffnete Projekt besitzt eigenen CommandStack.

Workspace-Undo darf nicht versehentlich Änderungen eines anderen Projekts betreffen.

---

# 37. Testanforderungen

Für jeden mutierenden Command mindestens Tests:

```text
execute
undo
redo
serialization after execute
serialization after undo
invariants
```

Besonders kritisch:

- ConnectPoints
- DeleteDevice
- ChangeArticle
- Renumber
- AutoLayout
- Terminal/Cable assignments

---

# 38. Offene Punkte v0.2

- konkrete Patch-/Snapshot-Technik
- memory-efficient undo
- Recovery-Journal-Format
- Command-Makros/Scripting
- Collaboration/Conflict Handling
- transaction-aware project diff

---

# 39. Konsequenz für Rust

Die spätere Architektur sollte ungefähr trennen:

```text
commands
transactions
domain
validation
history
persistence
```

UI-Komponenten rufen Commands auf. Sie erhalten keine frei mutierbaren Referenzen auf den gesamten Project State.
