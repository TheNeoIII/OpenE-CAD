# SPS-/I/O-Modell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument definiert das SPS-/I/O-Grundmodell für OpenE-CAD. Ziel ist ein herstellerneutrales Modell, das Adressen, Baugruppen, Kanäle, elektrische Anschlüsse und I/O-Listen gemeinsam abbildet.

Der erste Rust-Core muss noch keinen vollständigen SPS-Konfigurator liefern; das Datenmodell soll spätere Funktionen jedoch nicht blockieren.

---

# 1. Grundsatz

SPS-Adresse, Geräte-BMK und interne Objekt-ID sind drei verschiedene Dinge.

```text
stable DeviceId
     ↓
ReferenceDesignation   z. B. -A1
     ↓
PLC Module / Channel
     ↓
PLC Address            z. B. %Q0.3
```

Eine Adressänderung darf keine Projektbeziehungen zerstören.

---

# 2. PLCSystem

Ein Projekt kann mehrere SPS-/Steuerungssysteme besitzen.

```text
id
name
manufacturer_id?
platform?
structure_assignments[]
address_profile_id
properties{}
```

Beispiele:

```text
Haupt-SPS
Remote-I/O Feld 1
Safety PLC
Gebäude-I/O
```

---

# 3. PLCStation

Physische/logische Station innerhalb eines PLCSystem.

```text
id
plc_system_id
name
device_id?
station_address?
network_address?
sort_order
properties{}
```

Kann beispielsweise repräsentieren:

- CPU-Rack
- Remote-I/O-Station
- Buskoppler

---

# 4. PLCModule

Eine SPS-Baugruppe referenziert normalerweise ein Device und optional einen Article.

```text
id
plc_station_id
device_id
module_type
slot?
start_address?
article_id?
channels[]
properties{}
```

`device_id` stellt die gemeinsame Identität mit Stromlaufplan, Aufbau und BOM her.

---

# 5. ModuleType

Startwerte:

```text
cpu
digital_input
digital_output
analog_input
analog_output
mixed_io
communication
power_supply
safety_input
safety_output
technology
custom
```

Herstellerbezeichnungen werden über Article/Properties ergänzt.

---

# 6. PLCChannel

Kleinste adressierbare I/O-Funktion.

```text
id
plc_module_id
channel_index
channel_type
address?
symbolic_name?
function_text?
connection_point_id?
properties{}
```

Ein Kanal kann einen eigenen ConnectionPoint besitzen oder auf eine Function/ConnectionPoint-Struktur des Module-Devices referenzieren.

---

# 7. ChannelType

Startwerte:

```text
digital_input
digital_output
analog_input
analog_output
safety_input
safety_output
counter
pulse
communication
power
unused
custom
```

---

# 8. PLCAddress

Adresse wird strukturiert gespeichert, nicht nur als beliebiger String.

Konzeptionell:

```text
address_space
byte_offset?
word_offset?
bit_offset?
channel_offset?
raw_expression?
```

Der sichtbare Text wird durch ein `PLCAddressProfile` formatiert.

Beispiele können sein:

```text
%I0.0
%Q0.3
IW64
QW80
```

Das Kernmodell behauptet keine universelle Schreibweise.

---

# 9. PLCAddressProfile

```text
id
name
address_spaces[]
format_rules
parse_rules
alignment_rules
range_rules
```

Damit lassen sich unterschiedliche Hersteller-/Programmierumgebungen unterstützen.

---

# 10. AddressSpace

Beispiele:

```text
input
output
memory
peripheral_input
peripheral_output
safety_input
safety_output
custom
```

Jeder Space kann eigene Grenzen/Formatierungen besitzen.

---

# 11. Adresse vs. Kanalnummer

```text
channel_index = 3
address = %Q0.3
```

sind getrennte Werte.

Ein Modul kann physisch Kanal 3 besitzen, dessen Adresse sich durch Rack-/Startadressierung ändert.

---

# 12. Automatische Adressierung

Später kann ein AddressAllocator Vorschläge erzeugen.

```text
module order
start address
channel widths
reserved ranges
alignment
```

Ergebnis zunächst als Preview, dann Undo-fähige Transaktion.

Bestehende manuelle Adressen werden nicht still überschrieben.

---

# 13. AddressMode

```text
auto
manual
imported
```

Analog zur BMK-Logik.

Manuell adressierte Kanäle werden standardmäßig bei Auto-Adressierung respektiert.

---

# 14. Symbolischer Name

Ein PLCChannel kann zusätzlich besitzen:

```text
symbolic_name = "Luefter_Start"
```

Dieser Name ist nicht:

- BMK
- stabile ID
- zwingend SPS-Adresse

Er kann für I/O-Listen und Exporte verwendet werden.

---

# 15. Channel Function Text

Beschreibung der Signalbedeutung:

```text
"Lüfter Rückmeldung"
"Türkontakt Verteiler"
```

Kann mehrsprachig geführt werden.

---

# 16. Electrical Connection

Ein PLCChannel ist mit dem normalen elektrischen Graphen verbunden.

```text
PLCChannel
   ↓ connection_point_id
ConnectionPoint
   ↓
Net / ElectricalConnection
```

Keine separate „SPS-Verdrahtungsdatenbank“.

---

# 17. Kanal-Platzierung im Stromlaufplan

Ein Module-Device kann verschiedene Darstellungen besitzen:

- komplette Baugruppe
- einzelne Kanäle auf mehreren Seiten
- Übersicht

Jede Kanal-/Function-Platzierung referenziert dieselbe Device-/Channel-Identität.

---

# 18. Channel Symbol Mapping

FunctionTemplate eines SPS-Artikels kann viele Kanaltemplates liefern.

Beispiel:

```text
DI channel template × 16
```

Instanziierung erzeugt 16 PLCChannels/Functions mit eigenen ConnectionPoints.

Symbolmapping kann pro Kanal oder Blockdarstellung erfolgen.

---

# 19. Blockdarstellung

Ein Symbol darf mehrere Kanäle desselben Modules darstellen.

Dafür wird ein Placement nicht zwingend 1:1 an nur einen Kanal gebunden.

Mögliches spezialisiertes Objekt:

```text
PLCModulePlacement
  module_id
  visible_channel_ids[]
  symbol_definition_id
```

Alternativ kann dies über ein parameterisiertes Multi-Function-Placement gelöst werden.

Diese konkrete Implementierungsentscheidung bleibt für v0.2 offen.

---

# 20. SPS-Navigator

Der im v0-Design vorgesehene SPS-Navigator kann hierarchisch zeigen:

```text
PLC System
 └─ Station
     └─ Module
         ├─ %I0.0  Türkontakt
         ├─ %I0.1  Störung
         ├─ %Q0.0  Schütz K1
         └─ ...
```

Statusicons:

- platziert
- nicht platziert
- ohne Adresse
- Befund

---

# 21. I/O-Datenmanager

Spalten beispielsweise:

```text
System
Station
Modul-BMK
Slot
Kanal
Typ
Adresse
Symbolischer Name
Funktionstext
Ziel-BMK
Ziel-Anschluss
Seite
Status
```

Unterstützt dieselben Tabellenfunktionen:

- Filter
- Mehrfachänderung
- Copy/Paste
- Suchen/Ersetzen
- Nur mit Befunden

---

# 22. Zielermittlung

Angeschlossenes Feldgerät wird aus dem elektrischen Graphen abgeleitet.

Nicht als unabhängiger `target_text` gepflegt.

Für komplexe Netze kann Query mehrere Ziele liefern.

---

# 23. I/O-Liste

Generierte Dokumentation kann enthalten:

```text
Adresse
Symbolischer Name
Kanaltyp
Funktion
Modul
Feldgerät
Anschluss
Potential
Seite
```

Auch CSV/Excel-ähnlicher Export später möglich.

---

# 24. Import / Export

Später sollen Adapter I/O-Listen austauschen können.

Neutraler interner Importprozess:

```text
External I/O format
→ adapter model
→ match system/module/channel
→ conflict preview
→ transaction
```

Keine Herstellerdatei wird direkt zum Domainmodell erklärt.

---

# 25. Matching beim Import

Mögliche Match-Schlüssel, in Priorität:

```text
native OpenE-CAD channel ID
external source stable ID
module reference + channel index
address + context
symbolic name only as weak hint
```

Keine stille Zuordnung allein anhand ähnlicher Funktionstexte.

---

# 26. Konflikte

Beispiele:

```text
Adresse bereits belegt
Kanaltyp stimmt nicht
importierter Kanal existiert nicht
Symbolic Name geändert
Funktionstext lokal geändert
```

Import zeigt Diff/Preview.

---

# 27. Safety-I/O

Safety-Kanäle werden semantisch typisiert.

OpenE-CAD dokumentiert sie, führt aber keine sicherheitstechnische Berechnung oder SIL/PL-Nachweis automatisch aus.

Das UI darf `safety_*` besonders kennzeichnen, ohne „sicher validiert“ zu behaupten.

---

# 28. Analoge Kanäle

Properties können enthalten:

```text
signal_range
engineering_unit
sensor_range
resolution
channel_mode
```

Beispiele:

```text
0–10 V
4–20 mA
PT100
```

Diese Werte sind typisierte Properties des Channel/Article Templates.

---

# 29. Digitale Kanäle

Properties können enthalten:

```text
nominal_voltage
input_filter
output_current
channel_group
```

Hersteller-/artikelspezifische Werte kommen aus Katalogdaten.

---

# 30. Kanalgruppen

Manche Module teilen Potentialgruppen/Commons.

Modell:

```text
PLCChannelGroup
  id
  module_id
  channel_ids[]
  common_connection_points[]
  properties{}
```

Damit können gemeinsame M-/L+-Anschlüsse sauber modelliert werden.

---

# 31. Modulinterne Versorgung

Versorgungsanschlüsse sind normale ConnectionPoints des Module-Devices.

Beispiel:

```text
L+
M
PE
```

Sie gehören nicht automatisch zu jedem I/O-Netz, sondern werden über die Function/Connectivity-Struktur beschrieben.

---

# 32. Kommunikationsmodule

Kommunikationskanäle können andere ConnectionTypes verwenden:

```text
bus
communication
ethernet
serial
custom
```

Die detaillierte Netzwerkkonfiguration ist nicht Kernumfang des ersten SPS-Modells.

---

# 33. Artikelwechsel SPS-Modul

Analog zum allgemeinen ArticleChange, aber mit zusätzlichen Konflikten:

- Kanalzahl geändert
- Kanaltypen geändert
- Adressbereich geändert
- belegte Kanäle entfallen

Kein stiller Verlust bestehender Verdrahtung.

---

# 34. Unbenutzte Kanäle

Ein Kanal kann bewusst `unused`/Reserve sein.

Das verhindert unnötige „nicht verbunden“-Befunde.

Optional kann Firmenprofil Mindestreserven oder Kennzeichnung verlangen.

---

# 35. Prüfregeln

Mindestens:

```text
DUPLICATE_PLC_ADDRESS
PLC_ADDRESS_INVALID
PLC_ADDRESS_OUT_OF_RANGE
PLC_CHANNEL_TYPE_MISMATCH
PLC_CHANNEL_UNASSIGNED
PLC_CHANNEL_UNPLACED
PLC_MODULE_SLOT_CONFLICT
PLC_MODULE_ADDRESS_RANGE_CONFLICT
PLC_IMPORT_CONFLICT
PLC_SAFETY_CHANNEL_UNMARKED
```

Severity aus RuleProfile.

---

# 36. Adresseindeutigkeit

Scope abhängig vom PLCAddressProfile:

```text
system
station
address_space
custom
```

Nicht jede Plattform hat dieselbe globale Adresslogik.

---

# 37. Auto-Nummerierung vs. Auto-Adressierung

Getrennte Systeme:

```text
ReferenceDesignation allocator → -A1
PLC Address allocator          → %Q0.3
```

Beide können gleichzeitig geändert werden, sind aber fachlich unabhängig.

---

# 38. Querverweise

Von PLCChannel möglich:

- zum Module-Device
- zur Kanalplatzierung
- zum angeschlossenen Feldgerät
- zum Aufbau
- zur I/O-Datenzeile

Alles über stabile IDs/Graphqueries.

---

# 39. SPS-Artikelkatalog

Article kann liefern:

```text
module type
channel templates
channel count
address width
connection templates
mechanical representation
power requirements
```

Unvollständige Herstellerdaten sind erlaubt; manuelle Templates möglich.

---

# 40. PLCProgramLink

Spätere optionale Verbindung zu Programmierprojekten:

```text
source_system
project_uri?
external_symbol_id?
last_sync?
```

Kein Kernbestandteil v0.1.

---

# 41. Synchronisation

Späterer PLC-Import/Sync darf nicht voraussetzen, dass externe Software Master über alle ECAD-Daten ist.

Konfliktstrategie:

```text
external changed
OpenE-CAD changed
both changed
```

mit expliziter Benutzerentscheidung.

---

# 42. Persistenz

`.oecad`-Bereich:

```text
model/plc.json
```

enthält Systeme, Stationen, Module, Channels, Groups und externe Mappinginformationen.

Schematic Placements bleiben in Sheets.

---

# 43. Offene Punkte v0.2

- konkrete AddressProfile für verbreitete SPS-Systeme
- TIA/CoDeSys/andere Importadapter
- Multi-Function PLC placements
- Safety-Semantik vertiefen
- Hardware-Konfigurationsdarstellung
- Bus-/Netzwerk-Topologie
- IO-Link-Geräte
- Channel parameter sets

---

# 44. Konsequenz für Rust

SPS-Domain kann logisch unter dem Core liegen:

```text
plc/
  system
  station
  module
  channel
  addressing
  projections
```

SPS-Adresse ist ein typisierter Value Type, kein frei verknüpfter String-Schlüssel.
