# S3 – Rust UI-Framework-Evaluierung

Stand: 15.10.2026  
Status: **Vorbereitung / Vergleichsmatrix**

OpenE-CAD trennt den datenorientierten Domain-Core und den unabhängigen `wgpu`-CAD-Renderer von der Desktop-UI. Deshalb wird das UI-Framework nicht nach einer Demo oder persönlicher Vorliebe gewählt, sondern mit derselben Engineering-Oberfläche praktisch verglichen.

## 1. Muss-Kriterien

Der spätere UI-Layer muss mindestens beherrschen:

- Windows und Linux als primäre Desktop-Plattformen
- kompakte App-Bar und kontextuelle Toolbar
- resizable Navigator links und Inspector rechts
- große Daten-Tabellen mit direkter Bearbeitung
- Tree/Navigatoren mit tausenden Einträgen
- Tastaturfokus und Shortcuts
- Light/Dark und eigene Design-Tokens
- DPI 100/125/150/200 %
- Multi-Window bzw. später abdockbare Panels
- Einbettung unseres unabhängigen `wgpu 30`-Renderers ohne unnötige GPU→CPU-Kopie
- gute Interaktion zwischen UI und Canvas
- MPL-2.0-Projektlizenz darf durch die Framework-Wahl nicht unnötig verkompliziert werden
- langfristig wartbare API und aktives Ökosystem

## 2. Kandidaten

### egui / eframe

Aktueller Vergleichsstand: **egui 0.36.x**.

Relevante Punkte:

- MIT OR Apache-2.0
- `egui-wgpu` nutzt inzwischen WGPU 30
- unmittelbares Immediate-Mode-Modell; sehr schnelle Entwicklung komplexer Tool-UIs
- `egui-wgpu` besitzt einen direkten Custom-WGPU-Callback-Pfad
- eigener CAD-Renderer kann damit im selben GPU-Kontext/Renderablauf integriert werden
- sehr flexibel für Inspector, Toolbars, Debug-/Engineering-Oberflächen
- Docking ist nicht Kernbestandteil von egui selbst und muss über Zusatzkomponenten bzw. eigenes Workspace-Modell gelöst werden
- Tabellen/Tree-Ansichten müssen auf große Datenmengen und Tastaturbedienung gezielt geprüft werden

Quellen:

- <https://github.com/emilk/egui>
- <https://github.com/emilk/egui/tree/main/crates/egui-wgpu>

### iced

Aktueller stabiler Vergleichsstand: **iced 0.14**.

Relevante Punkte:

- MIT
- deklarativ/Elm-inspiriertes Update/View-Modell
- 0.14 enthält offizielle `table`- und `grid`-Widgets
- eigener `Shader`-Widget-Pfad für WGPU-Anwendungen
- strukturierte Zustandsführung passt grundsätzlich gut zu Commands/Transactions
- Multi-Window vorhanden
- auf Master wird bereits WGPU 30 verwendet; der stabile 0.14-Pfad wird im Spike gegen unsere Renderer-Abhängigkeiten geprüft
- Docking/komplexe professionelle Workbench-Anordnung ist kein fertiges Kernfeature und muss evaluiert werden

Quellen:

- <https://github.com/iced-rs/iced/releases/tag/0.14.0>
- <https://docs.rs/iced/latest/iced/widget/shader/>

### Slint

Aktueller stabiler Vergleichsstand: **Slint 1.18.x**.

Relevante Punkte:

- sehr ausgereiftes deklaratives Desktop-UI und Designer-/Preview-Workflow
- `unstable-wgpu-30` bietet explizite Integration externer WGPU-30-Renderer
- gemeinsame `wgpu::Device` / `Queue` können verwendet werden; RenderingNotifier bzw. externe Texture-Integration stehen zur Verfügung
- Styling und pixelgenaue Nachbildung des v0-Designs sind attraktiv
- die WGPU-30-API ist ausdrücklich als `unstable-*` markiert und kann sich zwischen Minor-Versionen ändern

#### Lizenzbesonderheit

Das Slint-Framework ist derzeit dreifach lizenziert:

1. Slint Royalty-free Desktop/Mobile/Web License
2. GPLv3
3. Commercial License

Für eine MPL-2.0-Anwendung ist deshalb die konkrete Distributionsform vor einer Produktentscheidung sorgfältig festzulegen. Die Royalty-free Desktop-Lizenz erlaubt Desktop-Anwendungen mit Attribution, während die GPL-Variante den kombinierten vertriebenen Gesamtgegenstand unter GPL-Bedingungen stellt. Für OpenE-CAD soll eine UI-Framework-Wahl die beschlossene MPL-2.0-Richtung möglichst nicht unnötig einschränken.

Das ist **kein technischer Ausschluss**, aber ein eigener Bewertungspunkt.

Quellen:

- <https://docs.slint.dev/latest/docs/rust/slint/wgpu_30/>
- <https://github.com/slint-ui/slint/blob/master/LICENSE.md>
- <https://github.com/slint-ui/slint/blob/master/LICENSES/LicenseRef-Slint-Royalty-free-2.0.md>

## 3. Praktischer S3-Test

Alle drei Kandidaten erhalten dieselbe Mini-Anwendung. Keine Kandidaten-spezifische Vereinfachung.

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

Jeder Spike benötigt:

- v0-nahe Dark-UI
- Umschaltung Light/Dark
- resizable linkes/rechtes Panel
- Seitenbaum mit mindestens 1.000 synthetischen Einträgen
- Inspector mit einklappbaren Gruppen und editierbaren Feldern
- Tabelle mit mindestens 10.000 synthetischen Datensätzen bzw. Virtualisierung
- Command Palette Overlay
- Tastaturfokus sichtbar
- `Ctrl+K`, `Esc`, `F2`, `Delete`, `Ctrl+Z`
- eingebettete CAD-Fläche als Platzhalter und anschließend echter unabhängiger wgpu-Renderer
- DPI-Test 100/125/150/200 %

## 4. Bewertungsmatrix

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

## 5. Messungen

Neben subjektiver UX werden notiert:

- Clean-build-Zeit
- inkrementelle Build-Zeit
- Release-Binärgröße
- Idle-CPU
- Idle-RAM
- UI-Framezeit beim Resize
- Scrollen durch 10k Tabellenzeilen
- Öffnen/Schließen der Command Palette
- Panel-Resize bei laufendem CAD-Renderer
- Verhalten bei 100/125/150/200 % Windows-DPI
- Fokusnavigation ohne Maus

## 6. Aktuelle technische Tendenz vor dem Spike

Noch **keine endgültige Frameworkentscheidung**.

Vorläufig:

- **egui**: sehr starker Kandidat wegen direkter WGPU-Integration und hoher Flexibilität für Engineering-Tools.
- **iced**: sehr interessanter Kandidat wegen strukturierter Zustandsführung, Tabellen/Grid und WGPU-Shader-Widget.
- **Slint**: visuell/deklarativ sehr attraktiv und technisch WGPU-30-fähig, aber WGPU-API-Stabilität und Lizenzmodell müssen im Ergebnis separat gewichtet werden.

Die Rangfolge darf durch die praktischen S3-Messungen vollständig geändert werden.

## 7. Übergang zu S4

Nur die **zwei besten** S3-Kandidaten gehen in S4.

Dort wird nicht mehr mit einer Platzhalterfläche gearbeitet, sondern derselbe OpenE-CAD-CAD-Renderer mit:

- World/Paper-Space
- Text
- Junction-/Snap-Overlay
- Pan/Zoom
- Auswahl
- Primitives

in beide UI-Frameworks integriert.

Erst nach S4 wird das Produktiv-UI-Framework festgelegt.
