# Titelblock-, Rahmen- und Ausdrucksmodell

Stand: 14.10.2026  
Status: **fachliche Spezifikation v0.1**

Dieses Dokument definiert Titelblöcke, Seitenrahmen und Datenbindungen für Stromlaufpläne, Aufbaupläne und generierte Dokumentationsseiten.

Ziel ist, dass der im v0-Design gezeigte Titelblock keine fest programmierte Grafik ist, sondern eine frei definierbare Vorlage mit sicheren, deterministischen Datenbindungen.

---

# 1. Grundsatz

Titelblock und Seitenrahmen sind Darstellungsvorlagen.

```text
Project / Sheet / Revision / Document data
                 ↓
          Expression bindings
                 ↓
      FrameTemplate / TitleBlockTemplate
                 ↓
        Screen / PDF / SVG rendering
```

Die Vorlage enthält keine zweite Kopie der Projektdaten.

---

# 2. FrameTemplate

Ein `FrameTemplate` beschreibt den technischen Seitenrahmen.

```text
id
name
version
supported_page_formats[]
geometry
coordinate_zones
fold_marks?
reference_marks?
metadata{}
```

Mögliche Inhalte:

- Außenrahmen
- Zeichenbereich
- Zonenkoordinaten
- Falzmarken
- Indexfelder
- feste grafische Texte

---

# 3. TitleBlockTemplate

```text
id
name
version
geometry
fields[]
static_graphics[]
logo_slots[]
default_styles
metadata{}
```

Eine Vorlage kann für mehrere Papierformate genutzt oder auf bestimmte Formate beschränkt werden.

---

# 4. TitleBlockField

```text
id
key
rect
text_style
alignment
expression
fallback_text?
visibility_expression?
format_spec?
multiline
max_lines?
```

Beispiele:

```text
project_name
project_number
sheet_title
sheet_number
revision
created_by
approved_by
customer
```

Der `key` identifiziert das Vorlagenfeld; `expression` liefert den angezeigten Wert.

---

# 5. Datenquellen

Ausdrücke dürfen nur auf definierte read-only Datenkontexte zugreifen.

Startkontexte:

```text
project
sheet
document
revision
user/company
structure
format
custom
```

Beispiele:

```text
project.name
project.project_number
sheet.description
sheet.engineering_page
sheet.structure.location
revision.label
format.paper_size
```

---

# 6. Ausdruckssyntax v0.1

Bevorzugte einfache Syntax:

```text
{project.name}
{sheet.description}
{sheet.page_label}
{revision.label}
```

Mit optionalen einfachen Filtern:

```text
{sheet.page_label | upper}
{project.modified_at | date:"dd.MM.yyyy"}
{project.modified_at | time:"HH:mm"}
```

Keine allgemeine Programmiersprache im Template.

---

# 7. Warum keine eingebetteten Scripts

Titelblock-Ausdrücke müssen:

- sicher
- deterministisch
- offline
- schnell
- plattformgleich

sein.

Daher ausdrücklich **nicht**:

```text
JavaScript
Lua with unrestricted IO
Shell commands
arbitrary Rust code
```

Die Ausdruckssprache ist deklarativ und read-only.

---

# 8. Pfadauflösung

Ein Ausdruck:

```text
{project.customer.name}
```

wird über einen typisierten TemplateContext aufgelöst.

Wenn ein Pfad nicht existiert:

- kein Programmabsturz
- fallback_text verwenden, falls gesetzt
- sonst leeren Wert oder klaren Editorhinweis anzeigen
- Templateprüfung meldet unbekannten Pfad

---

# 9. Custom Properties

Projekt-/Firmenfelder können über Namespaces erreichbar sein.

Beispiel:

```text
{custom["company.example:order_number"]}
```

oder eine später ergonomischere Syntax.

Die endgültige Parser-Syntax wird im technischen Spike festgelegt; fachlich muss Namespace-Unterstützung vorhanden sein.

---

# 10. Formatierung

Startfilter:

```text
upper
lower
trim
date
time
number
join
fallback
```

Keine Filter dürfen Project State mutieren.

---

# 11. Datumsformat

Projekt-/Firmenprofil kann Standardformate definieren.

Für deutschsprachige Vorlagen beispielsweise:

```text
dd.MM.yyyy
HH:mm
```

Template kann explizit überschreiben.

Intern bleiben Zeitwerte strukturierte Zeitstempel, nicht formatierte Strings.

---

# 12. Bedingte Sichtbarkeit

Felder können einfache Bedingungen besitzen.

Beispiel:

```text
show if revision.label exists
```

Mögliche minimale Syntax:

```text
{? revision.label}
```

oder separates `visibility_expression`.

Die genaue Syntax bleibt Implementierungsdetail; fachlich ist bedingte Sichtbarkeit erforderlich.

---

# 13. Keine komplexe Businesslogik im Template

Unzulässig als Titelblocklogik:

```text
wenn Gerät X vorhanden, ändere Projektnummer
```

Komplexe fachliche Ableitungen gehören in Project Queries/Document Projections.

Template bindet nur bereits definierte Daten.

---

# 14. SheetPageLabel

Blattnummern werden zentral aus dem Seiten-/Dokumentmodell geliefert.

Template darf nicht selbst Seitennummern zählen.

Beispiele:

```text
sheet.engineering_page
sheet.subpage
sheet.page_label
sheet.page_count_in_set
```

Damit bleiben Navigator, Titelblock, Inhaltsverzeichnis und Querverweise konsistent.

---

# 15. Document Context

Beim Export kann dieselbe technische Seite zusätzliche Dokumentinformationen erhalten:

```text
document.set_name
document.page_index
document.page_count
document.status
document.export_date
```

Technische Blattnummer und physische PDF-Seitennummer bleiben getrennt.

---

# 16. Revisionsfelder

```text
revision.label
revision.date
revision.author
revision.description
revision.status
```

Mehrere Revisionseinträge können über eine Revisions-Tabelle im Titelblock angezeigt werden.

---

# 17. RepeatingTable

Titelblock/Deckblatt kann kleine tabellarische Wiederholungen enthalten.

Beispiel Revisionstabelle:

```text
RepeatingTable
  source = revision.history
  max_rows = 4
  columns = [label, date, author, description]
```

Dies bleibt eine definierte Template-Komponente, kein allgemeiner Report-Designer.

---

# 18. LogoSlot

Firmenlogo wird über Asset-Referenz eingebunden.

```text
LogoSlot
  asset_expression
  fit_mode
  preserve_aspect_ratio
```

Vorlage enthält nicht zwingend das Logo selbst; Firmenprofil kann es liefern.

---

# 19. CompanyProfile

Separates Profil kann enthalten:

```text
company_name
address
contact
logo_asset
standard_title_block_template
standard_frame_template
custom_properties{}
```

Dadurch müssen Firmendetails nicht in jeder Vorlage fest eingebrannt sein.

---

# 20. Template Hierarchie

Mögliche Auswahlpriorität:

```text
Sheet override
→ Document profile
→ Project template
→ Company default
→ OpenE-CAD default
```

Die tatsächlich verwendete Vorlage wird im Sheet/DocumentSet eindeutig referenziert.

---

# 21. Template-Versionierung

```text
id
version
```

Bestehende Projekte müssen reproduzierbar bleiben.

Daher:

- verwendete Vorlage kann projektlokal eingebettet/snapshotted werden
- neuere globale Vorlage wird nicht ungefragt übernommen
- Update mit Diff/Preview möglich

---

# 22. Template-Editor

Späterer visueller Editor unterstützt:

- Linien/Rechtecke
- Textfelder
- Datenfelder
- LogoSlots
- Revisions-/kleine Tabellen
- Alignment
- Schrift
- Vorschau mit Testdaten
- Papierformat

Keine Backend-/Scriptprogrammierung nötig.

---

# 23. Ausdruckseditor UX

Beim Editieren eines Feldes:

- Datenpfade über Autocomplete
- Kategoriebaum `Projekt / Seite / Revision / Firma / Custom`
- Live-Vorschau
- unbekannte Pfade sofort markieren

Benutzer soll nicht die interne JSON-Struktur kennen müssen.

---

# 24. Template Validation

Befunde:

```text
TEMPLATE_UNKNOWN_EXPRESSION_PATH
TEMPLATE_INVALID_EXPRESSION
TEMPLATE_FIELD_OUTSIDE_PAGE
TEMPLATE_MISSING_REQUIRED_FIELD
TEMPLATE_ASSET_MISSING
TEMPLATE_FONT_UNAVAILABLE
TEMPLATE_VERSION_MISSING
```

Templatebefunde sind von Projekt-Engineering-Findings unterscheidbar.

---

# 25. Pflichtfelder

Projekt-/Dokumentprofil kann Pflichtfelder definieren.

Beispiel:

```text
project.name
sheet.page_label
sheet.description
revision.label for released documents
```

Ob ein leeres Feld Error/Warning ist, bestimmt RuleProfile.

---

# 26. Textüberlauf

Feld definiert Verhalten:

```text
clip
ellipsis
shrink_to_fit
wrap
```

Technische Dokumente sollen möglichst deterministisch bleiben; unbegrenztes automatisches Layout ist zu vermeiden.

---

# 27. Schriftarten

Vorlage referenziert logische FontRole oder erlaubte Fontfamilie.

Beispiele:

```text
technical_sans
technical_mono
company_title
```

Export muss fehlende Fonts kontrolliert behandeln.

Projekt darf keine Fontdateien automatisch aus dem System einsammeln/einbetten, ohne Lizenzrechte zu berücksichtigen.

---

# 28. Screen vs. Export

Titelblock wird auf Bildschirm und im PDF aus demselben Template-Modell gerendert.

Theme beeinflusst Bildschirmdarstellung; Dokumentexport verwendet Dokument-/Druckprofil.

Full-Dark-Canvas führt nicht zu schwarzem PDF-Titelblock, außer Exportprofil verlangt dies ausdrücklich.

---

# 29. Monochrom

Monochromer Export wandelt UI-/technische Akzentfarben über das Dokumentprofil um.

Titelblocktexte/-linien bleiben vektorbasiert.

---

# 30. Ausdrucks-Engine API

Konzeptionell:

```text
parse(expression) -> ExpressionAst
validate(ast, context_schema)
evaluate(ast, context) -> TemplateValue
format(value, filters) -> string
```

ExpressionAst kann gecacht werden.

---

# 31. Determinismus

Gleicher Template-Snapshot + gleicher Project/Document Context muss denselben Inhalt erzeugen.

Ausnahmen wie `current_time` dürfen nur über expliziten ExportContext eingespeist werden.

Keine versteckten Systemabhängigkeiten.

---

# 32. Sicherheit

Expression Engine besitzt:

- keinen Dateisystemzugriff
- keinen Netzwerkzugriff
- keine Prozessausführung
- keine dynamischen Plugins

Sie liest ausschließlich bereitgestellten Context.

---

# 33. `.oecad` Persistenz

Projekt speichert Referenzen/Snapshots für:

```text
frame_template
title_block_template
company_profile/document profile references
```

Assets liegen im dafür vorgesehenen Containerbereich.

---

# 34. Offene Punkte v0.2

- genaue Parsergrammatik
- Schleifen nur für definierte RepeatingTables
- Formelausdrücke/Concatenation
- lokalisierte Feldbezeichnungen
- Barcode/QR-Komponente
- digitale Freigabe-/Signaturfelder
- komplexere Reportvorlagen

---

# 35. Konsequenz für Rust

Die Ausdrucksengine ist ein kleines, eigenes, testbares Modul.

Sie darf nicht an Slint/egui/iced gebunden sein.

```text
Template Context + Template
          ↓
     Layout/Binding model
          ↓
 Screen renderer / PDF renderer
```
