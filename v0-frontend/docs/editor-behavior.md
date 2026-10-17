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
- There is currently no rectangle drawing tool; the only rectangle interaction is the selection band.
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

## History
- Every user-visible document change goes through `historyStore.push(label, doc)` (done in `actions.ts`).
  Drags preview live and commit once on pointer up.
