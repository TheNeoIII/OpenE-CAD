import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_GRID_UNITS, migrateGridSettings, normalizeGridUnits } from '@/features/drawing/gridSettings'

/** Symbol editor view preferences. Same grid semantics as the page editors, but independent values. */
interface SymbolEditorSettings {
  showGrid: boolean
  snap: boolean
  guides: boolean
  gridSize: number
  snapGridSize: number
  snapFollowsGrid: boolean
  toggle: (key: 'showGrid' | 'snap' | 'guides') => void
  setGridSize: (units: number) => void
  setSnapGridSize: (units: number) => void
  setSnapFollowsGrid: (follow: boolean) => void
}

export const useSymbolEditorSettings = create<SymbolEditorSettings>()(
  persist(
    (set) => ({
      showGrid: true,
      snap: true,
      guides: true,
      gridSize: DEFAULT_GRID_UNITS,
      snapGridSize: DEFAULT_GRID_UNITS,
      snapFollowsGrid: true,
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      setGridSize: (units) => {
        const gridSize = normalizeGridUnits(units)
        if (gridSize !== null) set((s) => ({ gridSize, snapGridSize: s.snapFollowsGrid ? gridSize : s.snapGridSize }))
      },
      setSnapGridSize: (units) => {
        const snapGridSize = normalizeGridUnits(units)
        if (snapGridSize !== null) set({ snapGridSize, snapFollowsGrid: false })
      },
      setSnapFollowsGrid: (follow) => set((s) => ({ snapFollowsGrid: follow, snapGridSize: follow ? s.gridSize : s.snapGridSize })),
    }),
    {
      name: 'opene-cad-symbol-editor-view',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>
        const flag = (key: 'showGrid' | 'snap' | 'guides') => (typeof p[key] === 'boolean' ? (p[key] as boolean) : current[key])
        return { ...current, showGrid: flag('showGrid'), snap: flag('snap'), guides: flag('guides'), ...migrateGridSettings(p) }
      },
    },
  ),
)
