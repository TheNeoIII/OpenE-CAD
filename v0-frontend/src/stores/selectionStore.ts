import { create } from 'zustand'
import { findObject } from '@/features/schematic/models/geometry'
import { getActivePage } from './documentStore'

export interface SegmentRef {
  wireId: string
  index: number
}

interface SelectionState {
  ids: string[]
  /** Active wire segment (clicked part of a wire); arrow keys / drag move only this segment. */
  segment: SegmentRef | null
  set: (ids: string[]) => void
  setSegment: (segment: SegmentRef | null) => void
  toggle: (id: string) => void
  clear: () => void
  /** Drops ids that no longer exist on the active page (after undo/delete). */
  prune: () => void
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  ids: [],
  segment: null,
  set: (ids) => set({ ids: [...new Set(ids)], segment: null }),
  setSegment: (segment) => set({ segment }),
  toggle: (id) => set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id], segment: null })),
  clear: () => {
    if (get().ids.length || get().segment) set({ ids: [], segment: null })
  },
  prune: () => {
    const page = getActivePage()
    if (!page) return set({ ids: [], segment: null })
    set((s) => {
      const ids = s.ids.filter((id) => findObject(page, id))
      const w = s.segment && page.wires.find((x) => x.id === s.segment!.wireId)
      const segment = w && s.segment!.index < w.points.length - 1 ? s.segment : null
      return { ids, segment }
    })
  },
}))
