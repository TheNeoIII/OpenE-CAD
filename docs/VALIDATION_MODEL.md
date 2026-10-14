# Projektprüfung, Findings und Regel-Engine

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument definiert die Prüfungs-Engine, die im v0-Design dauerhaft in Stromlaufplan, Aufbau und Datenmanager sichtbar ist.

Ziel: Fehler und Hinweise dort anzeigen, wo sie entstehen, ohne Engineering-Daten mit einer elektrischen Sicherheitsberechnung zu verwechseln.

---

# 1. Grundsatz

Die Prüfungs-Engine bewertet die **Konsistenz und Vollständigkeit der Projektdaten**.

Sie behauptet nicht automatisch:

- eine Anlage sei normkonform
- eine Schaltung sei elektrisch sicher
- Schutzorgane seien korrekt dimensioniert
- eine reale Anlage werde funktionieren

Solche Berechnungen können später als eigene spezialisierte Module hinzukommen.

---

# 2. Begriffe

### ValidationRule

Eine einzelne prüfbare Regel.

### RuleProfile

Projekt-/Firmenprofil, das Regeln aktiviert und Severity konfiguriert.

### Finding

Konkreter Befund einer Regel an einem oder mehreren Projektobjekten.

### Suppression

Bewusste Unterdrückung/Quittierung eines Befunds mit Begründung.

### FixAction

Optionale sichere Korrekturaktion.

---

# 3. ValidationRule

```text
id
version
category
default_severity
applicable_object_types[]
description
dependencies[]
fix_capability
```

Rule-ID ist stabil und maschinenlesbar:

```text
ARTICLE_MISSING
DUPLICATE_REFERENCE_DESIGNATION
OPEN_REQUIRED_CONNECTION
ROW_CAPACITY_EXCEEDED
```

Nicht aus dem lokalisierten Meldungstext ableiten.

---

# 4. Severity

Startwerte:

```text
info
warning
error
critical
```

Bedeutung:

### info

Nützlicher Hinweis, keine unmittelbare Inkonsistenz.

### warning

Projekt ist bearbeitbar, Daten sind eventuell unvollständig/ungewöhnlich.

### error

Klare Projektinkonsistenz oder fehlende erforderliche Daten.

### critical

Datenzustand, bei dem bestimmte Exporte/Operationen bewusst blockiert werden können.

Die tatsächliche Severity kann RuleProfile überschreiben.

---

# 5. Kategorien

Mindestens:

```text
project
structure
reference_designation
article
function
connection
potential
terminal
cable
plc
cabinet
documentation
library
schema
```

UI kann danach filtern.

---

# 6. Finding

Ein berechneter Befund enthält:

```text
finding_key
rule_id
severity
primary_object_ref
related_object_refs[]
message_arguments{}
location_hints[]
fix_actions[]
```

`finding_key` muss für dieselbe fachliche Situation möglichst stabil sein, damit Suppressions wiedergefunden werden können.

---

# 7. Meldungstext

Finding speichert möglichst nicht nur fertigen deutschen String.

Stattdessen:

```text
rule_id = ROW_CAPACITY_EXCEEDED
arguments = {
  row: "3",
  used_te: 39,
  capacity_te: 36
}
```

UI lokalisiert:

```text
"Reihe 3 ist mit 39 / 36 TE überbelegt."
```

Damit ist Mehrsprachigkeit möglich.

---

# 8. ObjectRef

Ein Befund referenziert stabile Objekte:

```text
object_type
object_id
subpath?
```

Beispiel:

```text
Device 01...
Property article_id
```

oder:

```text
CabinetPlacement 02...
```

Keine Navigation über BMK-Text.

---

# 9. LocationHint

Ein Objekt kann mehrere sichtbare Orte besitzen.

Finding kann Hinweise liefern:

```text
schematic placement
cabinet placement
data table row
inspector section
```

UI entscheidet anhand aktuellem Kontext, wo es hinspringt.

---

# 10. „Anzeigen“

Jeder Befund soll nach Möglichkeit eine direkte Navigation anbieten.

Beispiele:

- Gerät auf Seite fokussieren
- Aufbau-Reihe fokussieren
- Datenmanager-Zeile auswählen
- Artikel-Inspector öffnen
- Klemmenmanager öffnen

Das ist der Kern des UX-Prinzips „Fehler dort zeigen, wo man sie behebt“.

---

# 11. FixAction

Eine Regel kann sichere Korrekturen vorschlagen.

```text
id
label
action_type
command_template
requires_confirmation
```

Beispiele:

```text
Artikel auswählen
freie Ader zuweisen
BMK neu nummerieren
Gerät in Aufbau anzeigen
```

FixAction löst immer einen normalen Command aus und umgeht Undo/Validation nicht.

---

# 12. Keine riskanten Auto-Fixes

Die Prüfungs-Engine darf nicht eigenmächtig fachliche Entscheidungen treffen.

Beispiel:

`Potentialkonflikt +24V / 0V`

Nicht automatisch eine Leitung löschen.

Stattdessen:

- betroffene Netze zeigen
- Benutzer entscheiden lassen

---

# 13. RuleProfile

```text
id
name
version
rule_settings{}
```

Pro Regel:

```text
enabled
severity_override?
parameters{}
export_policy?
```

Damit können Firmen/Projektvorlagen strengere oder lockerere Regeln verwenden.

---

# 14. Beispiel Regelparameter

```text
ARTICLE_MISSING:
  severity = warning

UNUSED_CABLE_CORE:
  severity = info

ROW_CAPACITY_EXCEEDED:
  severity = error
```

Diese Werte sind Projektprofile, nicht globale unveränderbare Konstanten.

---

# 15. Harte Invarianten vs. Findings

Nicht jeder ungültige Zustand darf überhaupt entstehen.

### Harte Invariante

```text
Placement referenziert nicht existierende Function-ID
```

→ Command ablehnen / Projekt beschädigt.

### Finding

```text
Device hat noch keinen Artikel
```

→ Projektzustand erlaubt, Warning.

Diese Ebenen bleiben getrennt.

---

# 16. Prüfzeitpunkte

Mindestens:

```text
on_change
on_demand
before_export
on_project_open
```

UI kann permanent den aktuellen Stand anzeigen.

---

# 17. Inkrementelle Prüfung

Langfristig:

```text
Transaction affected object IDs
      ↓
Rule dependency graph
      ↓
re-run relevant rules
```

Beispiel Artikeländerung muss nicht alle Seitenkoordinatenregeln neu prüfen.

MVP darf initial vollständige Prüfung verwenden, wenn Performance ausreicht.

---

# 18. Dependency Tags

Regeln können deklarieren:

```text
article_data
reference_designation
net_topology
cabinet_layout
terminal_connectivity
```

Commands erzeugen entsprechende ChangeTags.

So wird spätere inkrementelle Validation einfacher.

---

# 19. Prüfstatus in UI

Globale Statusleiste zeigt beispielsweise:

```text
● 3 Fehler   ● 6 Warnungen
```

Klick öffnet Prüfung.

Die Farbe wird durch Icon/Text ergänzt, damit Status nicht nur über Farbe transportiert wird.

---

# 20. Inspector-Prüfung

Bei ausgewähltem Device zeigt der Prüfungs-Tab:

- Befunde dieses Devices
- Befunde seiner Functions
- Befunde seiner Placements
- direkt verwandte Befunde

Nicht sämtliche Projektfehler ungefiltert.

---

# 21. Datenmanager

Filter `Nur mit Befunden` bedeutet:

Zeige Tabellenobjekte mit mindestens einem aktiven Finding im aktuellen Kontext.

Optional Severity-Filter:

```text
nur Fehler
Fehler + Warnungen
alle
```

---

# 22. Aufbau

Reihen-/Gerätefehler werden direkt am Layout markiert.

Beispiele:

```text
39 / 36 TE
Gerät ohne Breite
Gerät kollidiert
falscher Montageort
```

Prüfungsleiste rechts zeigt dieselben Findings, keine zweite Fehlerquelle.

---

# 23. Stromlaufplan

Mögliche visuelle Marker:

- kleiner Warnpunkt an Seite im Navigator
- Badge an Device
- markierter Anschluss
- Seitenfortsetzung mit Fehler

Die eigentliche Schaltplansymbolik darf durch Prüfmarker nicht unlesbar werden.

---

# 24. Seitennavigator

Eine Seite kann aggregierten Status anzeigen:

```text
none
info
warning
error
```

Aggregation nimmt höchste aktive Severity der auf dieser Seite lokalisierbaren Findings.

---

# 25. Suppression

Ein Finding kann bewusst ignoriert werden, wenn Profil dies erlaubt.

`FindingSuppression`:

```text
id
rule_id
finding_identity/object refs
reason
created_by?
created_at
expires_at?
revision_id?
```

Die Prüfung läuft weiterhin; nur Darstellung/Status berücksichtigt die Suppression.

---

# 26. Suppression ist sichtbar

Unterdrückte Befunde verschwinden nicht spurlos.

Filter:

```text
Aktiv
Ignoriert
Alle
```

Inspector zeigt:

```text
Ignoriert – Begründung: ...
```

---

# 27. Suppression invalidieren

Wenn sich relevante Objektdaten stark ändern, kann eine alte Suppression ungültig werden.

Beispiel:

Regel betrifft Gerät `-F1` ohne Artikel.

Nach Artikelzuweisung verschwindet Finding.

Später wird Artikel wieder entfernt: neue Finding-Instanz kann bewusst nicht automatisch alte Suppression übernehmen, wenn Identität/Revision nicht passt.

---

# 28. Exportpolitik

Before Export wird Prüfung ausgeführt.

`ExportPolicy` kann definieren:

```text
allow
warn
block
```

nach Severity.

Empfohlene UX:

- Warning: Export möglich
- Error: deutliche Warnung, je Profil möglich
- Critical: kann blockieren

Projektprofil entscheidet.

---

# 29. Vorläufige Dokumentation

Wenn trotz Befunden exportiert wird, kann Dokumentprofil optional Kennzeichnung setzen:

```text
VORLÄUFIG
NICHT GEPRÜFT
```

Dies ist Dokumentationsoption, nicht automatisch bei jedem Warning.

---

# 30. Beispielregeln Referenzkennzeichen

```text
DUPLICATE_REFERENCE_DESIGNATION
INVALID_REFERENCE_FORMAT
MISSING_LOCAL_DESIGNATION
STRUCTURE_ASSIGNMENT_MISSING
RESERVED_DESIGNATION_USED
```

---

# 31. Beispielregeln Artikel/Funktion

```text
ARTICLE_MISSING
ARTICLE_DATA_PARTIAL
REQUIRED_FUNCTION_MISSING
REQUIRED_FUNCTION_UNPLACED
SYMBOL_PORT_UNBOUND
ARTICLE_TEMPLATE_CONFLICT
```

---

# 32. Beispielregeln elektrische Netze

```text
OPEN_REQUIRED_CONNECTION
POTENTIAL_CONFLICT
CONNECTION_POINT_OVER_CAPACITY
INVALID_CONNECTION_TYPE
ORPHANED_NET
CONTINUATION_TARGET_MISSING
```

---

# 33. Beispielregeln Aufbau

```text
MISSING_DEVICE_WIDTH_TE
ROW_CAPACITY_EXCEEDED
DEVICE_OVERLAP
DEVICE_OUTSIDE_ROW
MOUNTING_TYPE_NOT_ALLOWED
DEVICE_STRUCTURE_ENCLOSURE_CONFLICT
```

---

# 34. Beispielregeln Klemmen/Kabel

```text
DUPLICATE_TERMINAL_DESIGNATION
BRIDGE_DIFFERENT_POTENTIALS
TERMINAL_TARGET_UNRESOLVED
CABLE_CORE_USED_MULTIPLE_TIMES
CABLE_CORE_COUNT_EXCEEDED
SHIELD_TERMINATION_MISSING
```

---

# 35. SPS-Regeln

Startwerte:

```text
DUPLICATE_PLC_ADDRESS
PLC_CHANNEL_UNASSIGNED
PLC_CHANNEL_TYPE_MISMATCH
PLC_MODULE_ADDRESS_RANGE_CONFLICT
```

Detailliertes SPS-Modell folgt später.

---

# 36. Dokumentationsregeln

```text
TITLE_BLOCK_FIELD_MISSING
SHEET_NUMBER_DUPLICATE
DOCUMENT_SET_EMPTY
GENERATED_PAGE_OUTDATED
BROKEN_DOCUMENT_REFERENCE
```

Ein generierter Plan sollte möglichst aus Live-Daten erzeugt werden, sodass „outdated“ nur bei gecachten/externen Ableitungen relevant ist.

---

# 37. RuleResult Cache

Findings können für UI-Performance gecacht werden.

Cache ist abgeleitet und kann jederzeit neu erzeugt werden.

Er ist nicht die einzige Projektwahrheit.

---

# 38. Persistenz

Im `.oecad` müssen zwingend persistiert werden:

- RuleProfile-Referenz/Version
- projektspezifische Rule Overrides
- FindingSuppressions

Normale aktive Findings können beim Laden neu berechnet werden.

---

# 39. Determinismus

Gleicher Project State + gleiches RuleProfile muss dieselben Findings liefern.

Regeln dürfen nicht von UI-Reihenfolge oder zufälligen Hash-Reihenfolgen abhängen.

---

# 40. Performance

Große Projekte benötigen:

- regelbezogene Indizes
- Objektabhängigkeiten
- inkrementelle Neuberechnung
- asynchrone UI-Aktualisierung

Aber Validation darf keine Race Conditions erzeugen, bei denen alte Ergebnisse neuere Änderungen überschreiben.

Finding-Ergebnis gehört zu einer Project-State/Transaction-Version.

---

# 41. Hintergrundprüfung

UI kann Validation in Worker-Threads durchführen.

Ergebnis wird nur übernommen, wenn es zum erwarteten Projektstand passt.

```text
validation_revision == current_project_revision
```

Sonst verwerfen/neu starten.

---

# 42. Custom Rules

Später können Firmen/Plugins zusätzliche Regeln bereitstellen.

Sie erhalten eine klar begrenzte read-only Projektsicht und liefern Findings zurück.

Custom Rule darf Projekt nicht direkt mutieren.

FixAction läuft über Command-API.

---

# 43. Regelversionierung

Rule-ID bleibt stabil, Logik kann Version besitzen.

Wenn Regelverhalten wesentlich geändert wird, kann das Einfluss auf alte Suppressions haben.

Deshalb:

```text
rule_id
rule_version
```

---

# 44. Projektprüfung vs. Normprüfung

UI sollte nicht suggerieren:

```text
"0 Fehler = normkonform"
```

Besser:

```text
"0 Projektbefunde"
```

oder

```text
"Projektprüfung ohne Befund"
```

mit klar definiertem RuleProfile.

---

# 45. Tests

Jede Regel benötigt Fixtures:

```text
valid case
invalid case
boundary case
suppression behavior
severity override
fix action if any
```

Besonders elektrische Regeln brauchen Tests gegen echte Graphstrukturen, nicht nur UI-Screenshots.

---

# 46. Offene Punkte v0.2

- vollständiger Rule-Katalog pro Projektvorlage
- Rule dependency graph
- FixAction API
- Custom Rule Plugin API
- Suppression identity strategy
- Export-Policy-Defaults
- Performanceziele pro Projektgröße

---

# 47. Konsequenz für Rust

Validation wird als eigenes Subsystem entworfen:

```text
Domain Project (read-only snapshot/view)
       ↓
Validation Engine + RuleProfile
       ↓
FindingSet
       ↓
UI / Export policy / navigation
```

Keine UI-Komponente implementiert eigene parallele fachliche Fehlerlogik.
