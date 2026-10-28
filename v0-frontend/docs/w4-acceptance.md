# W4 – Semantic Connections: implementation and acceptance

Stand: 2026-10-28. Base: `c941aa7d4b96a1fcc9c5c1a698af0048063b06b9`.
Implementation commit: `4abe402fbc8198184d3712275c0f0de5e7a35663`.
This report distinguishes tested behavior from remaining acceptance work. No blanket full-release claim.

## Implemented

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

## Vercel and PR status

GitHub commit status for implementation `4abe402` reports Vercel **success**:
https://vercel.com/neoiiis-projects/opene-cad-i3/7gPn7UdA8E14YGPZKGn8JpC9XzQk

A deployed Vercel browser flow has not been verified; local preview evidence must not be presented as deployed-preview evidence. No PR existed for the source branch when checked. The available GitHub CLI credential cannot create PRs; use the pushed W4 branch to open a PR against main. Do not merge automatically.

## Known limits / remaining acceptance

- Deterministic routing, not obstacle-avoiding routing; owner crossings and manual-route backtracking are possible.
- Only internal segments have segment handles. Straight or single-elbow free routes have no internal segment to drag; endpoints remain editable.
- Missing external references are retained as unresolved; no fabricated origin coordinate is persisted. Fully unresolved connections have no known geometry to render.
- Full zoom/modifier/native-drag matrix, exhaustive Schematic regression and deployed Vercel browser QA remain open.
- PR creation and review remain open; historical W3.5.1 acceptance gaps are not implicitly closed by this report.
- Asset upload, electrical semantics for connections, automatic obstacle routing and grouping/locking are outside this implementation.
