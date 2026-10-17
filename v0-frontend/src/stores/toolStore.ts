import { create } from 'zustand'
import type { RouteMode } from '@/features/schematic/models/geometry'
import type { SnapResult } from '@/features/schematic/models/snap'
import type { Point, SymbolKind } from '@/types/cad'
import type { Article } from '@/types/device'

export type CadTool = 'select' | 'wire' | 'line' | 'place' | 'text' | 'pan'

export const TOOL_LABELS: Record<CadTool, string> = {
  select: 'Auswahl',
  wire: 'Leitung',
  line: 'Grafische Linie',
  place: 'Symbol platzieren',
  text: 'Text',
  pan: 'Verschieben',
}

export const ROUTE_LABELS: Record<RouteMode, string> = { hv: 'H→V', vh: 'V→H' }

interface ToolState {
  tool: CadTool
  placeKind: SymbolKind
  placePoles: 1 | 3
  /** Article from the parts list that newly placed devices get assigned. */
  placeArticle: Article | null
  /** Committed vertices of the wire/line being drawn, in world coordinates. */
  wireDraft: Point[]
  /** What the first vertex snapped to; used to create T-junctions on commit. */
  wireStart: SnapResult | null
  routeMode: RouteMode
  setTool: (tool: CadTool) => void
  startPlace: (kind: SymbolKind, poles?: 1 | 3, article?: Article | null) => void
  setDraft: (points: Point[], start?: SnapResult | null) => void
  toggleRouteMode: () => void
  setRouteMode: (mode: RouteMode) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  placeKind: 'contactor',
  placePoles: 3,
  placeArticle: null,
  wireDraft: [],
  wireStart: null,
  routeMode: 'hv',
  setTool: (tool) => set({ tool, wireDraft: [], wireStart: null, placeArticle: null }),
  startPlace: (kind, poles = 1, article = null) => set({ tool: 'place', placeKind: kind, placePoles: poles, placeArticle: article, wireDraft: [], wireStart: null }),
  setDraft: (wireDraft, start) => set((s) => ({ wireDraft, wireStart: wireDraft.length ? (start === undefined ? s.wireStart : start) : null })),
  toggleRouteMode: () => set((s) => ({ routeMode: s.routeMode === 'hv' ? 'vh' : 'hv' })),
  setRouteMode: (routeMode) => set({ routeMode }),
}))
