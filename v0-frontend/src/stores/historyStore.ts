import { create } from 'zustand'
import type { CadDocument } from '@/types/cad'
import { endPropertyEdit, useDocumentStore } from './documentStore'
import { useProjectStore } from './projectStore'
import { useSelectionStore } from './selectionStore'

const LIMIT = 100

interface Entry {
  label: string
  doc: CadDocument
}

interface HistoryState {
  past: Entry[]
  future: Entry[]
  push: (label: string, doc: CadDocument) => void
  undo: () => string | null
  redo: () => string | null
  clear: () => void
}

/** Snapshot history. Documents are updated immutably, so snapshots share unchanged structure. */
export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  push: (label, doc) => set((s) => ({ past: [...s.past.slice(-(LIMIT - 1)), { label, doc }], future: [] })),
  undo: () => {
    endPropertyEdit(true)
    const { past, future } = get()
    const current = useDocumentStore.getState().document
    const entry = past[past.length - 1]
    if (!entry || !current) return null
    set({ past: past.slice(0, -1), future: [...future, { label: entry.label, doc: current }] })
    useDocumentStore.getState().replace(entry.doc)
    useSelectionStore.getState().prune()
    useProjectStore.getState().setDirty(true)
    return entry.label
  },
  redo: () => {
    endPropertyEdit(true)
    const { past, future } = get()
    const current = useDocumentStore.getState().document
    const entry = future[future.length - 1]
    if (!entry || !current) return null
    set({ future: future.slice(0, -1), past: [...past, { label: entry.label, doc: current }] })
    useDocumentStore.getState().replace(entry.doc)
    useSelectionStore.getState().prune()
    useProjectStore.getState().setDirty(true)
    return entry.label
  },
  clear: () => set({ past: [], future: [] }),
}))
