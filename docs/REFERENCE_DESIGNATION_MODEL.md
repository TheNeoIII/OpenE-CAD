# Referenzkennzeichen-, BMK- und Strukturmodell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument definiert, wie OpenE-CAD sichtbare Betriebsmittelkennzeichen und hierarchische Projektstrukturen verwaltet.

Ziel ist ein IEC-81346-orientiertes Standardprofil, ohne das Kernmodell an genau eine Firmenkonvention zu binden.

---

# 1. Grundsatz

Ein sichtbares Referenzkennzeichen ist **kein Primärschlüssel**.

```text
stable device_id
      ↓
StructureAssignments + local designation
      ↓
ReferenceDesignationProfile
      ↓
formatierter sichtbarer Text
```

Beispiel:

```text
Device ID: 01J...
Function aspect: =ANL
Location aspect: +UV2
Local product designation: -K1

Anzeige:
=ANL+UV2-K1
```

Wenn `-K1` später zu `-K12` wird, bleiben alle internen Beziehungen unverändert.

---

# 2. Begriffe

OpenE-CAD unterscheidet:

### StructureNode

Hierarchischer Strukturknoten, z. B. Anlage oder Einbauort.

### StructureAssignment

Zuordnung eines Objekts zu einem oder mehreren StructureNodes.

### LocalDesignation

Lokaler Kennzeichenteil eines konkreten Objekts.

### ReferenceDesignation

Berechnete sichtbare Gesamtkennzeichnung.

### ReferenceDesignationProfile

Regeln für Aspekte, Präfixe, Reihenfolge, Formatierung, Nummerierung und Eindeutigkeit.

---

# 3. Aspekte

Das Standardprofil sieht mindestens typisierte Aspekte vor:

```text
functional
location
product
installation
custom
```

Für ein IEC-orientiertes Profil können beispielsweise folgende sichtbare Präfixe verwendet werden:

```text
functional  → =
location    → +
product     → -
```

Diese Zeichen sind **Profileinstellungen**, keine fest in IDs eingebauten Zeichen.

Weitere Firmen-/Projektprofile können andere Aspekte oder zusätzliche Ebenen verwenden.

---

# 4. StructureNode

```text
id
aspect
identifier
description
parent_id?
sort_order
properties{}
```

Beispiel:

```text
=ANL
 └─ =LFT

+UV2
 └─ +FELD1
```

Ein Baum ist je Aspekt möglich. Das Modell darf jedoch nicht an eine feste Anzahl Hierarchieebenen gebunden sein.

---

# 5. StructureAssignment

Ein Device, Sheet, Enclosure oder anderes Objekt kann Strukturzuordnungen besitzen.

```text
object_id
aspect
structure_node_id
assignment_source
```

`assignment_source`:

```text
explicit
inherited_from_sheet
inherited_from_parent
rule_generated
```

Die Quelle wird gespeichert, damit ein Benutzer erkennen kann, warum ein Objekt ein bestimmtes Kennzeichen erhält.

---

# 6. Seitenkontext und Vererbung

Eine Seite kann beispielsweise den Kontext besitzen:

```text
=ANL
+UV2
```

Ein neu auf dieser Seite eingefügtes Device kann diese Struktur standardmäßig erben.

Wichtig:

- Vererbung ist Komfortfunktion.
- Device speichert die resultierende fachliche Zuordnung nachvollziehbar.
- Benutzer kann eine abweichende Zuordnung explizit setzen.
- Verschieben einer Placement-Geometrie auf eine andere Seite darf nicht automatisch unbemerkt das physische Gerät umstrukturieren.

Bei einem Seitenwechsel fragt/entscheidet eine konfigurierbare Regel:

```text
Struktur beibehalten
oder
neuen Seitenkontext übernehmen
```

---

# 7. LocalDesignation

Ein Device besitzt ein lokales Produktkennzeichen.

Konzeptionell:

```text
class_code
counter
suffix?
variant?
manual_text?
```

Beispiel:

```text
class_code = K
counter = 1
formatted = K1
```

Das Präfix `-` wird durch das Profil hinzugefügt.

Damit kann die Nummerierungslogik mit strukturierten Daten arbeiten, statt nur Strings zu erhöhen.

---

# 8. Manuelle Kennzeichen

OpenE-CAD muss manuelle BMK zulassen.

```text
designation_mode = auto | manual
```

Bei `manual`:

- Benutzerwert bleibt erhalten.
- Eindeutigkeitsprüfung läuft trotzdem.
- automatische Renummerierung überspringt das Objekt standardmäßig.

Ein Projektprofil kann manuelle Werte restriktiver behandeln.

---

# 9. Klassencode

Der Klassencode kann aus Geräte-/Funktionsklasse vorgeschlagen werden.

Beispiele im Projekt können sein:

```text
K → Relais / Schütz
F → Schutz-/Sicherungselement
Q → Schalt-/Schutzgerät
S → Schalter/Taster
M → Motor
X → Klemme/Steckverbinder
A → Baugruppe/Gerät
```

Die konkrete Zuordnung wird **nicht hart im Core** verdrahtet.

Sie liegt im `ReferenceDesignationProfile` bzw. ClassificationProfile.

Der Benutzer darf den Vorschlag ändern, sofern die Projektregeln dies erlauben.

---

# 10. FunctionDesignation vs. DeviceDesignation

Mehrere Functions desselben Devices besitzen grundsätzlich dasselbe Geräte-Referenzkennzeichen.

```text
-K1 coil
-K1 power contact
-K1 aux contact
```

Zusätzliche sichtbare Funktionskennzeichnungen können separat berechnet werden:

```text
function_index
function_subdesignation
connection_designation
```

Diese sind nicht automatisch neue Devices.

---

# 11. Anschlusskennzeichnung

ConnectionPoints besitzen eigene Designations:

```text
A1
A2
13
14
1L1
2T1
```

Diese werden nie mit dem BMK-Primärschlüssel verwechselt.

Vollständige Anzeige kann Renderer zusammensetzen:

```text
-K1:A1
-K1:13
```

Die Separatoren sind Profileinstellungen.

---

# 12. Eindeutigkeit

Eindeutigkeit wird durch ein konfigurierbares `UniquenessScope` definiert.

Mögliche Scopes:

```text
project
functional_structure
location_structure
functional_and_location
parent_structure
sheet
custom
```

Empfohlenes Standardverhalten für Geräte:

```text
full ReferenceDesignation muss projektweit eindeutig sein
```

Der lokale Teil `K1` kann in unterschiedlichen Strukturkontexten mehrfach vorkommen, wenn daraus eindeutige vollständige Kennzeichen entstehen.

---

# 13. Nummerierungssequenz

`NumberingSequence`:

```text
id
object_class
scope
start
step
padding?
reserved_ranges[]
reuse_gaps
sort_strategy
```

Beispiele:

```text
K1, K2, K3 ...
F1, F2, F3 ...
X1, X2 ...
```

Optional:

```text
K001
K002
```

---

# 14. Nummerierungsstrategien

Startstrategien:

```text
next_free
append_highest
by_sheet_order
by_structure_order
by_cabinet_position
manual
```

`next_free` kann Lücken wiederverwenden.

`append_highest` vergibt immer nach dem höchsten existierenden Zähler.

Das Firmenprofil legt Default fest.

---

# 15. Reservierungen

Nummern können reserviert werden:

```text
reserved_designations[]
reserved_ranges[]
```

Anwendungsfälle:

- geplante Geräte
- externe Vorgaben
- spätere Erweiterung
- Kompatibilität mit Bestandsplänen

Auto-Nummerierung überspringt Reservierungen.

---

# 16. Renummerierung

Renummerierung ist eine explizite Transaktion.

Vorschau vor Anwendung:

```text
-K1  → -K1
-K7  → -K2
-K12 → -K3
```

Der Benutzer sieht:

- alte Kennzeichnung
- neue Kennzeichnung
- Grund/Sortierregel
- betroffene Querverweise
- manuell gesperrte Kennzeichen

Erst nach Bestätigung wird eine Undo-fähige Transaktion ausgeführt.

---

# 17. Rename History

Zur Nachvollziehbarkeit kann ein Objekt eine Historie besitzen:

```text
ReferenceDesignationHistory
  old_value
  new_value
  changed_at
  revision_id?
```

Diese Historie ist Audit-/Revisionsinformation und keine alternative Identität.

---

# 18. Referenzen nach Umbenennung

Weil interne Beziehungen über IDs laufen, müssen folgende Dinge **nicht** textuell repariert werden:

- Leitungen
- Querverweise
- Aufbauplatzierung
- Klemmenbeziehungen
- Kabelzuordnung
- Stückliste

Renderer und Auswertungen zeigen nach dem Rename automatisch das neue BMK.

Das ist ein zentrales Qualitätsziel von OpenE-CAD.

---

# 19. Verschieben in andere Struktur

Wird ein Device von `+UV2` nach `+UV3` verschoben:

```text
Device ID bleibt gleich
location assignment ändert sich
vollständiges Kennzeichen wird neu berechnet
Aufbauplatzierung muss auf Konsistenz geprüft werden
Querverweise aktualisieren sich automatisch
```

Wenn das Device noch im Enclosure UV2 platziert ist, entsteht ein Befund statt einer stillen automatischen Verschiebung.

---

# 20. Enclosure und Structure

Ein Enclosure besitzt ebenfalls Strukturzuordnungen.

Beispiel:

```text
Enclosure: +UV2
```

CabinetPlacement-Prüfung:

```text
Device location == enclosure location
```

Abweichungen können erlaubt sein, werden aber je RuleProfile geprüft.

---

# 21. Klemmen

Eine Klemmenleiste ist ein referenzierbares Objekt, beispielsweise:

```text
-X1
```

Einzelne Klemmen besitzen zusätzlich TerminalDesignation:

```text
-X1:1
-X1:2
-X1:PE
```

Die Klemme `1` ist nicht ein neues Device-BMK `X1-1`, sondern Unterobjekt/Position der Leiste.

---

# 22. SPS

SPS-Baugruppen und Kanäle besitzen getrennte Identitäten:

```text
Device reference: -A1
PLC address: %Q0.3
Channel: 3
```

Die SPS-Adresse ist **nicht** das BMK.

Damit kann sich die Adresse ändern, ohne Gerätebeziehungen zu zerstören.

---

# 23. Kabel

Ein Kabel kann ein eigenes Referenzkennzeichen besitzen:

```text
-W1
```

Adern:

```text
-W1:1
-W1:2
-W1:PE
```

Auch hier bleibt die Cable-ID stabil, wenn `-W1` zu `-W7` umbenannt wird.

---

# 24. Seitenkennzeichnung

Sheet-ID, Dokumentseitenzahl und sichtbare Blattnummer sind getrennt.

Eine Seite kann beispielsweise besitzen:

```text
stable sheet_id
engineering_page = 12
subpage = A
document_page = 17
```

Querverweise referenzieren `sheet_id`/Placement-ID und formatieren die sichtbare Seitenangabe erst beim Rendern.

---

# 25. Parser

OpenE-CAD benötigt später einen Parser für sichtbare Referenzkennzeichen.

Der Parser arbeitet **profilabhängig**.

Ergebnis ist keine rohe Zeichenkette, sondern:

```text
ParsedReferenceDesignation
  aspects[]
  product_designation
  function_subdesignation?
  connection_designation?
```

Dadurch können Eingaben validiert und strukturiert bearbeitet werden.

---

# 26. Formatter

Der Formatter ist die Gegenrichtung:

```text
structured designation
        ↓
profile
        ↓
visible string
```

Er wird verwendet in:

- Canvas
- Inspector
- Tabellen
- PDF
- CSV
- Navigator
- Querverweisen

Alle Ansichten verwenden denselben Formatter.

---

# 27. Suchindex

Für `Ctrl+K` werden zusätzlich Suchaliases erzeugt.

Beispiel Device:

```text
=ANL+UV2-K1
+UV2-K1
-K1
K1
Schütz Motor Lüftung
DILM...
```

Suchaliases sind Indexdaten und verändern das fachliche Kennzeichen nicht.

---

# 28. ReferenceDesignationProfile

```text
id
name
aspects[]
aspect_order[]
separators{}
class_rules[]
numbering_sequences[]
uniqueness_rules[]
format_rules[]
parser_rules[]
inheritance_rules[]
```

Das Profil kann global, Firmenstandard oder projektlokal sein.

Ein Projekt speichert eine konkrete Profilversion.

---

# 29. Profiländerung

Änderung des ReferenceDesignationProfile an einem existierenden Projekt darf nicht still alle Kennzeichen umschreiben.

Workflow:

1. neues Profil auswählen
2. Vorschau erzeugen
3. Konflikte anzeigen
4. Migration bestätigen
5. Änderung als eine Transaktion speichern

---

# 30. Prüfregeln

Mindestens:

```text
DUPLICATE_REFERENCE_DESIGNATION
INVALID_REFERENCE_FORMAT
MISSING_LOCAL_DESIGNATION
INVALID_CLASS_CODE
STRUCTURE_ASSIGNMENT_MISSING
STRUCTURE_CONFLICT_WITH_ENCLOSURE
MANUAL_DESIGNATION_OUTSIDE_PROFILE
RESERVED_DESIGNATION_USED
PLC_ADDRESS_IS_NOT_REFERENCE_DESIGNATION
```

---

# 31. UI-Regeln

Im Inspector werden strukturierte Bestandteile getrennt editierbar:

```text
Anlage       =ANL
Einbauort    +UV2
BMK          -K1
```

Zusätzlich sichtbar:

```text
Vollständig  =ANL+UV2-K1
```

Das vollständige Feld ist standardmäßig berechnet und nicht als unabhängiger Freitext gepflegt.

---

# 32. Auto-BMK beim Einfügen

Beim Platzieren eines neuen Geräts:

1. Function/Article liefert Klassenvorschlag
2. Sheet liefert Strukturkontext
3. NumberingSequence sucht Nummer
4. Preview zeigt vorgeschlagenes BMK
5. Device wird mit stabiler ID erzeugt

Der Benutzer kann den Vorschlag direkt überschreiben.

---

# 33. Bulk-Renumber im Datenmanager

Mehrfachauswahl kann:

- Klasse beibehalten und neu nummerieren
- Struktur ändern
- Nummerierungsbereich vorgeben
- Sortierung nach Seite/Position/Struktur wählen

Vor Anwendung immer Diff-Vorschau.

---

# 34. Revisionen

Eine Umbenennung kann revisionsrelevant sein.

Das Revisionsmodell kann erkennen:

```text
Device stable ID identisch
ReferenceDesignation geändert
```

Dadurch ist später ein sinnvoller Projektvergleich möglich.

---

# 35. Offene Punkte für v0.2

- konkrete mitgelieferte Standard-Klassifikation
- Default-Regeln pro Projektvorlage
- Funktions-/Produktaspekt im Detail
- Mehrfachstrukturierung / verschachtelte Kennzeichen
- Import bestehender Kennzeichnungsstrings
- Konfliktauflösung bei Profilmigration
- Firmenprofile und Sharing

---

# 36. Konsequenz für die Implementierung

Kein Modul darf fachliche Beziehungen über den formatierten BMK-String speichern.

Insbesondere nicht:

```text
connections[target = "-K1:A1"]
```

sondern:

```text
connection_point_id = <stable-id>
```

Der sichtbare Text wird ausschließlich über die aktuelle Referenzkennzeichnung erzeugt.
