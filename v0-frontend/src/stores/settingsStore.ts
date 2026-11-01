import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_FAVORITES } from '@/features/schematic/models/symbolLibrary'
import { DEFAULT_GRID_UNITS, migrateGridSettings, normalizeGridUnits } from '@/features/drawing/gridSettings'

export type ThemeMode = 'light' | 'dark' | 'dark-canvas'

export interface SettingsState {
  theme: ThemeMode
  showGrid: boolean
  snap: boolean
  /** Visible grid spacing in world units (1 mm = 10). */
  gridSize: number
  /** Snap spacing in world units; equals gridSize while snapFollowsGrid is set. */
  snapGridSize: number
  snapFollowsGrid: boolean
  setGridSize: (units: number) => void
  setSnapGridSize: (units: number) => void
  setSnapFollowsGrid: (follow: boolean) => void
  guides: boolean
  mono: boolean
  autosave: boolean
  confirmDelete: boolean
  quickStart: boolean
  /** Plain mouse wheel pans ('scroll') or zooms ('zoom'); Ctrl/Cmd+wheel does the opposite. */
  wheelMode: 'scroll' | 'zoom'
  /** Workstation-wide list of editors (Bearbeiter) that projects can be assigned to. */
  editors: string[]
  defaultEditor: string
  /** Symbol variant keys (`kind:poles`); the first six appear in the schematic toolbar. */
  favoriteSymbols: string[]
  toggleFavorite: (key: string) => void
  set: <K extends keyof Omit<SettingsState, 'set' | 'toggle' | 'addEditor' | 'removeEditor' | 'toggleFavorite' | 'setGridSize' | 'setSnapGridSize' | 'setSnapFollowsGrid' | 'gridSize' | 'snapGridSize' | 'snapFollowsGrid'>>(key: K, value: SettingsState[K]) => void
  toggle: (key: 'showGrid' | 'snap' | 'guides' | 'mono' | 'autosave' | 'confirmDelete' | 'quickStart') => void
  addEditor: (name: string) => boolean
  removeEditor: (name: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      showGrid: true,
      snap: true,
      gridSize: DEFAULT_GRID_UNITS,
      snapGridSize: DEFAULT_GRID_UNITS,
      snapFollowsGrid: true,
      setGridSize: (units) => {
        const gridSize = normalizeGridUnits(units)
        if (gridSize === null) return
        set((s) => ({ gridSize, snapGridSize: s.snapFollowsGrid ? gridSize : s.snapGridSize }))
      },
      setSnapGridSize: (units) => {
        const snapGridSize = normalizeGridUnits(units)
        if (snapGridSize !== null) set({ snapGridSize, snapFollowsGrid: false })
      },
      setSnapFollowsGrid: (follow) => set((s) => ({ snapFollowsGrid: follow, snapGridSize: follow ? s.gridSize : s.snapGridSize })),
      guides: false,
      mono: false,
      autosave: false,
      confirmDelete: false,
      quickStart: true,
      wheelMode: 'scroll',
      editors: [],
      defaultEditor: '',
      favoriteSymbols: DEFAULT_FAVORITES,
      toggleFavorite: (key) => set((s) => ({ favoriteSymbols: s.favoriteSymbols.includes(key) ? s.favoriteSymbols.filter((k) => k !== key) : [...s.favoriteSymbols, key] })),
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<SettingsState>),
      addEditor: (raw) => {
        const name = raw.trim()
        const { editors, defaultEditor } = get()
        if (!name || editors.some((e) => e.toLowerCase() === name.toLowerCase())) return false
        set({ editors: [...editors, name], defaultEditor: defaultEditor || name })
        return true
      },
      removeEditor: (name) =>
        set((s) => {
          const editors = s.editors.filter((e) => e !== name)
          return { editors, defaultEditor: s.defaultEditor === name ? (editors[0] ?? '') : s.defaultEditor }
        }),
    }),
    {
      name: 'openecad.settings',
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>
        return (version < 2 ? { ...state, ...migrateGridSettings(state) } : state) as unknown as SettingsState
      },
      merge: (persisted, current) => {
        const state = (persisted ?? {}) as Record<string, unknown>
        return { ...current, ...state, ...migrateGridSettings(state) }
      },
    },
  ),
)

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  root.classList.toggle('dark', theme !== 'light')
  root.classList.toggle('canvas-dark', theme === 'dark-canvas')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f1f2f4' : '#1e2126')
}
