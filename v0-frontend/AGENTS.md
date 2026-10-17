# OpenE-CAD v0 Frontend – Agent Instructions

## Scope
This directory is the dedicated synchronization target for the frontend currently developed in v0.
Treat `v0-frontend/` as the frontend project root.
Do not modify files outside `v0-frontend/` unless the user explicitly requests it.

## Goal
Develop the OpenE-CAD browser-based ECAD editor incrementally while preserving all already working behaviour.
Prefer small, targeted changes over broad rewrites or refactors.

## Context-efficiency rules
- Read this file first for every task.
- Inspect only files relevant to the requested change and their direct dependencies.
- Do not scan or summarize the entire repository unless explicitly requested.
- Do not re-read large unrelated files merely to build context.
- Use existing implementations and types before introducing new abstractions.
- Do not output complete unchanged files in chat; report only the files changed and a short result summary.
- Do not restate project history already captured here or in repository documentation.
- When a task concerns one tool/component, keep analysis and edits scoped to that tool/component unless a shared subsystem is demonstrably involved.

## Context order
1. This file. 2. The current user task. 3. Directly affected source files.
4. Only if needed: `docs/architecture.md`. 5. Only if needed: `docs/editor-behavior.md`.
6. Further files only on a real dependency. No precautionary reading of large parts of the project.

## Change policy
- Preserve existing working functionality.
- No unrelated visual redesigns, dependency swaps, formatting sweeps, or architectural refactors.
- Avoid duplicated implementations of snapping, transforms, coordinate conversion, selection, or zoom behaviour.
- Reuse shared editor services/utilities where they already exist.
- If a requested change would require a broader refactor, first prefer the smallest safe implementation.
- Keep changes reviewable and commit logically related work together.

## Editor invariants
- Geometry is represented in document/world coordinates; viewport zoom must not corrupt stored geometry.
- Screen-space UI elements such as selection handles should remain visually usable across zoom levels rather than scaling blindly with document geometry.
- Snapping must affect the committed geometry, not only the visual snap indicator.
- The visual snap indicator and the actual committed point must always agree.
- Rectangle creation must commit the snapped release/end point when snapping is active, not the raw pointer position.
- Line/wire creation must preserve its existing click-based workflow and snapping behaviour.
- Existing zoom, pan, selection and drawing interactions must not regress when changing a single tool.

## Current UX decisions
- Selection/control handles should remain approximately constant in apparent screen size across zoom levels.
- Text must remain visible down to approximately 20% zoom. Do not hide ordinary drawing text already around 94% or 75% zoom.
- Below the low-zoom threshold, simplified text rendering may be used if necessary for performance.
- Snapping must also work when drawing shapes between visible grid lines; grid snapping and geometry/object snapping are distinct concerns.

## Validation
After a code change, run the narrowest relevant checks available in the project, then the standard typecheck/lint/build if reasonably available.
For editor interaction changes, verify at minimum the directly affected interaction plus one nearby regression case.

## Documentation discipline
If a durable editor rule or architectural decision changes, update this file or the appropriate concise document under `docs/` instead of relying on chat history.
Keep persistent context short, factual, and implementation-relevant.
