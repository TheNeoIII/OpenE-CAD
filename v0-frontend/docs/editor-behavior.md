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
- Inline editing (`models/inlineEdit.ts`, `WiringInlineEditor`): double-click edits exactly one string: text, shape/line label, block title, field label or value, port label. The text tool opens the editor at the click point instead of a dialog; empty new text creates nothing. Enter commits, Shift+Enter inserts a newline only in free text (other targets commit), Escape cancels, blur commits. No history while typing; one commit for changed values, none for unchanged or missing targets. Undo-deleted targets close the editor without writing. Clicking a port label does not move its port; double-click reliably opens the label editor.
- Line vertices: a selected line shows one handle per point; dragging moves that point with grid/endpoint snap (excluding the moved point itself) and commits once on release.

## History
- Every user-visible document change goes through `historyStore.push(label, doc)` (done in `actions.ts`).
  Drags preview live and commit once on pointer up.
