# `.oecad` Projektformat und Schema-Versionierung

Stand: 14.10.2026  
Status: **fachliche/technische Spezifikation v0.1 – noch kein Codeformat fest verdrahtet**

Dieses Dokument definiert die Ziele und eine erste Containerstruktur für OpenE-CAD-Projekte.

Ziel ist ein offenes, dokumentiertes, migrationsfähiges und robust speicherbares Format, das weder an eine bestimmte GUI noch an eine proprietäre Datenbank gebunden ist.

---

# 1. Grundsatz

Dateiendung:

```text
.oecad
```

Bevorzugte Arbeitshypothese:

```text
ZIP-kompatibler Container
mit JSON-Domänendaten und eingebetteten Assets
```

Die Spezifikation soll so aufgebaut sein, dass derselbe logische Inhalt optional auch als entpacktes Projektverzeichnis verwendet werden kann.

---

# 2. Ziele

Das Projektformat soll:

- offen dokumentiert sein
- ohne laufende Datenbank lesbar sein
- Schema-Versionen besitzen
- deterministisch migrierbar sein
- alte Projekte langfristig öffnen können
- Bibliotheksabhängigkeiten nachvollziehbar machen
- Assets sicher einbetten
- robuste atomare Speicherung erlauben
- semantische Diffs möglichst unterstützen
- keine ausführbaren Inhalte voraussetzen

---

# 3. Nicht-Ziele

Das `.oecad`-Projekt ist nicht:

- der globale Herstellerkatalog
- eine SQLite-Datenbankkopie des gesamten Programms
- ein Cache für jede UI-Darstellung
- ein Binärdump von Rust-Structs
- an eine konkrete Rust-Serialisierungsbibliothek gebunden

---

# 4. Containerstruktur v0.1

Arbeitshypothese:

```text
project.oecad
├── manifest.json
├── project.json
├── model/
│   ├── structure.json
│   ├── devices.json
│   ├── nets.json
│   ├── terminals.json
│   ├── cables.json
│   ├── plc.json
│   ├── enclosures.json
│   └── documentation.json
├── sheets/
│   ├── <sheet-id>.json
│   └── ...
├── library/
│   ├── symbols/
│   ├── templates/
│   └── catalog-snapshots/
├── assets/
│   ├── images/
│   ├── logos/
│   └── documents/
├── profiles/
│   ├── rules.json
│   ├── reference-designation.json
│   ├── appearance.json
│   └── documentation.json
└── metadata/
    └── revisions.json
```

Die endgültige Aufteilung kann nach Performance-Spikes angepasst werden.

---

# 5. manifest.json

Minimal:

```json
{
  "format": "OpenE-CAD Project",
  "format_version": "1.0",
  "schema_version": "0.1.0",
  "application_version_created": "...",
  "application_version_last_saved": "...",
  "project_id": "...",
  "created_at": "...",
  "modified_at": "..."
}
```

Zusätzlich später:

```text
required_features[]
optional_features[]
checksums{}
compression_profile
```

---

# 6. format_version vs. schema_version

Trennung:

### format_version

Beschreibt den grundlegenden Container-/Dateiaufbau.

Beispiel:

```text
ZIP + JSON layout v1
```

### schema_version

Beschreibt das fachliche JSON-Schema der Domänenobjekte.

Dadurch kann beispielsweise das Datenmodell erweitert werden, ohne den gesamten Containerstandard zu ändern.

---

# 7. project.json

Enthält projektweite Metadaten, aber nicht zwingend alle Domänenobjekte.

Beispiel:

```text
id
name
project_number
customer
languages
active_profiles
sheet_order
created/modified metadata
custom_properties
```

Große Objektmengen werden in `model/` bzw. `sheets/` getrennt.

---

# 8. Sheet-Dateien

Jede editierbare Seite kann eine eigene Datei besitzen:

```text
sheets/<sheet-id>.json
```

Enthält:

- Seitenmetadaten
- SchematicPlacements
- ConnectionPathPlacements
- GraphicObjects
- lokale Text-/Darstellungsdaten

Fachliche Devices/Functions werden **nicht** als vollständige Kopie in jede Seite eingebettet.

Placements referenzieren stabile IDs aus dem Model.

---

# 9. Warum Seiten separat

Vorteile:

- große Projekte müssen nicht als ein riesiges JSON-Dokument behandelt werden
- Änderungen einzelner Seiten sind klarer
- Git-/Diff-freundlicher im entpackten Modus
- Lazy Loading wird möglich
- beschädigte Einzeldateien können gezielter diagnostiziert werden

---

# 10. Model-Dateien

Model-Dateien gruppieren fachliche Objekte nach Domäne.

Beispiel `devices.json`:

```text
Devices
Functions
ConnectionPoints
```

`nets.json`:

```text
PotentialDefinitions
Nets
ElectricalConnections
JunctionNodes
ContinuationNodes
Wires
```

Diese Trennung ist logisch; die konkrete Granularität wird nach Performance-/Merge-Tests finalisiert.

---

# 11. IDs im Dateiformat

Persistente Referenzen verwenden stabile IDs.

Nicht:

```json
{ "target": "-K1:A1" }
```

sondern:

```json
{ "target_connection_point_id": "01..." }
```

Sichtbare BMK sind gespeicherte Eigenschaften bzw. berechnete Formatierungen.

---

# 12. ID-Typ

Noch offen:

```text
UUID v4/v7
ULID
ähnlicher stabiler 128-bit Identifier
```

Anforderungen:

- kollisionsarm ohne zentrale Datenbank
- als String portabel
- stabil über Save/Migration
- neue IDs lokal erzeugbar

Die konkrete Entscheidung erfolgt vor Rust-Core-Implementierung.

---

# 13. JSON-Regeln

Bevorzugt:

- UTF-8
- explizite Feldnamen
- keine implizite Typinformation nur aus Arrayposition
- Zahlen in klar definierten Einheiten
- Enums als dokumentierte Strings
- unbekannte optionale Felder möglichst tolerant lesen
- unbekannte erforderliche Features über Manifest erkennen

---

# 14. Einheiten

Nie uneindeutige nackte Werte, wenn die Einheit nicht aus dem Schema eindeutig ist.

Beispiel Feldnamen:

```text
width_mm
height_mm
position_te
nominal_voltage_v
frequency_hz
```

Alternativ kann später ein typisiertes Quantity-Modell eingeführt werden.

---

# 15. Koordinaten

Zeichnungskoordinaten benötigen eine fest definierte interne Einheit.

Noch offen, aber Anforderungen:

- keine Rundungsdrift beim wiederholten Speichern
- für CAD-Geometrie ausreichend präzise
- nicht von Bildschirm-Pixeln abhängig
- Papiermaßstab reproduzierbar

Mögliche Richtung:

```text
integer microunits / fixed-point drawing units
```

Dies wird im Renderer-Spike entschieden.

---

# 16. Deterministische Serialisierung

Wo praktisch sollen Objekte deterministisch geschrieben werden:

- stabile Array-Sortierung
- definierte Feldstruktur
- keine zufällige HashMap-Reihenfolge
- keine unnötigen Zeitstempeländerungen

Ziel:

Ein Projekt ohne fachliche Änderung soll beim erneuten Speichern möglichst wenig Dateidiff erzeugen.

---

# 17. ZIP-Metadaten

Wenn `.oecad` als ZIP gespeichert wird, sollten Container-Metadaten so weit möglich reproduzierbar sein.

Insbesondere:

- keine fachlich irrelevanten zufälligen Dateireihenfolgen
- definierte Pfade
- keine absoluten lokalen Dateipfade

Git-freundliche Vergleiche erfolgen vorzugsweise über einen späteren semantischen Diff bzw. entpackten Modus.

---

# 18. Bibliotheksreferenzen

Projektobjekte speichern:

```text
source_definition_id
source_definition_version
```

Zusätzlich kann das Projekt verwendete Bibliotheksstände als Snapshot einbetten.

Damit bleibt ein Projekt renderbar, auch wenn die globale Bibliothek später geändert wurde.

---

# 19. CatalogSnapshot

Für konkret verwendete Herstellerdaten kann eine kompakte Momentaufnahme gespeichert werden.

Nur benötigte Daten, nicht der komplette Herstellerkatalog.

Beispiel:

```text
Article identity
relevante properties
FunctionTemplateSet version
MechanicalRepresentation
source metadata
```

Der Snapshot dokumentiert den Projektstand.

---

# 20. Bibliotheksupdate

Öffnen eines alten Projekts führt nicht automatisch zu neuen Artikeldaten.

Workflow:

```text
Projekt nutzt Snapshot/version A
Globale Bibliothek bietet B
→ Update verfügbar
→ Diff anzeigen
→ Benutzer migriert bewusst
```

---

# 21. Assets

Erlaubte Assets können sein:

- Firmenlogo
- projektspezifische Bilder
- externe Dokumentkopien, wenn Nutzer sie bewusst einbettet
- Vorschaubilder

Assets erhalten stabile interne Pfade/IDs.

---

# 22. Externe Links

Dokumente müssen nicht zwingend eingebettet werden.

Ein Article/Project kann auch URI/URL referenzieren.

Das Projektformat unterscheidet:

```text
embedded_asset
external_uri
```

Absolute lokale Pfade sollten vermieden oder als nicht portable Referenz klar markiert werden.

---

# 23. Sicherheit beim Öffnen

Container wird als nicht vertrauenswürdig behandelt.

Mindestens:

- Zip-Slip/Path-Traversal verhindern
- Dateigrößenlimits
- Anzahl Einträge begrenzen
- Dekompressionsbomben berücksichtigen
- keine eingebetteten Dateien automatisch ausführen
- keine Scripts automatisch starten

---

# 24. Keine aktiven Inhalte im Kernformat

Makros im ECAD-Sinn sind Daten-/Platzierungsvorlagen, keine ausführbaren Programme.

Falls später Scripting unterstützt wird:

- separat gekennzeichnet
- explizite Berechtigungen
- niemals automatisch beim Projektöffnen ausführen

---

# 25. Migrationen

Migrationen sind Versionsschritte:

```text
0.1 → 0.2
0.2 → 0.3
...
```

Anforderungen:

- deterministisch
- getestet
- keine stillen Datenverluste
- Migrationsergebnis validieren
- Originaldatei nicht sofort überschreiben

---

# 26. Migrationspipeline

Beim Öffnen:

```text
read manifest
→ determine source schema
→ build migration plan
→ migrate in memory/temp
→ validate
→ open project
```

Beim nächsten Speichern wird die neue Schema-Version geschrieben.

Optional wird Backup des alten Containers angelegt.

---

# 27. Zu neue Projekte

Wenn eine Datei eine unbekannte **höhere** erforderliche Schema-/Feature-Version besitzt:

OpenE-CAD darf sie nicht einfach verlustbehaftet speichern.

Mögliche Modi:

- Öffnen verweigern mit verständlicher Meldung
- read-only, wenn sichere Darstellung möglich

Kein stilles Entfernen unbekannter Daten.

---

# 28. Feature Flags

Manifest kann später enthalten:

```text
required_features
optional_features
```

Beispiel:

```text
required: ["multi_level_terminals_v2"]
```

Damit kann eine ältere Anwendung erkennen, dass sie das Projekt nicht sicher bearbeiten kann.

---

# 29. Validierung beim Laden

Mehrstufig:

```text
1. Container gültig
2. JSON syntaktisch gültig
3. Schema gültig
4. Referenzintegrität
5. Domäneninvarianten
6. normale Projektprüfregeln
```

Schemafehler und normale Engineering-Befunde sind verschiedene Fehlerklassen.

---

# 30. Fehlende Referenz

Wenn beispielsweise eine Placement eine unbekannte Function-ID referenziert:

- Projekt als beschädigt markieren
- Diagnose mit Objektpfad ausgeben
- wenn möglich read-only/recovery anbieten

Nicht einfach das Placement still löschen.

---

# 31. Atomic Save

Speichervorgang:

```text
project.oecad
    ↓
project.oecad.tmp schreiben
    ↓
Container fertigstellen
    ↓
Integritätsprüfung
    ↓
atomar ersetzen
```

Optional:

```text
project.oecad.bak
```

---

# 32. Autosave

Autosave verwendet bevorzugt einen separaten Recovery-Pfad.

Nicht alle 30 Sekunden die einzige Projektdatei überschreiben.

Recovery-Daten können als:

- temporärer Snapshot
- Journal

geführt werden.

---

# 33. Project Lock

Für lokalen Mehrfachstart kann eine Sidecar-Lockdatei verwendet werden:

```text
project.oecad.lock
```

Enthält z. B.:

```text
machine/session identifier
process identifier
opened_at
```

Stale Locks müssen erkannt und übersteuerbar sein.

Das ist kein vollständiges Mehrbenutzer-Locking.

---

# 34. Workspace-Datei

Nichtfachliche persönliche UI-Einstellungen sollten nicht unnötig das gemeinsame Projekt ändern.

Option:

```text
project.oecad.workspace
```

oder globaler User-State keyed by project_id.

Darin:

- letzte Seite
- Zoom
- Panelbreiten
- offene Navigator-Tabs
- Theme
- Fensterlayout

---

# 35. Revisionen

`metadata/revisions.json` speichert fachliche Revisionen, nicht jeden Undo-Schritt.

```text
revision id
label
date
author
description
status
```

Ein späterer semantischer Diff kann Revisionen vergleichen.

---

# 36. History-Verzeichnis

Ein eingebettetes vollständiges Versionsarchiv ist **nicht** für v1 erforderlich.

`history/` aus frühen Konzepten wird deshalb vorerst nicht als Pflichtbestandteil definiert.

Versionierung kann über:

- Revision metadata
- externe Git-/Dateiversionierung
- spätere Snapshotfunktion

gelöst werden.

---

# 37. Semantischer Diff

Späterer Diff arbeitet auf stabilen IDs:

```text
Device 01... article changed
Device 02... moved to row 3
Sheet 03... placement moved
Terminal 04... renumbered
```

Nicht nur Textdiff von JSON.

---

# 38. Entpackter Projektmodus

Für Entwickler/CI/Git kann später unterstützt werden:

```text
project.oecad-dir/
```

mit identischer logischer Struktur wie der Container.

CLI kann packen/entpacken/validieren.

Der normale Anwender arbeitet weiterhin mit einer Datei.

---

# 39. CLI-Perspektive

Spätere CLI-Kommandos:

```text
opene-cad validate project.oecad
opene-cad migrate project.oecad
opene-cad unpack project.oecad out/
opene-cad pack dir/ project.oecad
opene-cad export --pdf project.oecad
```

Noch kein Implementierungsumfang des ersten MVP, aber Format soll dies ermöglichen.

---

# 40. JSON Schema

Für veröffentlichte stabile Formatversionen sollen maschinenlesbare Schemas bereitgestellt werden.

Beispielstruktur im Repository:

```text
schemas/
  1.0/
    manifest.schema.json
    project.schema.json
    devices.schema.json
    ...
```

Erst erstellen, wenn das Domänenmodell ausreichend stabil ist.

---

# 41. Custom Properties

Erweiterbare Felder müssen namespaced sein.

Beispiel:

```text
custom_properties: {
  "company.example:mounting_note": "..."
}
```

So sinkt das Kollisionsrisiko mit zukünftigen Core-Feldern.

---

# 42. Plugins

Plugin-spezifische Daten müssen deklarieren:

```text
namespace
schema/version
required/optional
```

Wenn Plugin fehlt:

- optionale Daten erhalten, soweit möglich
- erforderliche Feature-Daten verhindern unsicheres Speichern

---

# 43. Kompression

JSON und SVG-/Textdaten sind gut komprimierbar.

Bilder/PDFs oft bereits komprimiert.

ZIP-Kompressionsdetails sind Implementierungsfrage, dürfen aber das logische Format nicht verändern.

---

# 44. Vorschau

Optional kann der Container eine Preview enthalten:

```text
preview/thumbnail.png
```

Sie ist Cache/Komfortfunktion und keine fachliche Wahrheit.

Fehlt sie, kann OpenE-CAD sie neu erzeugen.

---

# 45. Datenschutz

Projektmetadaten können Kundendaten enthalten.

Deshalb:

- keine ungefragte Cloudübertragung
- keine Telemetrieinhalte aus Projektdaten ohne explizite Einwilligung
- externe Links klar sichtbar

Das Dateiformat selbst bleibt lokal nutzbar.

---

# 46. Testanforderungen

Für jede Schema-Version:

- Roundtrip Load/Save
- deterministischer Roundtrip
- Migration Fixture alt → neu
- beschädigte Referenz
- unbekanntes optionales Feld
- unbekanntes required feature
- große Projekte
- Unicode
- Assets
- Atomic-save failure simulation

---

# 47. Offene Entscheidungen vor Implementation

- UUID vs. ULID o. ä.
- interne CAD-Koordinateneinheit
- exakte JSON-Aufteilung großer Model-Dateien
- canonical JSON rules
- eingebettete Bibliothekssnapshots: vollständige Definition vs. kompakte Kopie
- Recovery-Journal statt Snapshot
- Lockfile-Details

---

# 48. Konsequenz für Rust

Persistenzschicht darf nicht einfach `serde_json::to_string(ProjectStruct)` als dauerhaftes öffentliches Format behandeln.

Es braucht eine explizite Format-/DTO-Schicht:

```text
Domain Model
   ↕ mapper
Persistence DTO / Schema
   ↕ serializer
.oecad container
```

Dadurch kann das interne Rust-Modell weiterentwickelt werden, ohne jede Struct-Änderung automatisch zum Dateiformatbruch zu machen.
