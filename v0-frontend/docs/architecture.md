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

## Symbol library and editor
- Entry: `DataWorkspace` → `Daten / Symbole` → `SymbolEditor.tsx`; resolution in `models/symbolLibrary.ts`, rendering through `SymbolBody` / `ShapeList`.
- `CadDocument.customSymbols` holds `CustomSymbolDef`: stable id, label/description, BMK prefix, category/mount, local pins `{id,x,y}`, and line/rect/circle/text primitives. Coordinates are local 0.1 mm units. Instances reference `kind: custom:<id>`; built-in metadata overrides and per-pole `{shapes,pins}` geometry overrides live in `symbolOverrides`. Both pickers use `symbolVariants`; favorites are references, not additional definitions. `builtinShapes.ts` supplies the editable primitives shared by rendering and duplication, including bounded SVG arc paths. Editing a standard variant keeps its kind and other pole variants unchanged. Reset restores the built-in definition.
- Definitions use the document's existing save/backend path and snapshot undo/redo, not a separate library database. `documentStore.load/replace` synchronizes the derived registry through `setProjectSymbols`; consumers use `symbolDef`, `symbolVariants` and `variantByKey` rather than indexing built-ins directly.
- JSON export contains custom definitions only: `{format: 'symbol-library', version: 1, symbols: [...]}`. Import accepts that wrapper or an array and merges by id (incoming definitions replace matching ids). Current validation checks top-level fields/arrays only, not the full shape schema. Built-in overrides are saved with the project but not exported in the library.
- Main-editor placement, bounds, graphics and docking pins resolve through the same registry. Editing a definition affects all its instances; missing definitions render an unknown-symbol fallback.

## Rendering
- One SVG per sheet; a `<g>` transform applies pan + `scale(s)`. All geometry is drawn in world units.
- `s = zoom * BASE_SCALE`, `BASE_SCALE = 96 / 25.4 / 10` (world unit = 0.1 mm; zoom 1 = 1:1 at 96 dpi).
- Screen-constant elements (strokes, handles, hit areas, snap marker) divide by `s`,
  often clamped: e.g. `9 / Math.max(s, 0.35)`.

## Coordinate system
- World/document coordinates in 0.1 mm units, origin top-left of the sheet, y down.
- Use only `screenToWorld` / `worldToScreen` from `features/schematic/viewport.ts`.
- Inspector displays mm; convert at the UI boundary only.
- Symbol labels default to `labelSide: left`; right and custom are per-instance choices. `labelOffset` stores a world-axis offset from the symbol origin, independent of viewport zoom and symbol rotation. Custom anchor dragging previews without mutations and commits one undo step on release; Escape/pointer cancellation discard it. Custom terminal labels are not collapsed into grouped terminal numbers.
