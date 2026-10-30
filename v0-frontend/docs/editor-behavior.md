# Editor behavior (schematic)

Durable rules. Invariants in `../AGENTS.md` take precedence; this file adds code-backed facts.

## Zoom & pan
- Zoom range `MIN_ZOOM = 0.08` .. `MAX_ZOOM = 8` (`stores/viewportStore.ts`); view state is per page.
- `zoomAt(factor, anchor)` keeps the world point under the anchor fixed. Use `setZoom`, `fitPage`,
  `fitWidth`, `fitSelection` from `viewport.ts`; never compute pan/zoom ad hoc.
- Wheel: Ctrl/Cmd = zoom, Shift = horizontal pan, otherwise vertical pan. Zoom never changes stored geometry.

## Coordinates
- Store/commit world coordinates only (0.1 mm units). Convert pointer events with `screenToWorld`.
- Pixel tolerances become world units by dividing by `s` (screen px per world unit).

## Grid
- `settingsStore.gridSize` (25 | 50 | 100 world units) with a grid-snap toggle.
- Arrow keys in select tool move the selection by `gridSize` (Shift: 10 units).

## Snapping (`models/snap.ts`)
- Single source: `resolveSnap(page, worldPoint, options)` (pure). Canvas wraps it as `snapAt`.
- Electrical tools (`wire`, `place`) priority: symbol pin -> wire endpoint -> junction ->
  wire segment (projected, along-axis grid-snapped) -> grid -> free.
- Tolerances (screen px): pin 14, endpoint 12, junction 12, segment 9.
- Graphical `line` tool: grid + line endpoints only.
- Alt held disables snapping (`free`, rounded to integer world units).
- The `resolveSnap` point is both shown by `SnapIndicator` and committed. Never commit the raw pointer.

## Selection
- Click selects; Shift/Ctrl/Cmd toggles. Rubber band: left-to-right = window (fully inside),
  right-to-left = crossing (dashed). Bands under 3 screen px count as a click. Shift band is additive.
- Hit areas are screen-constant (conductors `10 / s`). Cross-reference badges are selectable over their full area.
- Inspector edits all selected objects of the same kind together (e.g. rail start/end for several rails).
- Numeric inspector fields commit on change (typing, arrow keys, spinner), not only on blur.

## Handles
- Endpoint handle size `9 / Math.max(s, 0.35)` world units: ~constant on screen, capped at low zoom.
- Dragging an endpoint moves only that end; conductors attached to the moved end follow (`models/wireEdit.ts`).

## Wire tool (`tool === 'wire'`)
- Click-based: each click adds a vertex; orthogonal routing between vertices (`routeOrthogonal`).
- `Tab` or `R` toggles route mode while drawing; `Enter` or double-click finishes; `Backspace` removes
  the last vertex; `Esc` cancels the draft. Ending on pins/wires creates junctions (toast shows count).

## Line tool (`tool === 'line'`)
- Graphical (non-electrical) line; same click workflow and snap pipeline with `electrical: false`;
  Shift constrains to 45 degree steps.

## Rectangles
- The main schematic editor has no rectangle drawing tool; its rectangle interaction is the selection band. The separate symbol editor supports rectangle primitives.
  A future rectangle tool must commit the `resolveSnap` release point (AGENTS.md invariant).

## Potential rails (`type: 'potential'`)
- Horizontal rails with start/end x; display text independent of the potential name.

## Cross-references (`CadText` with `style: 'xref'`)
- Data: `xref: { targetPageId, peerId, side: 'left' | 'right' }`; the peer badge lives on the target page.
- Created at a chosen end of a selected conductor (context menu / dialog); the target badge is placed freely.
- Badges are movable; conductors docked to a badge stay attached when it moves.
- Context menu "Gehe zu Verweisziel" (`xref.goto`) opens the target page.
- Treat xrefs as references in selection/Inspector, never as plain text.

## Text
- Drawn in world units (`fontSize = t.size`) and not hidden at low zoom; must stay visible down to ~20% zoom.
- Metrics: `textWidth`, `TEXT_LINE = 1.25` in `models/geometry.ts`.

## Symbol editor (`Daten → Symbole`)
- Search, create, duplicate and edit project symbols; built-in graphics stay fixed while metadata can be overridden/reset. Duplicating a built-in copies its single-pole pins and metadata with a bounding-box graphic, not its original detailed drawing. Duplicating a custom symbol copies its primitives.
- Local drawing tools: select/move, line, rectangle, circle, text and pin; grid is 25 world units (2.5 mm). Properties use local 0.1 mm units; numeric edits commit on change, text on blur/Enter. Delete removes the selected primitive/pin.
- Changes use document history and project saving. Shared definition ids and pin ids are connection identities: do not casually regenerate them. Pins are the main editor's electrical docking points, not merely decorative markers.
- JSON library import merges by id and can replace a definition used on existing sheets. Export includes all custom symbols, not built-in metadata overrides.
- Deleting a used custom symbol requires confirmation and leaves its placed instances with an unknown-symbol fallback; it does not delete the instances.

## Wiring editor interactions (`features/wiring`)
- Graphic snapping uses world-space port positions before line vertices and grid points, including vertex drags. Alt disables snapping. Snapping stores geometry only, never an electrical connection or binding.
- Shift never moves hard port/endpoint anchors. Only grid/free points may be constrained to 45°; displaced grid points become `free` (45°), never a misleading grid/port indicator. Preview, marker and commit share the final point.
- Grid snapping always uses `gridSize`, regardless of zoom. Visible dots may thin to integer multiples at low zoom for readability; every visible dot remains a real snap point. Intermediate invisible lattice points remain snappable and the marker shows their exact position.
- Port label position is selectable in the block inspector: automatic (outside, derived from the edge), left, right, top, or bottom. Missing values retain the automatic layout for older documents.
- Same-tool selection (`models/interaction.ts`): with a drawing tool active, pressing on an object of the type that tool creates selects/moves it instead of creating a new one. Ctrl/Cmd forces creation over it; a running line draft always adds points. Handles of a selected matching object stay usable while its tool is active.
- Escape ladder (`escapeAction`): inline edit, running gesture, line draft, port tool, selection, active tool. One level per press. The port tool deliberately exits before clearing selection because it is a sub-mode of the selected owner.
- Inline editing (`models/inlineEdit.ts`, `WiringInlineEditor`): double-click edits exactly one string: text, shape/line label, block title, field label or value, port label. The text tool opens the editor at the click point instead of a dialog; empty new text creates nothing. Escape terminates inline text editing while preserving dirty text; blur also commits. For free text and rectangle/ellipse/line/connection labels, Enter inserts a newline and Ctrl/Cmd+Enter commits and closes. Short semantic fields retain Enter=commit. Unchanged sessions are no-ops; new empty/whitespace-only text is discarded, new non-empty text is committed. No history while typing; one commit for changed values, none for unchanged or missing targets. Undo-deleted targets close the editor without writing. Clicking a port label does not move its port; double-click reliably opens the label editor.
- Line vertices: a selected line shows one handle per point; dragging moves that point with grid/endpoint snap (excluding the moved point itself) and commits once on release.

## W4 semantic connections
- The Wiring-only connection tool uses two clicks: start, then finish. Port hits store only owner/port IDs; otherwise endpoints are free world points. Alt suppresses binding. A local draft never enters history; Escape cancels it.
- Bound points resolve from current block geometry and edge/t on every render. Owner move/resize and port move therefore stay sticky without persisted endpoint coordinates. CadLine remains purely graphic.
- All rendered segments are orthogonal. Routing uses 50 document-unit port leads and deterministic HV/VH bridges, removes duplicates and redundant collinear points, and preserves manual intermediate route points. There is no obstacle avoidance.
- Selected connections expose endpoint handles (detach, reattach, retarget) and handles for every segment. Dragging a bound first/last or sole segment adds orthogonal doglegs while preserving bindings and outward endpoint leads (short segments use shorter leads). Owner-crossing or degenerate edits are rejected rather than replaced by an unrelated automatic route. Unchanged geometry creates no history entry. Gestures preview locally and commit once on release; Escape, pointer cancellation/capture loss and window blur discard the gesture without changing the document.
- Inspector edits type, label, stroke, width and line style and describes both endpoints. Double-click edits the label with the existing inline-editor commit/cancel contract.
- Deleting a port/owner first resolves attached endpoints to free points in the same transaction. Deleting a connection does not delete either owner. Missing imported references remain unresolved rather than jumping to the origin.
- Group paste remaps selected owner and port IDs. Connections copied alone, or with only one owner, detach references to omitted owners at their resolved positions. Page copy/duplicate remaps the complete graph.
- Optional `connections` defaults to an empty list for legacy pages. Connection semantics are not electrical and are excluded from Schematic tools, networks and reports.

## W4.1 correction acceptance (42–50)
42. Dirty inline text + Escape: commits once (browser checked with a connection label).
43. Unchanged + Escape: no-op (browser checked).
44. New empty text + Escape: discarded by the existing creation guard; keyboard component test passed.
45. New non-empty text + Escape: commit path preserved; keyboard component test passed.
46. Multiline Enter: native newline, persisted and rendered as separate SVG lines (browser checked).
47. Ctrl/Cmd+Enter: commit and close; both modifiers covered by keyboard component tests, Ctrl additionally browser checked.
48. Lock/Unlock: explicitly scheduled for W4.2, not implemented here.
49. Group/Ungroup: confirmed follow-up documented below.
50. Nested groups in first version: NO.

Validation: typecheck and existing test command passed; 8 additional keyboard component tests passed with `node --test tests/wiring-inline-keyboard.test.mjs` from the frontend directory. The keyboard harness isolates component handlers with mocked hooks/callbacks; it is not a persistence integration test. Browser checks confirmed actual history counts for changed/unchanged connection labels and Ctrl+Enter. New-text browser flow remains unverified: the attempted Text-tool click did not open a textarea. This is not reported as a passed test. Historical W4 Escape-cancel evidence is superseded by this correction.

## Confirmed roadmap
- W4.1 — User Acceptance Corrections: preserve dirty inline text on Escape; multiline Enter and Ctrl/Cmd+Enter completion. Selection remains distinct from persistent groups.
- W4.2 NEXT — Annotation & Selection Foundation: shared TextStyle, extended multiline labels, label anchors/rotation/reset, compatible multi-selection properties, shared bounds/highlight/move and common selection/transform foundation. Lock/Unlock is explicitly deferred here, not partially implemented in W4.1.
- W4.2 locking must persist/export in `.oecad`, remain visible and selectable for unlocking, show “Gesperrt”, support context-menu and multi-selection Lock/Unlock, and guard every mutation: move, resize, vertices, endpoints/segments, inline edit, properties, delete and future rotation. No UI-only lock.
- W3.7 afterwards — Group & Transform: persistent flat Group/Ungroup, group selection on normal click, group move/copy/paste/duplicate/delete, group lock and common transform bounds; rotation later. No nested groups in the first version. Member editing via double-click or Enter Group Mode is a future capability, not implemented now. Never simulate groups with selection-only IDs.

## History
- Every user-visible document change goes through `historyStore.push(label, doc)` (done in `actions.ts`).
  Drags preview live and commit once on pointer up.
