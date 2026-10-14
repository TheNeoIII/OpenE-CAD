# Lizenzstrategie

Stand: 14.10.2026  
Status: **Entscheidungsvorlage – noch keine endgültige Projektlizenz**

Dieses Dokument dient der technischen und organisatorischen Planung und ist keine Rechtsberatung.

Die Lizenz soll vor dem ersten Produktivcode bewusst festgelegt werden, weil sie beeinflusst:

- Beiträge Dritter
- Forks
- kommerzielle Nutzung
- Plugins/Integrationen
- UI-Frameworkwahl
- Distribution von Binärdateien
- Hersteller-/Katalogdaten

---

# 1. Zielkonflikt

OpenE-CAD soll dauerhaft Open Source bleiben, gleichzeitig aber für Elektrotechnikbetriebe, Integratoren und mögliche Hersteller-Plugins praktisch nutzbar sein.

Daraus ergeben sich zwei legitime Richtungen:

### Starker Copyleft-Ansatz

Änderungen/abgeleitete Gesamtanwendung sollen bei Distribution wieder offen sein.

Kandidat:

```text
GPL-3.0-or-later
```

### Dateiweiser Copyleft-Ansatz

Änderungen an OpenE-CAD-Quelldateien bleiben offen, aber Kombinationen mit separat lizenzierten Modulen sind flexibler.

Kandidat:

```text
MPL-2.0
```

---

# 2. MPL-2.0

Mozilla beschreibt MPL 2.0 als Copyleft auf Dateiebene.

Praktische Wirkung für unser Zielbild:

- geänderte MPL-Dateien müssen bei Distribution unter MPL verfügbar bleiben
- Kombination mit anders lizenziertem bzw. proprietärem Code ist grundsätzlich flexibler als bei GPL
- geeignet für Plugin-/Connector-Ökosysteme
- erlaubt kommerzielle Nutzung
- enthält ausdrückliche Patentlizenzregelungen

### Vorteil für OpenE-CAD

Ein Hersteller könnte beispielsweise einen separat entwickelten Connector bereitstellen, ohne zwangsläufig den kompletten Connector unter derselben Lizenz veröffentlichen zu müssen, während Änderungen am OpenE-CAD-Core offen bleiben.

### Nachteil

Ein Unternehmen kann größere proprietäre Ergänzungen neben unveränderten MPL-Dateien entwickeln. Der Copyleft-Schutz ist daher schwächer als GPL für das Gesamtprodukt.

---

# 3. GPL-3.0-or-later

GPLv3 ist eine starke Copyleft-Lizenz.

Praktische Richtung:

- bei Verteilung eines abgeleiteten Gesamtwerks greifen deutlich weitergehende Offenlegungspflichten
- schützt stärker davor, dass OpenE-CAD als Ganzes in einem geschlossenen Fork weitervertrieben wird
- gut passend, wenn maximale Offenheit aller abgeleiteten Distributionen oberstes Ziel ist

### Vorteil

Stärkerer Schutz des Open-Source-Charakters des Gesamtprogramms.

### Nachteil

Kann die Integration proprietärer Plugins/Herstellerkomponenten und manche kommerziellen Integrationen erschweren.

---

# 4. MIT / Apache-2.0

Permissive Lizenzen ermöglichen sehr freie Weiterverwendung.

Vorteile:

- maximale Integrationsfreiheit
- unkompliziert für Unternehmen
- sehr kompatibel mit dem Rust-Ökosystem

Nachteil für unser Ziel:

- ein Dritter könnte einen weitgehend geschlossenen kommerziellen Fork erstellen
- Verbesserungen müssen nicht an das Open-Source-Projekt zurückgegeben werden

Daher derzeit **nicht bevorzugt für den OpenE-CAD-Core**.

Für einzelne Beispielprojekte, SDKs oder Integrationsinterfaces kann eine permissive Lizenz später trotzdem sinnvoll sein.

---

# 5. AGPL

AGPL erweitert Copyleft auf bestimmte Netzwerkbereitstellungen.

Da OpenE-CAD primär als lokale Desktop-Anwendung geplant ist und kein Cloud-Zwang vorgesehen ist, bringt AGPL derzeit wenig zusätzlichen Nutzen, erhöht aber Integrationshürden.

Daher derzeit **nicht empfohlen**.

---

# 6. Vorläufige Empfehlung

Aktueller Favorit:

```text
MPL-2.0
```

Begründung:

- OpenE-CAD-Core und Änderungen daran bleiben bei Distribution offen
- bessere Voraussetzungen für Herstelleradapter, Plugins und industrielle Integration
- weniger restriktiv für ein späteres Ökosystem
- weiterhin echtes Copyleft statt rein permissiver Lizenz

Alternative, wenn stärkerer Schutz ausdrücklich gewünscht wird:

```text
GPL-3.0-or-later
```

Die endgültige Entscheidung wird vor dem ersten Produktivcode getroffen.

---

# 7. UI-Framework-Auswirkung

Die Frameworkwahl muss gegen die Projektlizenz geprüft werden.

## Slint

Nach den aktuellen offiziellen Slint-Informationen stehen mehrere Lizenzwege zur Verfügung:

- GPLv3 für Open-Source-Anwendungen
- Royalty-Free License für Desktop/Mobile/Web mit Attribution
- kommerzielle Lizenzvarianten

Wird Slint unter GPLv3 verwendet, muss die daraus distribuierte Anwendung die GPLv3-Anforderungen erfüllen.

Für eine OpenE-CAD-Lizenz wie MPL-2.0 müsste daher geprüft werden, ob Slint unter der Royalty-Free License verwendet wird oder ob stattdessen OpenE-CAD insgesamt GPLv3-kompatibel lizenziert wird.

Die Royalty-Free License ist keine klassische Open-Source-Lizenz des Frameworks und hat eigene Bedingungen, unter anderem Attribution. Vor einer Entscheidung ist der konkrete Lizenztext zu prüfen.

## egui

Aktuelles Repository:

```text
MIT OR Apache-2.0
```

Damit bestehen aus Lizenzsicht geringe Einschränkungen für MPL/GPL/MIT-basierte OpenE-CAD-Varianten.

## iced

Aktuelles Repository:

```text
MIT
```

Auch hier bestehen aus Lizenzsicht geringe Einschränkungen.

## wgpu

Aktuelles Repository:

```text
MIT OR Apache-2.0
```

wgpu ist damit für einen eigenen CAD-Renderer lizenzseitig gut mit den diskutierten OpenE-CAD-Lizenzen kombinierbar.

---

# 8. Framework darf Lizenz nicht allein entscheiden

Slint darf nicht nur wegen Lizenz ausgeschlossen werden, wenn es technisch klar überlegen ist.

Umgekehrt soll das Projekt nicht unbewusst eine starke Lizenzbindung eingehen, nur weil der erste UI-Prototyp bequem damit funktioniert.

Der technische Spike bewertet daher getrennt:

```text
UI-Fähigkeit
Performance
Docking
Custom Canvas
Accessibility
DPI
Plattformen
Lizenz
Projektaktivität
```

---

# 9. Dependencies

Für jede produktive Rust-Abhängigkeit soll Lizenzmetadatenprüfung Teil von CI werden.

Geplant:

- Cargo-Lizenzinventar
- Allowlist kompatibler Lizenzen
- Review neuer Copyleft-/Custom-Lizenzen
- Third-Party-Notices für Binärdistribution

Mögliche Tools werden erst im Rust-Workspace festgelegt.

---

# 10. Katalogdaten getrennt lizenzieren

Programmcode und Artikeldaten sind unterschiedliche Werke/Quellen.

Ein OpenE-CAD-Programm unter MPL/GPL bedeutet nicht automatisch, dass beliebige Herstellerdaten frei weiterverteilt werden dürfen.

Daher besitzt jeder Katalogimport Metadaten wie:

```text
source
license_info
redistribution_allowed
```

Herstellerdaten ohne klare Weiterverteilungsrechte werden nicht in das öffentliche Repository aufgenommen.

---

# 11. Symbole und Bibliotheken

Auch mitgelieferte Symbol-/Makrobibliotheken benötigen eine klare Lizenz.

Mögliche Strategie:

- Core-Code: MPL-2.0 oder GPL-3.0-or-later
- selbst erstellte freie Basissymbolbibliothek: separate klar dokumentierte freie Lizenz
- Herstellerdaten: jeweilige Quell-/Nutzungsrechte
- Nutzerbibliotheken: Nutzer entscheidet

Die konkrete Lizenz für Basissymbole wird separat festgelegt, insbesondere weil technische Symbole und Normdaten nicht einfach aus lizenzpflichtigen Normwerken kopiert werden dürfen.

---

# 12. Beiträge Dritter

Vor Öffnung für größere externe Contributions festlegen:

- Developer Certificate of Origin (DCO) ja/nein
- Contributor License Agreement (CLA) nur falls wirklich erforderlich
- SPDX-Headers
- `CONTRIBUTING.md`

Bevorzugte einfache Richtung:

```text
DCO + gleiche Projektlizenz
```

aber noch nicht beschlossen.

---

# 13. SPDX

Nach Lizenzentscheidung:

```text
Cargo.toml: license = "MPL-2.0"
```

oder entsprechend gewählte Lizenz.

Quelldateien erhalten konsistente SPDX-Identifier, soweit im Projektstandard vorgesehen.

---

# 14. Offene Entscheidung

Vor dem ersten Rust-Produktivcode muss der Projektowner zwischen mindestens diesen Varianten entscheiden:

```text
A. MPL-2.0        ← aktuelle Empfehlung
B. GPL-3.0-or-later
C. permissive MIT/Apache-2.0, falls maximale Wiederverwendung wichtiger wird
```

Bis dahin wird **keine** irreführende LICENSE-Datei angelegt.

---

# 15. Quellenstand

Bei Erstellung dieses Dokuments wurden die aktuellen offiziellen/primären Angaben geprüft:

- Mozilla: MPL 2.0 und MPL 2.0 FAQ
  - https://www.mozilla.org/MPL/2.0/
  - https://www.mozilla.org/MPL/2.0/FAQ/
- GNU Project: GPLv3
  - https://www.gnu.org/licenses/gpl-3.0.html
- Slint: Lizenzübersicht / FAQ / Terms
  - https://slint.dev/faqs
  - https://slint.dev/terms-and-conditions
- egui Repository: MIT OR Apache-2.0
  - https://github.com/emilk/egui
- iced Repository: MIT
  - https://github.com/iced-rs/iced
- wgpu Repository: MIT OR Apache-2.0
  - https://github.com/gfx-rs/wgpu

Vor einer endgültigen Lizenzentscheidung werden diese Angaben erneut geprüft.
