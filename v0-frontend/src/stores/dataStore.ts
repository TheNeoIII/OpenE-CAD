import { create } from 'zustand'
import { backend } from '@/backend'
import type { CellValue, DataTable, DataViewId } from '@/types/data'
import { useDocumentStore } from './documentStore'

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

interface DataState {
  tables: Partial<Record<DataViewId, DataTable>>
  loading: DataViewId | null
  selected: string[]
  anchor: string | null
  search: string
  onlyIssues: boolean
  sort: SortState | null
  filters: Record<string, string>
  hidden: Partial<Record<DataViewId, string[]>>
  load: (view: DataViewId) => Promise<void>
  updateCell: (view: DataViewId, rowId: string, key: string, value: CellValue) => void
  updateCells: (view: DataViewId, rowIds: string[], key: string, value: CellValue) => void
  deleteRows: (view: DataViewId, rowIds: string[]) => void
  setSelected: (ids: string[], anchor?: string | null) => void
  set: (patch: Partial<Pick<DataState, 'search' | 'onlyIssues' | 'sort' | 'filters'>>) => void
  toggleColumn: (view: DataViewId, key: string) => void
}

const DEVICE_KEYS = new Set(['bmk', 'function', 'category', 'location', 'manufacturer', 'articleNo', 'ratedCurrent', 'widthTE'])

export const useDataStore = create<DataState>((set, get) => ({
  tables: {},
  loading: null,
  selected: [],
  anchor: null,
  search: '',
  onlyIssues: false,
  sort: null,
  filters: {},
  hidden: {},

  load: async (view) => {
    const doc = useDocumentStore.getState().document
    if (!doc) return
    if (!get().tables[view]) set({ loading: view })
    const table = await backend.getDataTable(view, doc)
    const prev = get().tables[view]
    // Keep local edits to generated rows; real device rows always come fresh from the document.
    if (prev) {
      const edited = new Map(prev.rows.filter((r) => !r.deviceId).map((r) => [r.id, r]))
      table.rows = table.rows.map((r) => (r.deviceId ? r : (edited.get(r.id) ?? r))).filter((r) => r.deviceId || edited.has(r.id) || !prev.rows.length)
    }
    set((s) => ({ tables: { ...s.tables, [view]: table }, loading: null }))
  },

  updateCell: (view, rowId, key, value) => get().updateCells(view, [rowId], key, value),

  updateCells: (view, rowIds, key, value) => {
    const table = get().tables[view]
    if (!table) return
    const ids = new Set(rowIds)
    const deviceIds = table.rows.filter((r) => ids.has(r.id) && r.deviceId).map((r) => r.deviceId!)
    set((s) => ({ tables: { ...s.tables, [view]: { ...table, rows: table.rows.map((r) => (ids.has(r.id) ? { ...r, cells: { ...r.cells, [key]: value } } : r)) } } }))
    if (view === 'devices' && deviceIds.length && DEVICE_KEYS.has(key)) {
      const dset = new Set(deviceIds)
      useDocumentStore.getState().commit(`${key} geändert`, (doc) => ({
        ...doc,
        devices: doc.devices.map((d) => (dset.has(d.id) ? { ...d, [key]: value } : d)),
      }))
    }
  },

  deleteRows: (view, rowIds) => {
    const table = get().tables[view]
    if (!table) return
    const ids = new Set(rowIds)
    set((s) => ({ tables: { ...s.tables, [view]: { ...table, rows: table.rows.filter((r) => !ids.has(r.id) || r.deviceId) } }, selected: [] }))
  },

  setSelected: (selected, anchor) => set((s) => ({ selected, anchor: anchor === undefined ? s.anchor : anchor })),
  set: (patch) => set(patch),
  toggleColumn: (view, key) =>
    set((s) => {
      const cur = s.hidden[view] ?? []
      return { hidden: { ...s.hidden, [view]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] } }
    }),
}))
