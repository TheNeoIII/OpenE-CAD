# Lizenzstrategie

Stand: 14.10.2026  
Status: **beschlossen**

## Entscheidung

OpenE-CAD wird unter der **Mozilla Public License 2.0 (MPL-2.0)** veröffentlicht.

Die vollständige Lizenz liegt im Repository unter [`LICENSE`](../LICENSE).

SPDX-Identifier:

```text
MPL-2.0
```

Für spätere Rust-Pakete wird entsprechend verwendet:

```toml
license = "MPL-2.0"
```

## Warum MPL-2.0

OpenE-CAD soll dauerhaft ein offener ECAD-Core bleiben, gleichzeitig aber Herstelleradapter, Plugins, Integrationen und industrielle Nutzung nicht unnötig erschweren.

MPL-2.0 bietet dafür den gewünschten Mittelweg:

- Copyleft auf Dateiebene;
- Änderungen an MPL-lizenzierten OpenE-CAD-Quelldateien bleiben bei Distribution offen;
- Kombination mit separat lizenzierten Modulen ist flexibler als unter starkem Copyleft;
- kommerzielle Nutzung ist erlaubt;
- Patentlizenzregelungen sind Bestandteil der Lizenz;
- geeignet für ein späteres Plugin-/Connector-Ökosystem.

Die Alternative `GPL-3.0-or-later` wurde bewusst nicht gewählt, weil OpenE-CAD Schnittstellen zu Herstellerdaten, ERP/PLM, SPS-Systemen und möglichen proprietären Integrationen offenhalten soll.

MIT/Apache-2.0 wurden für den Core ebenfalls nicht gewählt, weil daraus ohne Rückgabepflicht weitgehend geschlossene Forks entstehen könnten.

## Abhängigkeiten

Die Projektlizenz bedeutet nicht, dass jede Abhängigkeit MPL-2.0 sein muss. Jede produktive Dependency muss jedoch lizenzkompatibel und für die geplante Distribution geeignet sein.

Aktuelle technische Kandidaten:

| Komponente | Lizenzlage | Bewertung für OpenE-CAD |
|---|---|---|
| `wgpu` | MIT OR Apache-2.0 | unkritisch |
| `egui` | MIT OR Apache-2.0 | unkritisch |
| `iced` | MIT | unkritisch |
| `Slint` | mehrere Lizenzwege, darunter GPLv3 und eigene Lizenzmodelle | konkreter Lizenzweg muss vor Auswahl geprüft werden |

Die technische Frameworkentscheidung erfolgt weiterhin anhand des Spike-Plans und nicht allein anhand der Lizenz.

## Hersteller- und Artikeldaten

Programmcode und Katalogdaten sind getrennte Lizenzbereiche.

MPL-2.0 für OpenE-CAD gewährt **keine** Weiterverteilungsrechte an fremden Herstellerdaten, Produktbildern, Makros, Datenblättern oder normgeschützten Inhalten.

Katalogquellen führen deshalb Metadaten wie:

```text
source
license_info
redistribution_allowed
```

Herstellerdaten ohne klare Weiterverteilungsrechte werden nicht in das öffentliche Repository aufgenommen.

## Symbole und Bibliotheken

Die eigene Basissymbolbibliothek erhält eine separat dokumentierte freie Lizenz bzw. eindeutige Nutzungsregel. Lizenzpflichtige Normdaten oder aus geschützten Referenzprogrammen kopierte Symbolbestände werden nicht übernommen.

## Beiträge Dritter

Vor Öffnung für größere externe Contributions soll ein einfacher Contribution-Prozess festgelegt werden. Bevorzugte Richtung:

```text
MPL-2.0 + Developer Certificate of Origin (DCO)
```

Ein CLA ist derzeit nicht vorgesehen, kann bei späterem organisatorischem Bedarf neu bewertet werden.

## SPDX / Source Header

Für neue Quelldateien wird ein kurzer SPDX-Hinweis vorgesehen:

```text
SPDX-License-Identifier: MPL-2.0
```

Die MPL erlaubt außerdem den Source-Code-Notice aus Exhibit A. Die konkrete Header-Konvention wird vor Übernahme der Spikes in Produktivcode vereinheitlicht.

## Dependency-Compliance

Für den späteren Produktiv-Workspace ist vorgesehen:

- automatisches Cargo-Lizenzinventar;
- Allowlist kompatibler Lizenzen;
- Review von Copyleft- und Custom-Lizenzen;
- Third-Party-Notices für Binärdistributionen;
- CI-Prüfung bei neu hinzugefügten Dependencies.

## Quellenstand

Die Entscheidung basiert auf den offiziellen Lizenztexten und Projektangaben, geprüft am 14.10.2026:

- Mozilla Public License 2.0: https://www.mozilla.org/MPL/2.0/
- GNU GPLv3: https://www.gnu.org/licenses/gpl-3.0.html
- Slint: https://slint.dev/terms-and-conditions
- egui: https://github.com/emilk/egui
- iced: https://github.com/iced-rs/iced
- wgpu: https://github.com/gfx-rs/wgpu

Dieses Dokument beschreibt die Projektentscheidung und ist keine Rechtsberatung.
