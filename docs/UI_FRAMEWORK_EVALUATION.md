# S3 – Rust UI-Framework-Evaluierung

Stand: 15.10.2026  
Status: **praktischer Drei-Kandidaten-Vergleich läuft**

OpenE-CAD trennt den datenorientierten Domain-Core und den unabhängigen `wgpu`-CAD-Renderer von der Desktop-UI. Deshalb wird das UI-Framework nicht nach einer Demo oder persönlichen Vorliebe gewählt, sondern mit derselben Engineering-Oberfläche praktisch verglichen.

## 1. Muss-Kriterien

Der spätere UI-Layer muss mindestens beherrschen:

- Windows und Linux als primäre Desktop-Plattformen
- kompakte App-Bar und kontextuelle Toolbar
- resizable Navigator links und Inspector rechts
- große Daten-Tabellen mit direkter Bearbeitung
- Tree/Navigatoren mit tausenden Einträgen
- Tastaturfokus und Shortcuts
- drei Darstellungsmodi: Light, Dark UI + heller Plan, Full Dark Canvas
- eigene Design-Tokens und möglichst genaue v0-Umsetzung
- DPI 100/125/150/200 %
- Multi-Window bzw. später abdockbare Panels
- Einbettung unseres unabhängigen `wgpu 30`-Renderers ohne unnötige GPU→CPU-Kopie
- gute Interaktion zwischen UI und Canvas
- MPL-2.0-Projektlizenz darf durch die Framework-Wahl nicht unnötig verkompliziert werden
- langfristig wartbare API und aktives Ökosystem

## 2. Gemeinsame visuelle Referenz

Die im Projekt dokumentierte **v0-Iteration ist für alle S3-Kandidaten dieselbe Zieloberfläche**. Ein Kandidat darf nicht allein deshalb besser oder schlechter bewertet werden, weil seine erste Demo näher am Standardlook des jeweiligen Frameworks liegt.

Zu vergleichen sind insbesondere:

- Projektseite: Projektliste links, Projektübersicht in der Mitte, offene Punkte rechts
- Stromlaufplan: Navigator / CAD-Fläche / Inspector
- Aufbau
- Datenmanager
- Dokumentation
- Command Palette
- Light / Dark UI + heller Plan / Full Dark Canvas

## 3. Kandidaten

### egui / eframe 0.36.2

Status: **S3-Shell implementiert, Windows/Linux-Checks erfolgreich**.

Relevante Punkte:

- MIT OR Apache-2.0
- `egui-wgpu` liegt auf derselben WGPU-30-Linie wie unser CAD-Renderer
- direkter Custom-WGPU-Callback-Pfad
- Immediate-Mode-Modell ermöglicht sehr schnelle Entwicklung komplexer Engineering-Tools
- 1.000 Navigator-Einträge und große synthetische Datenansichten sind Bestandteil des Spikes
- Projektseite und Farbgebung wurden nach dem ersten Windows-Test deutlich stärker an v0 angenähert
- drei Darstellungsmodi sind im Spike vorgesehen
- Docking ist nicht Kernbestandteil und benötigt Zusatzkomponenten bzw. ein eigenes Workspace-Modell
- der Standardlook wirkt ohne gezieltes Styling schnell wie ein Debug-/Developer-Tool; v0-Nähe muss deshalb bewusst durch eigenes Designsystem erzeugt werden

### iced 0.14

Status: **v0-orientierte S3-Shell implementiert; Cross-Platform-CI läuft**.

Relevante Punkte:

- MIT
- deklarativ/Elm-inspiriertes Update/View-Modell
- offizielle Tabellen-/Grid- und Canvas-/Shader-Konzepte
- strukturierte Zustandsführung passt gut zu Commands/Transactions
- Multi-Window vorhanden
- die v0-Zielstruktur ist im Spike mit Projekt, Stromlaufplan, Aufbau, Daten und Dokumentation nachgebildet

#### Reale WGPU-Erkenntnis aus dem S3-Build

Der reale Cargo-Resolve von **iced 0.14.0** zieht in unserem S3-Spike derzeit **`wgpu 27.0.1`** über `iced_wgpu 0.14.0` ein. Unser CAD-Renderer basiert auf **wgpu 30**.

Das bedeutet:

- eine direkte gemeinsame Nutzung derselben `wgpu::Device` / `Queue` zwischen stabilem iced 0.14 und unserem Renderer ist nicht ohne Weiteres möglich;
- zwei unterschiedliche WGPU-Major-Versionen im Prozess sind prinzipiell möglich, aber für einen eingebetteten CAD-Renderer deutlich unattraktiver;
- ein Texture-/Interop-Pfad müsste gesondert untersucht werden und darf keine unnötige GPU→CPU-Kopie verursachen;
- alternativ müsste eine zukünftige/stärkere iced-Version mit derselben WGPU-Linie geprüft werden.

Dies ist für S4 ein **relevanter technischer Nachteil** und wird in der gewichteten Renderer-Integrationswertung berücksichtigt. iced bleibt für S3 trotzdem im Vergleich, weil UI-Qualität, Tabellen, Fokus und Zustandsmodell unabhängig davon bewertet werden sollen.

### Slint 1.18.1

Status: **dritter S3-Kandidat wird aufgebaut**.

Relevante Punkte:

- aktuelle stabile GitHub-Version zum Testzeitpunkt: **1.18.1**
- deklaratives UI eignet sich sehr gut für eine präzise Nachbildung der v0-Oberfläche
- Desktop-Backends und mehrere Renderer vorhanden
- Slint 1.18.1 bietet explizit die Feature-API **`unstable-wgpu-30`**
- die Slint-Dokumentation empfiehlt für diese instabilen Drittanbieter-API-Features bewusst eine Tilde-Version wie `~1.18`
- dadurch kann der S4-Test grundsätzlich auf derselben WGPU-30-Major-Linie wie OpenE-CAD erfolgen
- die WGPU-API ist ausdrücklich nicht Teil der normalen Slint-API-Stabilitätsgarantie

#### Lizenzbesonderheit

Das Slint-Framework ist dreifach lizenziert:

1. Slint Royalty-free Desktop/Mobile/Web License
2. GPLv3
3. Commercial License

Für eine MPL-2.0-Anwendung ist deshalb die konkrete Distributionsform vor einer Produktentscheidung festzulegen. Das ist **kein technischer Ausschluss**, aber ein eigener Bewertungspunkt. Eine spätere Entscheidung muss Attribution und die tatsächlich gewählte Slint-Lizenzvariante dokumentieren.

## 4. Praktischer S3-Test

Alle drei Kandidaten erhalten dieselbe Mini-Anwendung. Keine Kandidaten-spezifische Vereinfachung der Ziel-UX.

```text
┌────────────────────────────────────────────────────────────┐
│ Projekt | Stromlaufplan | Aufbau | Daten | Dokumentation  │
├────────────────────────────────────────────────────────────┤
│ Kontexttoolbar + Ctrl+K                                   │
├──────────┬─────────────────────────────┬───────────────────┤
│ Seiten / │                             │ Eigenschaften /   │
│ Geräte   │    CAD-Renderer-Fläche      │ Prüfung           │
│          │                             │                   │
├──────────┴─────────────────────────────┴───────────────────┤
│ Statusleiste                                               │
└────────────────────────────────────────────────────────────┘
```

Jeder Spike benötigt bzw. wird darauf bewertet:

- v0-nahe Oberfläche
- drei Darstellungsmodi
- Projektseite nach derselben Struktur
- resizable linkes/rechtes Panel, soweit das Framework dies sinnvoll unterstützt
- Seitenbaum/Navigator mit großer Datenmenge
- Inspector mit Gruppen und editierbaren Feldern
- Tabelle mit großer synthetischer Datenmenge / Virtualisierung
- Command Palette Overlay
- Tastaturfokus sichtbar
- `Ctrl+K`, `Esc`, `F2`, `Delete`, `Ctrl+Z`
- CAD-Fläche als S3-Platzhalter
- DPI-Test 100/125/150/200 %

## 5. Bewertungsmatrix

Jeder Punkt 0–5.

| Kriterium | Gewicht |
|---|---:|
| unabhängigen WGPU-Renderer sauber integrieren | 20 % |
| Engineering-UI / hohe Informationsdichte | 15 % |
| Tabellen / Virtualisierung / Inline-Editing | 15 % |
| Tree/Navigator / große Datenmengen | 10 % |
| Keyboard / Fokus / Shortcuts | 10 % |
| Theme / Designsystem / v0-Nähe | 10 % |
| Multi-Window / Docking-Perspektive | 7,5 % |
| DPI / Accessibility | 5 % |
| Build-/Binärgröße / Startzeit | 2,5 % |
| API-Stabilität / Wartbarkeit | 2,5 % |
| Lizenz-/Distributionsklarheit | 2,5 % |

Die Renderer-Integration und echte Daten-Workflows zählen bewusst stärker als optische Demoqualität.

## 6. Messungen

Neben subjektiver UX werden notiert:

- Clean-build-Zeit
- inkrementelle Build-Zeit
- Release-Binärgröße
- Idle-CPU
- Idle-RAM
- UI-Framezeit beim Resize
- Scrollen durch große Tabellen/Navigatoren
- Öffnen/Schließen der Command Palette
- Panel-Resize bei laufendem CAD-Renderer
- Verhalten bei 100/125/150/200 % Windows-DPI
- Fokusnavigation ohne Maus

## 7. Zwischenstand

Noch **keine endgültige Frameworkentscheidung**.

Aktuell:

- **egui:** technisch besonders interessant wegen direkter WGPU-30-Nähe und Flexibilität; Styling muss konsequent an v0 angepasst werden.
- **iced 0.14:** strukturiertes Zustandsmodell und UI-Konzept attraktiv, aber der reale stabile WGPU-27-Unterbau ist für OpenE-CAD aktuell ein deutlicher S4-Nachteil.
- **Slint 1.18.1:** visuell/deklarativ sehr interessant und bietet direkt `unstable-wgpu-30`; Lizenz- und Unstable-API-Themen müssen gegen die Vorteile gewichtet werden.

## 8. Übergang zu S4

Nur die **zwei besten** S3-Kandidaten gehen in S4.

Dort wird derselbe OpenE-CAD-CAD-Renderer mit:

- World/Paper-Space
- glyphon-/technischem Textpfad
- Junction-/Snap-Overlay
- Pan/Zoom
- Auswahl
- Primitives

in beide UI-Frameworks integriert.

Erst nach S4 wird das Produktiv-UI-Framework festgelegt.
