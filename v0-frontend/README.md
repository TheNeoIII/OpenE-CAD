# OpenE-CAD v0 Frontend

This directory is the dedicated GitHub synchronization target for the frontend currently developed in v0.

## Synchronization boundary
- v0 may create, update, move, and delete files inside `v0-frontend/` as required for the frontend.
- v0 must not modify repository content outside `v0-frontend/` unless explicitly instructed.
- `AGENTS.md` contains persistent implementation and context-efficiency rules and should be read before work begins.

## Intended workflow
1. Finish the current task in the existing v0 project.
2. Synchronize the complete current frontend project into this directory.
3. Verify that the synchronized project builds from `v0-frontend/` as its project root.
4. Commit the synchronized baseline to GitHub.
5. For subsequent work, use repository files and `AGENTS.md` as the persistent source of truth instead of carrying a long chat history.
6. Prefer fresh, task-focused chats for larger new work packages once the baseline is synchronized.

## Context files
Keep durable project rules concise. Add detail only when it prevents repeated rediscovery or regressions.

Recommended locations after the initial sync:
- `AGENTS.md` — compact always-relevant rules
- `docs/architecture.md` — only stable architecture that agents repeatedly need
- `docs/editor-behavior.md` — durable interaction rules and editor invariants
- `docs/decisions/` — short decision records for important non-obvious choices

Do not use documentation as a transcript of development history.
