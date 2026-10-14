# Artikel-, Hersteller- und Katalogmodell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument definiert den Hersteller-/Artikelkatalog von OpenE-CAD. Eaton dient als erster Referenzfall, ohne dass das Kernmodell an Eaton oder ein proprietäres Fremdformat gekoppelt wird.

---

# 1. Grundsatz

Der Katalog ist eine **Bibliothek von Produkttypen**.

Das Projekt enthält **Instanzen** dieser Produkttypen.

```text
Catalog Article
       ↓
Project Device
       ↓
Functions / Placements / CabinetPlacement
```

Mehrere Devices können denselben Article verwenden.

---

# 2. Manufacturer

```text
id
name
short_name
website?
country?
external_ids{}
metadata{}
```

Manufacturer-ID ist intern stabil und nicht nur der sichtbare Name.

---

# 3. Article

```text
id
manufacturer_id
article_number
type_designation
short_description
long_description?
status
product_family?
product_series?
gtin?
etim_class?
eclass_id?
source_ref
version_ref
properties{}
```

`article_number` ist Herstellerkennung, aber nicht die interne globale Article-ID.

---

# 4. Artikelidentität

Ein importierter Artikel wird nicht ausschließlich über Beschreibungstext dedupliziert.

Bevorzugte Identifikatoren:

```text
source-specific stable ID
manufacturer + article_number
GTIN, falls vorhanden
```

Konflikte müssen als Importentscheidung behandelt werden.

---

# 5. ArticleVersion / Provenance

Katalogdaten benötigen Herkunft.

```text
source_id
source_type
source_version
source_updated_at
imported_at
license_info?
redistribution_allowed?
```

Ziel:

- nachvollziehen, wo ein Wert herkommt
- Katalogupdates kontrollieren
- keine fremden Daten unbemerkt als eigene verteilen

---

# 6. Datenquellen

Starttypen:

```text
manual
open_catalog
manufacturer_import
csv_import
xml_import
bmecat_import
plugin_import
project_snapshot
```

Spätere proprietäre Adapter werden separat implementiert und sind nicht Teil des Core-Formats.

---

# 7. Lizenz-/Redistributionsstatus

Ein Katalogeintrag kann technisch importierbar sein, ohne dass OpenE-CAD ihn öffentlich mitliefern darf.

Deshalb wird unterschieden:

```text
usable_locally
redistributable
source_link_only
unknown
```

OpenE-CAD soll keine Hersteller-/Fremdkataloge ohne passende Rechte in das öffentliche Repository kopieren.

---

# 8. Eaton als Referenzhersteller

Für den ersten Entwicklungsstand kann Eaton verwendet werden für:

- UI-Beispiele
- manuell angelegte Testartikel
- Importtests mit rechtmäßig verfügbaren Daten
- typische Gerätekategorien wie Schütze, Schutzgeräte und Befehlsgeräte

Der Core enthält keine Eaton-spezifische Logik.

Artikelbeispiele in Tests müssen klar als Test-/Referenzdaten gekennzeichnet sein, wenn sie nicht aus einer verifizierten Quelle stammen.

---

# 9. Typisierte Properties

Technische Eigenschaften sollen nicht als beliebige String-Masse enden.

`PropertyDefinition`:

```text
id
namespace
key
data_type
unit?
label
category
allowed_values?
```

`PropertyValue`:

```text
property_definition_id
value
source?
quality?
```

---

# 10. Datentypen

Mindestens:

```text
string
integer
decimal
boolean
enum
quantity
range
url
reference
```

Für Mengenwerte ist eine eindeutige Einheit erforderlich.

---

# 11. Property-Kategorien

Beispiele:

```text
electrical
mechanical
ordering
classification
environmental
documentation
mounting
custom
```

Der Inspector kann Properties anhand dieser Kategorien gruppieren.

---

# 12. Elektrische Eigenschaften

Mögliche neutrale Property-Keys:

```text
rated_current
rated_voltage
coil_voltage
coil_voltage_type
breaking_capacity
number_of_poles
contact_configuration
power_rating
frequency_range
ip_rating
```

Nicht jede Artikelklasse benötigt jedes Feld.

---

# 13. Mechanische Eigenschaften

```text
width_mm
height_mm
depth_mm
width_te
weight
mounting_type
```

Diese Properties speisen Aufbau/Cabinet-Modell.

---

# 14. ArticleClass

Artikel erhalten eine neutrale Produktklasse.

Beispiele:

```text
contactor
circuit_breaker
rcd
fuse
push_button
terminal
power_supply
plc_module
motor
cable
sensor
custom
```

Diese interne Klasse erleichtert Suche, Regeln und FunctionTemplate-Auswahl.

Externe ETIM/eCl@ss-Klassifikationen bleiben zusätzliche Klassifikationen.

---

# 15. FunctionTemplateSet

Artikel kann ein oder mehrere FunctionTemplateSets besitzen.

Details siehe `SYMBOL_FUNCTION_MODEL.md`.

Katalog speichert damit nicht nur „18 A Schütz“, sondern auch seine projektrelevante Funktionsstruktur, soweit Daten verfügbar sind.

---

# 16. MechanicalRepresentation

Artikel kann mehrere mechanische Darstellungen referenzieren:

```text
rail_front
door_front
mounting_plate
side
```

Details siehe `CABINET_LAYOUT_MODEL.md`.

---

# 17. Dokumente

`ArticleDocument`:

```text
id
article_id
document_type
title
language?
embedded_asset_id?
external_uri?
source
```

Typen:

```text
datasheet
manual
certificate
drawing
cad_model
other
```

---

# 18. Bilder

Produktbild ist optionale Kataloginformation und nicht notwendig für Stromlaufplanrendering.

Es kann im Einfügezentrum gezeigt werden, darf aber eine neutrale Symbol-/Frontdarstellung nicht ersetzen.

---

# 19. Zubehörbeziehungen

`ArticleRelation`:

```text
source_article_id
target_article_id
relation_type
quantity?
condition?
```

Starttypen:

```text
optional_accessory
required_accessory
compatible_accessory
replacement
alternative
successor
predecessor
```

---

# 20. Baugruppen

Ein bestellbarer Artikel kann aus mehreren funktionalen Teilen bestehen; umgekehrt können mehrere Artikel gemeinsam ein DeviceAssembly bilden.

Das Modell darf deshalb nicht voraussetzen:

```text
1 Device == exakt 1 Artikel für immer
```

v0.1 verwendet einen Hauptartikel plus optionale `DeviceArticleAssignment[]`.

---

# 21. DeviceArticleAssignment

```text
id
device_id
article_id
role
quantity
source
```

Rollen:

```text
main
accessory
required_part
optional_part
```

Stückliste aggregiert diese Zuordnungen nach Regeln.

---

# 22. Artikelwechsel

Details siehe Symbol-/Funktionsmodell.

Katalog liefert für Vergleich:

- FunctionTemplates
- Properties
- MechanicalRepresentation
- Accessories

UI zeigt Diff vor Migration.

---

# 23. Projektlokale Overrides

Ein Project Device kann Werte überschreiben, ohne globalen Katalog zu verändern.

Beispiel:

```text
article width_te = unbekannt
project override width_te = 2
```

Override wird klar markiert.

Später kann Benutzer ihn bewusst in eigene Bibliothek übernehmen.

---

# 24. Library Layers

Empfohlene Katalogschichten:

```text
1. project snapshots
2. user/company library
3. imported manufacturer catalogs
4. built-in/open base library
```

Suchergebnisse können Quelle und Priorität anzeigen.

Keine Ebene überschreibt still Daten einer anderen.

---

# 25. Firmenbibliothek

Später kann eine Firmenbibliothek eigene:

- Artikel
- geprüfte Daten
- Symbole
- FunctionTemplates
- Makros
- bevorzugte Hersteller

enthalten.

Sie bleibt vom Programmcode getrennt.

---

# 26. Lokale Katalogdatenbank

Für große Kataloge ist SQLite oder eine andere indizierte lokale Datenhaltung sinnvoll.

Sie ist **nicht** das `.oecad`-Projektformat.

Katalogdatenbank kann jederzeit aus Quellen neu aufgebaut/aktualisiert werden, während Projekte ihre Snapshots/Versionen behalten.

---

# 27. Suche

Suchindex unterstützt:

```text
manufacturer
article_number
type_designation
description
product_family
property values
classification
synonyms
```

Beispiel:

```text
"Schütz 24V DC 18A"
```

Suchengine kombiniert Text und strukturierte Filter.

---

# 28. Herstellerpräferenz

Projekt/Benutzer kann bevorzugte Hersteller definieren.

Beispiel:

```text
preferred_manufacturers = [Eaton]
```

Dies beeinflusst Ranking/Filter, nicht die fachliche Kompatibilität oder den Core.

---

# 29. Datenqualitätsstatus

```text
verified
complete
partial
manual
imported_unverified
outdated
conflict
```

Zusätzlich pro Feld möglich:

```text
verified_fields
source_per_field
```

Das Einfügezentrum kann Datenqualität sichtbar machen.

---

# 30. Konflikte zwischen Quellen

Wenn zwei Quellen unterschiedliche Werte liefern:

```text
Source A: width_te = 2
Source B: width_te = 2.5
```

Nicht still überschreiben.

Konfliktobjekt/Importreport zeigt beide Werte und Prioritätsregel.

---

# 31. Import Pipeline

```text
Source Adapter
→ Raw Source Model
→ Normalize
→ Match existing Articles
→ Validate
→ Conflict Report
→ Commit Catalog Transaction
→ Reindex
```

Importer schreibt nicht direkt ungeprüft in Core-Tabellen.

---

# 32. Mapping Profiles

CSV/XML-Import kann MappingProfile speichern:

```text
source column "Artikel-Nr"
→ article_number

source column "Breite TE"
→ property width_te
```

Dadurch sind wiederholbare Hersteller-/Lieferantenimporte möglich.

---

# 33. Katalogupdate

Update unterscheidet:

```text
new
changed
unchanged
removed/deprecated
conflict
```

Bereits verwendete Projektartikel werden nicht ungefragt migriert.

---

# 34. Deprecated Articles

Katalogartikel kann Status besitzen:

```text
active
discontinued
obsolete
unknown
```

Bestandsprojekte bleiben gültig; Prüfung kann auf abgekündigten Artikel hinweisen.

---

# 35. Alternativartikel

Alternativen sind Vorschläge, keine automatische Ersetzung.

Vor Wechsel werden mindestens verglichen:

- FunctionTemplate-Kompatibilität
- elektrische Eigenschaften
- mechanische Abmessungen
- Zubehör

---

# 36. BOM Aggregation

Stückliste gruppiert standardmäßig nach Article-ID/Version bzw. konfigurierbarem Schlüssel.

Projektgeräte bleiben trotzdem einzelne Instanzen.

Beispiel:

```text
-K1, -K2, -K3 → gleicher Article → Stückzahl 3
```

---

# 37. Bestellliste

Bestellliste kann andere Regeln als Gerätestückliste verwenden:

- Zubehör mit aggregieren
- Ersatzteile
- Mindestverpackung später
- alternative Bestellnummern

Beide werden aus DeviceArticleAssignments erzeugt.

---

# 38. Snapshot im Projekt

Beim Verwenden eines Artikels wird ein ausreichend vollständiger Projekt-Snapshot referenziert/eingebettet.

Snapshot enthält die für Reproduzierbarkeit notwendigen Werte, nicht zwingend den gesamten Herstellerdatensatz.

Details siehe `PROJECT_FORMAT.md`.

---

# 39. Löschen aus globalem Katalog

Ein Katalogeintrag, der in alten Projekten verwendet wurde, darf deren Darstellung nicht zerstören.

Projekt-Snapshot bleibt verfügbar.

Beim Öffnen wird ggf. angezeigt:

```text
Katalogartikel lokal nicht mehr verfügbar – Projekt-Snapshot wird verwendet.
```

---

# 40. Eigene Artikel

Benutzer kann manuell Artikel erstellen.

Minimum:

```text
manufacturer/free manufacturer
article_number
type_designation
description
ArticleClass
```

FunctionTemplates und mechanische Daten können schrittweise ergänzt werden.

---

# 41. Freies Gerät ohne Artikel

Device ohne Article bleibt vollständig zulässig.

Der Katalog ist Unterstützung, keine Voraussetzung für jeden Zeichenworkflow.

RuleProfile entscheidet, ob fehlender Artikel als Hinweis oder Fehler gilt.

---

# 42. Prüfbefunde

Beispiele:

```text
ARTICLE_MISSING
ARTICLE_DATA_PARTIAL
ARTICLE_DISCONTINUED
ARTICLE_PROPERTY_CONFLICT
FUNCTION_TEMPLATE_MISMATCH
MECHANICAL_DATA_MISSING
ARTICLE_SOURCE_OUTDATED
```

---

# 43. UI Einfügezentrum

Drei Bereiche wie im v0-Design:

### links

- Kategorien
- Hersteller
- Filter
- Datenqualität

### Mitte

- Ergebnisse
- wichtigste Eckdaten
- Quelle

### rechts

- Vorschau
- elektrische Daten
- FunctionTemplates
- Symbole
- mechanische Daten
- Zubehör
- Datenqualität

---

# 44. Offline-Nutzung

Kernkatalog und eigene/importierte Bibliotheken müssen lokal nutzbar sein.

OpenE-CAD darf keine permanente Cloudverbindung für normale Projektbearbeitung verlangen.

---

# 45. Offene Punkte v0.2

- konkretes Katalog-DB-Schema
- ETIM/eCl@ss Mappingtiefe
- BMEcat-Versionen
- Hersteller-Update-Feeds
- Firmenbibliotheks-Synchronisation
- Signaturen/Vertrauen für Katalogpakete
- Lizenzmetadatenformat
- Zubehörkonfigurator
- Variantengenerator

---

# 46. Konsequenz für Rust

Der Katalog ist ein eigener Subsystembereich:

```text
catalog domain
catalog persistence/index
import adapters
project snapshot mapper
```

Projekt-Core darf nicht voraussetzen, dass die globale Katalogdatenbank beim Laden vorhanden ist.
