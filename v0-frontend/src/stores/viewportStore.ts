import { create } from 'zustand'
import type { SnapResult } from '@/features/schematic/models/snap'
import type { CadViewportState, Point } from '@/types/cad'

/** Pixels per world unit at 100 % (1 unit = 0.1 mm at 96 dpi). */
export const BASE_SCALE = 96 / 25.4 / 10
export const MIN_ZOOM = 0.08
export const MAX_ZOOM = 8

interface ViewportStore {
  byPage: Record<string, CadViewportState>
  /** Most recently used view; carried over to the next page on page switch. */
  last: CadViewportState | null
  size: { w: number; h: number }
  setView: (pageId: string, v: CadViewportState) => void
  setSize: (w: number, h: number) => void
}

/** Screen mapping only. Nothing here is ever written back into document geometry. */
export const useViewportStore = create<ViewportStore>((set) => ({
  byPage: {},
  last: null,
  size: { w: 0, h: 0 },
  setView: (pageId, v) => set((s) => ({ byPage: { ...s.byPage, [pageId]: v }, last: v })),
  setSize: (w, h) => set((s) => (s.size.w === w && s.size.h === h ? s : { size: { w, h } })),
}))

interface CursorStore {
  world: Point | null
  snapped: Point | null
  onPin: boolean
  snap: SnapResult | null
  set: (world: Point | null, snapped: Point | null, onPin: boolean, snap?: SnapResult | null) => void
}

/** High-frequency pointer state, isolated so it only re-renders cursor consumers. */
export const useCursorStore = create<CursorStore>((set) => ({
  world: null,
  snapped: null,
  onPin: false,
  snap: null,
  set: (world, snapped, onPin, snap = null) => set({ world, snapped, onPin, snap }),
}))
