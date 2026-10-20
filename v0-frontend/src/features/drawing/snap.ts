import type { Point } from '@/types/cad'
import { snapPoint } from './geometry'
import { screenToWorldTolerance } from './viewport'

/**
 * Purely graphical snap kinds – no pins, junctions or conductor semantics.
 * 'port' is informational only: the snapped point is geometry, never a binding.
 */
export type GraphicSnapKind = 'port' | 'endpoint' | 'grid' | 'free'

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
  /** Explicit object anchors (e.g. ports) – win over vertices and grid. */
  ports?: readonly Point[]
  /** Graphic vertices that attract the cursor (line points, draft points). */
  anchors?: readonly Point[]
}

function nearest(w: Point, pts: readonly Point[] | undefined, tol: number): Point | null {
  let best: Point | null = null
  let bestD = tol
  for (const a of pts ?? []) {
    const d = Math.hypot(a.x - w.x, a.y - w.y)
    if (d <= bestD) {
      best = a
      bestD = d
    }
  }
  return best
}

/**
 * Single snap resolver for graphic editors. Preview, indicator and commit
 * must all call this so the stored geometry equals what was shown.
 * Priority: port > endpoint > grid > free.
 */
export function resolveGraphicSnap(w: Point, o: GraphicSnapOptions): GraphicSnap {
  const free: GraphicSnap = { point: { x: Math.round(w.x), y: Math.round(w.y) }, kind: 'free', label: 'Frei' }
  if (o.disabled) return free
  const tol = screenToWorldTolerance(GRAPHIC_ENDPOINT_TOLERANCE_PX, o.scale)
  const port = nearest(w, o.ports, tol)
  if (port) return { point: { x: port.x, y: port.y }, kind: 'port', label: 'Port' }
  const best = nearest(w, o.anchors, tol)
  if (best) return { point: { x: best.x, y: best.y }, kind: 'endpoint', label: 'Endpunkt' }
  if (o.gridSnap && o.grid > 0) return { point: snapPoint(w, o.grid), kind: 'grid', label: 'Raster' }
  return free
}
