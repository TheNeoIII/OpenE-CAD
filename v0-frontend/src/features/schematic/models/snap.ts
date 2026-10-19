import type { CadPage, Point } from '@/types/cad'
import { screenToWorldTolerance } from '@/features/drawing/viewport'
import { snapPoint, snapValue, symbolPins } from './geometry'

/**
 * Snap kinds, in descending priority.
 * - pin:      electrical connection point of a symbol (terminal)
 * - endpoint: free end of an existing electrical wire
 * - junction: existing electrical node joining several wire segments
 * - segment:  somewhere on an existing wire / potential rail (T-connection)
 * - grid:     purely geometric snap, carries no electrical meaning
 * - free:     raw world position (snapping disabled)
 */
export type SnapKind = 'pin' | 'endpoint' | 'junction' | 'segment' | 'grid' | 'free'

export type SnapRef =
  | { kind: 'pin'; symbolId: string; pinId: string }
  | { kind: 'endpoint'; wireId: string; end: 'start' | 'end' }
  | { kind: 'junction'; junctionId: string }
  | { kind: 'wireSegment'; wireId: string; index: number }
  | { kind: 'potential'; potentialId: string }
  | null

export interface SnapResult {
  point: Point
  kind: SnapKind
  ref: SnapRef
  label: string
}

/** Hit tolerances in SCREEN pixels, converted to world units per zoom level. */
export const SNAP_TOLERANCE_PX = { pin: 14, endpoint: 12, junction: 12, segment: 9 } as const

export const ELECTRICAL_SNAP_KINDS: ReadonlySet<SnapKind> = new Set(['pin', 'endpoint', 'junction', 'segment'])

export const SNAP_KIND_LABELS: Record<SnapKind, string> = {
  pin: 'Anschluss',
  endpoint: 'Leitungsende',
  junction: 'Verbindungspunkt',
  segment: 'Auf Leitung',
  grid: 'Raster',
  free: 'Frei',
}

export interface SnapOptions {
  /** Screen pixels per world unit at the current zoom. */
  scale: number
  grid: number
  gridSnap: boolean
  /** Temporarily disables all snapping (e.g. Alt held). */
  disabled?: boolean
  /** Electrical snaps (pins, wires, junctions). Graphical lines use only grid + line endpoints. */
  electrical: boolean
  /** Resolves a human-readable symbol name for pin labels. */
  symbolName?: (symbolId: string) => string
}

const rawPoint = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })

interface Candidate {
  d: number
  result: SnapResult
}

const closer = (a: Candidate | null, b: Candidate) => (!a || b.d < a.d ? b : a)

/**
 * Projects `w` onto an orthogonal segment. The along-axis coordinate is grid-snapped
 * (when enabled) and clamped to the segment, so T-connections land on clean coordinates.
 */
function projectOrthogonal(w: Point, a: Point, b: Point, grid: number, gridSnap: boolean, tol: number): { p: Point; d: number } | null {
  const along = (v: number) => (gridSnap ? snapValue(v, grid) : Math.round(v))
  if (a.y === b.y) {
    const lo = Math.min(a.x, b.x)
    const hi = Math.max(a.x, b.x)
    if (w.x < lo - tol || w.x > hi + tol) return null
    const d = Math.abs(w.y - a.y)
    if (d > tol) return null
    return { p: { x: Math.min(hi, Math.max(lo, along(w.x))), y: a.y }, d }
  }
  if (a.x === b.x) {
    const lo = Math.min(a.y, b.y)
    const hi = Math.max(a.y, b.y)
    if (w.y < lo - tol || w.y > hi + tol) return null
    const d = Math.abs(w.x - a.x)
    if (d > tol) return null
    return { p: { x: a.x, y: Math.min(hi, Math.max(lo, along(w.y))) }, d }
  }
  return null
}

/** Resolves the snap target for a world-space cursor position. Pure: same inputs, same output. */
export function resolveSnap(page: CadPage, w: Point, o: SnapOptions): SnapResult {
  if (o.disabled) return { point: rawPoint(w), kind: 'free', ref: null, label: SNAP_KIND_LABELS.free }

  const tol = (px: number) => screenToWorldTolerance(px, o.scale)

  if (o.electrical) {
    // 1. Symbol connection points
    let pin: Candidate | null = null
    const tPin = tol(SNAP_TOLERANCE_PX.pin)
    for (const s of page.symbols) {
      for (const p of symbolPins(s)) {
        const d = Math.hypot(p.x - w.x, p.y - w.y)
        if (d <= tPin) {
          const name = o.symbolName?.(s.id) ?? ''
          pin = closer(pin, { d, result: { point: { x: p.x, y: p.y }, kind: 'pin', ref: { kind: 'pin', symbolId: s.id, pinId: p.pinId }, label: `${SNAP_KIND_LABELS.pin} ${name}:${p.pinId}` } })
        }
      }
    }
    for (const t of page.texts.filter((t) => t.style === 'xref')) {
      const d = Math.hypot(t.position.x - w.x, t.position.y - w.y)
      if (d <= tPin) pin = closer(pin, { d, result: { point: { ...t.position }, kind: 'pin', ref: null, label: `Querverweis ${t.text}` } })
    }
    if (pin) return pin.result

    // 2. Existing wire endpoints
    let end: Candidate | null = null
    const tEnd = tol(SNAP_TOLERANCE_PX.endpoint)
    for (const wire of page.wires) {
      const ends: ['start' | 'end', Point][] = [
        ['start', wire.points[0]],
        ['end', wire.points[wire.points.length - 1]],
      ]
      for (const [which, p] of ends) {
        const d = Math.hypot(p.x - w.x, p.y - w.y)
        if (d <= tEnd) end = closer(end, { d, result: { point: { ...p }, kind: 'endpoint', ref: { kind: 'endpoint', wireId: wire.id, end: which }, label: SNAP_KIND_LABELS.endpoint } })
      }
    }
    if (end) return end.result

    // 3a. Existing junctions
    let junction: Candidate | null = null
    const tJ = tol(SNAP_TOLERANCE_PX.junction)
    for (const j of page.junctions) {
      const d = Math.hypot(j.position.x - w.x, j.position.y - w.y)
      if (d <= tJ) junction = closer(junction, { d, result: { point: { ...j.position }, kind: 'junction', ref: { kind: 'junction', junctionId: j.id }, label: SNAP_KIND_LABELS.junction } })
    }
    if (junction) return junction.result

    // 3b. Existing wire segments and potential rails
    let seg: Candidate | null = null
    const tSeg = tol(SNAP_TOLERANCE_PX.segment)
    for (const wire of page.wires) {
      for (let i = 0; i < wire.points.length - 1; i++) {
        const hit = projectOrthogonal(w, wire.points[i], wire.points[i + 1], o.grid, o.gridSnap, tSeg)
        if (hit) seg = closer(seg, { d: hit.d, result: { point: hit.p, kind: 'segment', ref: { kind: 'wireSegment', wireId: wire.id, index: i }, label: SNAP_KIND_LABELS.segment } })
      }
    }
    for (const rail of page.potentials) {
      const hit = projectOrthogonal(w, { x: rail.x1, y: rail.y }, { x: rail.x2, y: rail.y }, o.grid, o.gridSnap, tSeg)
      if (hit) seg = closer(seg, { d: hit.d, result: { point: hit.p, kind: 'segment', ref: { kind: 'potential', potentialId: rail.id }, label: `Auf Potential ${rail.name}` } })
    }
    if (seg) return seg.result
  } else {
    // Graphical lines: geometric snap to other line endpoints only.
    let end: Candidate | null = null
    const tEnd = tol(SNAP_TOLERANCE_PX.endpoint)
    for (const line of page.lines) {
      for (const p of line.points) {
        const d = Math.hypot(p.x - w.x, p.y - w.y)
        if (d <= tEnd) end = closer(end, { d, result: { point: { ...p }, kind: 'endpoint', ref: null, label: 'Linienende' } })
      }
    }
    if (end) return end.result
  }

  // 4. Grid
  if (o.gridSnap) return { point: snapPoint(w, o.grid), kind: 'grid', ref: null, label: SNAP_KIND_LABELS.grid }
  // 5. Raw
  return { point: rawPoint(w), kind: 'free', ref: null, label: SNAP_KIND_LABELS.free }
}
