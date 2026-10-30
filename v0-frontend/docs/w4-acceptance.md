# W4 – Semantic Connections: implementation and acceptance

Stand: 2026-10-28. Base: `c941aa7d4b96a1fcc9c5c1a698af0048063b06b9`.
Implementation commit: `4abe402fbc8198184d3712275c0f0de5e7a35663`.
This report distinguishes tested behavior from remaining acceptance work. No blanket full-release claim.

## W4.1 shape-binding checkpoint — 2026-10-30 (not merge-ready)

Implemented `shape` endpoints without hidden ports: rectangle/block anchors store edge + normalized t; ellipse anchors store angle in turns. Resolution is live during move/resize. Port targets win over boundary targets; Alt disables semantic binding. Connection creation and endpoint reattachment share the resolver and target marker. Port cursor is crosshair for connections, move only in the port tool.

Owner deletion detaches shape endpoints in the existing history transaction. Object/group and page copies remap all three owner types; copying only the connection materializes resolved world points. Ellipse routing checks the actual curved interior, not the enclosing rectangle.

Validation:
- 128 tests passed, including 41 connection tests; typecheck, production build and diff whitespace check passed. Existing large-bundle warning remains.
- Native browser on `http://localhost:3000`, development preview, dark UI, 1135×853: created rectangle and ellipse through drawing tools, hovered both boundaries and observed shape target markers, dragged a connection between them, moved the rectangle and observed its connected endpoint follow, deleted the rectangle while keeping the last endpoint position, and restored the binding with one Undo. No injected document state or synthetic event dispatch. No browser errors.
- Unit regressions cover all three shape owners through move/resize/detach/JSON roundtrip, copy remapping, port priority, Alt, interior misses, and ellipse routing across sixteen perimeter angles.
- Full native reattach/port-combination matrix and deployment QA remain part of final acceptance, not claimed by this checkpoint.

## W4.1 routing checkpoint — 2026-10-30 (not merge-ready)

The W4 evidence below is historical, not proof of W4.1 acceptance. Product-owner testing exposed pointer lock, missing boundary-segment handles, routing, text-tool and live-property defects. In particular any historical claim that Escape discards dirty inline text is superseded: dirty inline text + Escape commits once; unchanged text closes without a commit.

This checkpoint adds bounded local route candidates (not global obstacle routing), checks for backtracking and non-adjacent segment intersections, shortest valid automatic routes, preservation of valid manual routes and render-time automatic fallback for invalid manual routes. Both bound diagram-block bounds are considered. Opposing aligned ports resolve to two points/one segment. Invalid segment moves retain the previous geometry rather than introducing a crossing.

Validation in this continuation:
- `pnpm test`: 124 passed, zero failures (37 connection tests).
- `pnpm typecheck` and `pnpm build`: passed.
- Native browser, local development preview, dark UI, 1135×853: opened the project and created a Wiring page through the UI; dragged a free-to-free connection; selected it and observed exactly one segment handle; dragged that handle into a three-segment dogleg with unchanged endpoints; Undo restored the straight route, Redo restored the dogleg. No browser errors reported. No handler dispatch or document-store injection used for this evidence.
- Automated coverage: short/straight segment edits, every port-edge pair across six non-overlapping owner arrangements, normal directions, normalization, crossing/backtracking detection, valid manual-route preservation.

Remaining acceptance work: multi-port selection and floating manager, connection presets, live property sessions, shared selection properties, complete native text/pointer/reattach and schematic regression matrix. Bound endpoint-adjacent manual edits still need native acceptance; forcing outward normals can reject a user dogleg. Invalid stored manual waypoints are currently bypassed during resolution, not rewritten in document history. Overlapping owners/coincident endpoints can make an outward route impossible; the fallback does not guarantee owner avoidance in that case. Vercel deployment QA and the full W4.1 PR gate are not completed.

## Implemented (historical W4)

| Contract | Result |
|---|---|
| Independent CadConnection, optional legacy-safe page array | Yes |
| Connection tool; port→port, port→free, free→port, free→free | Yes |
| Persisted coordinates on bound endpoints | No: owner ID / port ID only |
| Sticky owner move, resize and port move | Yes: live resolution |
| Endpoint detach, reattach and retarget | Yes |
| Port/owner deletion detaches at last resolved position | Yes, one history transaction |
| Orthogonal routing and route normalization | Yes; no diagonal rendered segments |
| Internal segment editing | Yes; endpoint identities preserved |
| Connection types | generic, cable, network, bus, power, signal |
| Inspector and inline label | Yes |
| Clipboard graph remapping | Yes; omitted-owner references become free points |
| Connection-only paste detaches both resolved bindings | Yes |
| CadLine remains graphic; CadWire remains electrical | Yes |

## Automated verification

Executed from repository root after resuming acceptance:

- `pnpm test`: **113 passed, 0 failed**, including **34 new connection cases**.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; Vite reports a non-failing chunk-size warning (>500 kB).
- New cases cover endpoint resolution, legacy safety, page-kind isolation, routing directions, normalization, segment motion, sticky geometry, detach semantics, inline edits, clipboard ID remapping and history behavior.
- Existing profile/command, electrical report/validation and drawing regressions remain enabled and passing.

## Browser evidence

Local Vite development preview, 1135×853, dark UI. Test fixtures were injected into the development document store only; no project save was requested.

First acceptance session:
- Four endpoint combinations committed; draft did not create history.
- Endpoint detach, reattach, retarget and pointer cancellation checked.
- Internal segment move, undo and redo checked with axis-alignment assertions.
- Both owners moved/resized and ports moved; endpoint identity and resolved attachment positions checked.
- Group paste remapping, connection-only paste, port deletion, owner deletion and connection deletion checked, with undo restoration.
- Canvas gesture checks used dispatched pointer events against actual DOM targets; these establish handler/state behavior, not native mouse hit-target usability for every handle.

Resumed session (fresh browser runtime):
- Native double-click on rendered connection label opened inline editing.
- Enter committed `CAT7 – Gebäude A` in exactly one history step; Escape discarded a replacement without another step.
- Native Inspector changes for type, width and line style reached the document model.
- Screenshot `/tmp/agent-browser/w4-label-inspector.png` inspected: connection, label, endpoint handles and Inspector render without overlap at the tested viewport.
- Returned to the original Schematic page: two symbols and six wires rendered; native symbol selection succeeded; no connection handles or connection Inspector leaked into Schematic. Browser error list empty at this checkpoint.
- Original test document restored before Schematic smoke check. This is a narrow regression smoke test, not exhaustive Schematic acceptance.

Additional acceptance session:
- Native `agent-browser drag` from the free start endpoint to the block port passed at 50%, 100% and 200% zoom. The resulting endpoint stores the expected owner/port IDs; the first drag created exactly one history entry.
- Native internal-segment drag changed route geometry in one transaction and retained the port binding.
- Native mouse-down/move, Escape, mouse-up sequence preserved the complete page and history count.
- Pointer-event modifier matrix passed at 50%, 100% and 200%: without Alt, the endpoint binds to the port; with Alt, it remains a free point. Modifier rows are handler-level checks, not native held-key tests.
- Original document restored without saving. Browser error list empty.

## Vercel and PR status

GitHub commit status for implementation `4abe402` reports Vercel **success**:
https://vercel.com/neoiiis-projects/opene-cad-i3/7gPn7UdA8E14YGPZKGn8JpC9XzQk

The W4 branch preview was inspected and opened directly:
https://opene-cad-i3-jc9jp25qh-neoiiis-projects.vercel.app
Branch alias: https://opene-cad-i3-git-v0-w4-semantic-connections-neoiiis-projects.vercel.app

Vercel lists the deployment as Ready. Browser navigation redirects to Vercel Login (deployment protection), blocking application interaction. `vercel curl` with redirects returns HTTP 200; that HTTP result alone does not establish that the editor loaded or that deployed interactions passed. Protection was not disabled. A deployed browser flow remains unverified and requires an authorized browser session; local evidence is not deployed evidence.

No PR existed for the source branch when previously checked. The available GitHub CLI credential cannot create PRs; use the pushed W4 branch to open a PR against main. Do not merge automatically.

## Known limits / remaining acceptance

- Deterministic routing, not obstacle-avoiding routing; owner crossings and manual-route backtracking are possible.
- Only internal segments have segment handles. Straight or single-elbow free routes have no internal segment to drag; endpoints remain editable.
- Missing external references are retained as unresolved; no fabricated origin coordinate is persisted. Fully unresolved connections have no known geometry to render.
- Native endpoint binding at three zoom levels, segment dragging and Escape cancellation are now checked. Exhaustive gesture/modifier combinations (including native held-key modifiers), exhaustive Schematic regression and authenticated deployed Vercel browser QA remain open.
- PR creation and review remain open; historical W3.5.1 acceptance gaps are not implicitly closed by this report.
- Asset upload, electrical semantics for connections, automatic obstacle routing and grouping/locking are outside this implementation.
