import type { Point } from '@/types/cad'
import { snapPoint } from './geometry'
import { screenToWorldTolerance } from './viewport'

/** Purely graphical snap kinds – no pins, junctions or conductor semantics. */
export type GraphicSnapKind = 'endpoint' | 'grid' | 'free'

export interface GraphicSnap {
  point: Point
  kind: GraphicSnapKind
  label: string
}

export const GRAPHIC_ENDPOINT_TOLERANCE_PX = 12

export interface GraphicSnapOptions {
  /** Screen pixels per world unit. */
  scale: number
  grid: number
  gridSnap: boolean
  /** Alt held: no snapping at all. */
  disabled?: boolean
  /** Graphic vertices that attract the cursor (line points, draft points). */
  anchors?: readonly Point[]
}

/**
 * Single snap resolver for graphic editors. Preview, indicator and commit
 * must all call this so the stored geometry equals what was shown.
 */
export function resolveGraphicSnap(w: Point, o: GraphicSnapOptions): GraphicSnap {
  const free: GraphicSnap = { point: { x: Math.round(w.x), y: Math.round(w.y) }, kind: 'free', label: 'Frei' }
  if (o.disabled) return free
  const tol = screenToWorldTolerance(GRAPHIC_ENDPOINT_TOLERANCE_PX, o.scale)
  let best: Point | null = null
  let bestD = tol
  for (const a of o.anchors ?? []) {
    const d = Math.hypot(a.x - w.x, a.y - w.y)
    if (d <= bestD) {
      best = a
      bestD = d
    }
  }
  if (best) return { point: { x: best.x, y: best.y }, kind: 'endpoint', label: 'Endpunkt' }
  if (o.gridSnap && o.grid > 0) return { point: snapPoint(w, o.grid), kind: 'grid', label: 'Raster' }
  return free
}
