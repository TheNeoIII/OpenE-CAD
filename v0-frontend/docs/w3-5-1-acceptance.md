# W3.5.1 – Hardening und Abnahmestand

Stand: 2026-10-27. **Teilabnahme, keine vollständige Freigabe für W4.** Unterbrochene Browserläufe werden nicht als bestanden gewertet.

## Referenzen

- Branch: `v0/wiring-separation-and-stabilization-c752c400`
- Base: `5105f1d`
- Implementierung und Architekturänderungen: `ec6ebe7`
- Buildrevision: `a72df92` (877); automatisch erzeugte spätere Buildrevisionen sind keine funktionalen Änderungen.
- PR: Erstellung übernimmt der Nutzer ausdrücklich nach Abschluss der Arbeiten; kein automatischer PR-Versuch.
- Deployment der Implementierung: https://opene-cad-i3-2ebi26dgg-neoiiis-projects.vercel.app
- Vercel-Status für `ec6ebe7`: success, Deployment `dpl_6PYpoUTeRkBVgaZuPa5r1Povnkvs`.

## Änderungen

1. `resolveConstrainedLinePoint` schützt Port- und Endpoint-Snaps vor Shift-Winkelconstraints. Verschobene Grid-Snaps werden zu `free` mit 45°-Kennzeichnung; keine irreführenden Hard-Snap-Metadaten.
2. Canvas verwendet den finalen Snap für Linienpunkte. Während einer Geste wird kein konkurrierender Hover-Indikator gerendert.
3. Same-tool-Auswahl erhält additive Shift-Auswahl.
4. Fehlende Inline-Ziele schließen den Editor ohne Schreibzugriff. Mindestbreiten halten rechts- und mittig ausgerichtete Labelanker stabil.
5. Ein Portlabel-Klick verschiebt den Port nicht vor dem Doppelklick. Port-Gesten beginnen am bestehenden World-Anker. Dieser Fehler wurde mit echtem Browser-Doppelklick reproduziert und nach dem Fix erneut geprüft.

## Rasterstrategie

`gridSize` bleibt das World-Snap-Lattice unabhängig vom Zoom. `visibleGridStep` dünnt lediglich die Anzeige auf ganzzahlige Vielfache aus. Sichtbare Punkte liegen um `GRID_ORIGIN` auf echten Fangpunkten. Unsichtbare Zwischenpunkte bleiben fangbar; der Indikator zeigt den tatsächlichen Fangpunkt. Der Punktradius beträgt konstant 1,25 Bildschirm-Pixel.

## Prüfumgebung und Grenzen

Lokale Vite-Preview, Desktop 1135 × 853, Dark Mode. Die Wiring-Matrix nutzt eine temporäre In-Memory-QA-Seite mit Rectangle, Ellipse, Block, vier Ports, Polyline und Freitext. Modellzustand und SVG wurden nach Interaktionen geprüft. Ein Teil der Matrix wurde durch DOM-Pointer-/Keyboard-Events und Store-Fixture-Setup automatisiert; das ersetzt keine vollständige manuelle Bedienbarkeitsabnahme. Farbpicker, einzelne Inspector-Felder, Port-Doppelklick und Schematic-Zeichenwerkzeuge wurden zusätzlich über Browseraktionen bedient. Es wurden keine QA-Fixtures im Produkt gespeichert.

## Nachweismatrix

| Bereich | Belegtes Ergebnis | Einschränkung |
| --- | --- | --- |
| Shift + Port | Exakt `(700,650)`; Unit- und Browserprüfung | Browser prüft den Draftpunkt |
| Shift + Endpoint | Exakt `(1050,700)`; Unit- und Browserprüfung | Browser prüft den Draftpunkt |
| Shift + Grid | Winkelconstraint angewendet, Metadaten `free`; Tests bestanden. Browser bei 50/100/200 %: Start `(600,550)`, Ziel nahe `(1003,553)` → `(1000,550)` | Synthetische Modifier-Events |
| Modifier × Zoom | Bei 50/100/200 % identisch: Shift+Port `(700,650)`, Shift+Endpoint `(1050,700)`, Alt+Shift frei `(707,657)` | agent-browser kann Modifier nicht während Mausklicks halten; Pointer-Events mit Modifier-Flags auf echten Bildschirmkoordinaten |
| Alt + Shift | Fang deaktiviert, Winkelconstraint bleibt; Browserpunkt `(617,717)` | Synthetische Modifier-Events |
| SnapIndicator = Commit | Vertex-Port: Preview, SVG-Marker und Commit `(700,650)`; Grid `(1200,1100)`; Alt `(702,652)` | Vollständige visuelle Linien-Modifier-Matrix noch offen |
| Grid | Alle 15 Kombinationen aus 20/50/75/100/200 % und 25/50/100 World Units in Tests und Browser-SVG geprüft | Screenshotaufnahme allein ist keine vollständige visuelle Abnahme |
| Portlabel Placement | Vier Kanten × auto/left/right/top/bottom; Renderer und Inline-Ausrichtung geprüft. Screenshots bei 20/50/75/100 %, Detailausschnitte bei 200 % gesichtet. Dabei überlagerte die Blockkante seitlich platzierte Labels; schmale Kontur in Blattfarbe behebt dies, bei 200 % visuell nachgeprüft. Echter Label-Doppelklick und Escape lassen Portposition und Text unverändert | Bei 20 % ist Schrift weiterhin sehr klein; 200-%-Screenshots zeigen Ausschnitte, keine vollständige visuelle 20-Kombinationen-Matrix |
| Inline-Zieltypen | Freitext, Rectangle-/Ellipse-/Line-Label, Blocktitel, Feldlabel/-wert, Portlabel; Enter und Escape geprüft; IME: Enter während Komposition hält den Editor offen, Enter danach schließt ihn (Commit-Zähler unverändert 1). Shift+Enter per echter Tastatur (Doppelklick, `keyboard type`, `press Shift+Enter`): Editor bleibt offen, Wert `Zeile1\nZeile2`, 0 Commits; Enter schließt mit genau 1 Commit | — |
| Inline-History | Kein Commit beim Tippen, ein Commit bei Änderung, unverändert kein Commit; Blur, Undo/Redo, gelöschtes Ziel geprüft | — |
| Same-tool | Rect, Ellipse, Block, Line, Text: Auswahl und Move bei unverändert aktivem Tool geprüft. Additiv: Shift-Klick auf typgleiches Ziel ergänzt eine bestehende fremde Auswahl, erneuter Shift-Klick entfernt es wieder; Tool bleibt aktiv, 0 Commits. Typfremde Ziele werden bewusst nicht ausgewählt | Synthetische Modifier-Events |
| Ctrl/Cmd ForceCreate | Rectangle, Ellipse, Block jeweils mit beiden Modifiern geprüft; Resize geprüft. Line: Ctrl/Cmd auf bestehender Linie setzt Draftpunkt statt Auswahl. Text: Ctrl/Cmd auf bestehendem Text öffnet leeren Neutext-Editor; Escape erzeugt nichts (0 Commits) | Synthetische Modifier-Events |
| Escape Ladder | Geste → Draft → Port-Tool → Auswahl → anderes Tool → No-op einzeln geprüft; Inline-Escape separat geprüft | Synthetische Keyboard-Events mit DOM-Ziel |
| ColorPicker | Gemeinsamer Picker bedient, Hex `#3b82f6` übernommen; keine nativen `input[type=color]` in den geprüften Wiring-Inspectoren | Nicht jeder Farbkanal einzeln bedient |
| Fill Opacity | Rectangle, Ellipse, Block bei 0/25/50/75/100 %: Modell und SVG stimmen überein; 0 transparent | `none`, Default und Clamping zusätzlich per Unit-Test |
| Vertex Edit | Preview ohne Commit, Port/Grid/Alt, Cancel und PointerCancel; ein Commit, Undo/Redo geprüft | Browser: 3 Punkte; Tests: 2/3/5 Punkte |
| Schematic | Symbolauswahl/-Nudge, Undo/Redo, grafische Linie und orthogonale elektrische Leitung erfolgreich; bei 100 % Text und Potential ausgewählt und verschoben, Leitungssegment bearbeitet inkl. Undo, Leitungsstart rastet exakt am Symbolpin | Frühere Potential-Fehlschläge: überlappende Trefferflächen bei starker Verkleinerung, kein Produktfehler bei 100 % |

## Automatisierte Validierung

Auf dem Implementierungsstand erfolgreich ausgeführt:

- `pnpm test`: **79 bestanden, 0 fehlgeschlagen**.
- Gezielte Wiring-Interaktionstests: **31**, davon **25 neu**. Themen: fünf Constraint/Snap-Fälle, 15 Grid-/Zoomkombinationen, unsichtbares Lattice, Portlabel-/Inlineanker, gezielte Inline-Actions/History, Vertex-Port-Snap, Fill Opacity.
- `pnpm typecheck`: erfolgreich.
- `pnpm build`: erfolgreich (TypeScript + Vite). Bestehende Warnung: JavaScript-Chunk größer als 500 kB; kein Buildfehler.

Nach dem Portlabel-Konturfix erneut ausgeführt: `pnpm test` (79 bestanden), `pnpm typecheck`, `pnpm run build` (TypeScript + Vite) und `git diff --check` erfolgreich. Browser: Kontur bei 200 % geprüft; Label-Doppelklick öffnet Inline-Editor, Escape schließt ohne Portänderung. Die Kontur verändert weder Datenmodell noch Labelanker oder Snapping.

## Vercel Preview

Das Deployment meldet Erfolg. `vercel curl` lieferte die App-HTML einschließlich der gebauten JS-/CSS-Assets. Der direkte Browserzugriff ist durch Deployment Protection geschützt. **Ein erfolgreicher HTML-Abruf ist kein Nachweis einer vollständigen Browserabnahme auf dem Deployment.** Diese Prüfung bleibt offen; Deployment Protection wurde nicht deaktiviert.

## Dokumentation und Scope

Aktualisiert: `docs/WIRING_DIAGRAM_ARCHITECTURE.md`, `v0-frontend/docs/architecture.md`, `v0-frontend/docs/editor-behavior.md`, `v0-frontend/AGENTS.md`. Das vorliegende Protokoll ergänzt die bislang fehlende verlinkte Abnahmedatei.

**Kein CadConnection implementiert.** CadLine ist rein grafisch; Port Snap erzeugt keine Bindung. Kein W4-Routing, keine Sticky Connections, keine Editable Paths, kein Group & Lock. Nächster großer Produktschritt bleibt **W4 – Semantic Connections**, erst nach Schließen der Abnahmelücken.

## Offene Punkte vor Freigabe

1. Geschützte Deployment-Preview im autorisierten Browser vollständig prüfen.
2. Optional: Potential-Trefferflächen bei starker Verkleinerung (überlappende Ziele) als UX-Thema bewerten. Text, Potential, Pin Snap und Wire-Editing sind bei 100 % bestanden.
3. Modifier/Zoom, additive Auswahl und ForceCreate für Line/Text sind funktional belegt, Shift+Enter auch per echter Tastatur. Eine manuelle Gegenprobe mit physisch gehaltenen Modifier-Tasten steht noch aus, ebenso die visuelle Portlabel-Abnahme bei allen Zoomstufen.
4. PR erstellen und diese Teilabnahme samt offenen Punkten in die PR-Beschreibung übernehmen.

Keine pauschale Behauptung „Browser QA vollständig grün“. Die bereits isolierten Wiring-Fehler wurden behoben; verbleibende Nachweislücken sind keine Freigabe für W4.
