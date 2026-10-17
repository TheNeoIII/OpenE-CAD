# Architecture (v0-frontend)

## Stack
- Vite 8 + React 19 + TypeScript 5.7 (strict), static SPA, intended Tauri 2 shell (`base: './'`).
- Tailwind CSS 4 via `@tailwindcss/vite`; theme tokens/CSS vars in `src/styles/index.css`.
- State: zustand 5. Icons: lucide-react. Fonts: `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`.
- pnpm. Scripts: `dev`, `typecheck` (`tsc --noEmit`), `build` (typecheck + vite build), `preview`. No lint config.
- Path alias `@/*` -> `src/*`.
- `vite.config.ts` plugin increments `src/build-version.json` on build start and on HMR of `.ts/.tsx/.css`
  (shown in the status bar). Diffs in that file are expected noise.

## Entry points
- `index.html` -> `src/main.tsx` -> `src/App.tsx` (shell: menu bar, project tabs, workspace switch, dialogs, status bar).
- Workspaces (`src/workspaces/`): `SchematicWorkspace` (main editor), `CabinetWorkspace`, `DataWorkspace`,
  `DocumentationWorkspace`, `ProjectWorkspace`, `PotentialsEditor`, `WireStylesEditor`.

## Directory map (only what matters)
- `src/types/` – domain types. `cad.ts` = document model (CadDocument/CadPage/objects, PAGE_FORMATS).
- `src/stores/` – zustand stores (see below).
- `src/features/schematic/`
  - `components/SchematicCanvas.tsx` – SVG editor canvas: pointer/keyboard handling, tools, rendering, handles, context menus.
  - `components/Inspector.tsx` – property panel for the selection (multi-selection aware).
  - `components/SheetFrame.tsx` – sheet border/columns; also renders cross-reference (xref) badges.
  - `components/Navigator.tsx`, `SchematicToolbar.tsx`, `CanvasScrollbars.tsx`, `SymbolGlyph.tsx`, `SymbolLabel.tsx`, `useSheetDrag.ts`.
  - `actions.ts` – document-mutating schematic operations (push history). Reuse these.
  - `viewport.ts` – world/screen conversion, zoom/fit helpers.
  - `models/` – pure logic: `snap.ts` (resolveSnap), `geometry.ts` (bounds, text metrics, findObject),
    `wireEdit.ts` (endpoint/segment editing of wires/rails/lines, attached-conductor following),
    `connectivity.ts`, `netTrace.ts`, `labels.ts`, `symbolLibrary.ts`, `wireStyles.ts`, `execution.ts`.
- `src/commands/` – command registry (`registry.ts`, `commands.ts`), menus incl. context menus (`menus.ts`), `keyboard.ts`.
- `src/components/shell/` – MenuBar, CommandPalette, StatusBar, ProjectTabs, Overlays.
- `src/components/dialogs/` – dialogs; `SchematicDialogs.tsx` holds schematic ones (e.g. cross-reference).
- `src/components/ui/` – local primitives (Dialog, MenuList, primitives). No shadcn.
- `src/backend/` – `OpenEcadBackend` interface; `MockOpenEcadBackend` (default, sample data in `mock/`);
  `TauriOpenEcadBackend` only if `VITE_OPENECAD_BACKEND=tauri` and running inside Tauri.
- `src/utils/` – page naming/organization (`pages.ts`, `pageOrganization.ts`, `docPages.ts`), `format.ts`, `cn.ts`.

## State management
| Store | Role |
|---|---|
| `documentStore` | Current CadDocument + active page; `getActivePage()`, `useActivePage()`, `updatePage(doc, pageId, fn)` |
| `historyStore` | Undo/redo of whole-document snapshots (`push(label, doc)`), bounded |
| `selectionStore` | Selected object ids (+ active wire segment) |
| `toolStore` | `CadTool` (`select`/`wire`/`line`/`place`/`text`/`pan`), wire draft, placement state |
| `viewportStore` | Per-page view `{panX, panY, zoom}`, canvas size, zoom limits, `BASE_SCALE` |
| `settingsStore` | Persisted settings (`openecad.settings`), e.g. `gridSize` 25/50/100 |
| `projectStore`, `dataStore`, `validationStore`, `uiStore` | Projects, data tables, validation findings, UI/dialog/toast state |

Mutations are immutable: build a new document (via `actions.ts` / `updatePage`), push history, set document.

## Rendering
- One SVG per sheet; a `<g>` transform applies pan + `scale(s)`. All geometry is drawn in world units.
- `s = zoom * BASE_SCALE`, `BASE_SCALE = 96 / 25.4 / 10` (world unit = 0.1 mm; zoom 1 = 1:1 at 96 dpi).
- Screen-constant elements (strokes, handles, hit areas, snap marker) divide by `s`,
  often clamped: e.g. `9 / Math.max(s, 0.35)`.

## Coordinate system
- World/document coordinates in 0.1 mm units, origin top-left of the sheet, y down.
- Use only `screenToWorld` / `worldToScreen` from `features/schematic/viewport.ts`.
- Inspector displays mm; convert at the UI boundary only.
