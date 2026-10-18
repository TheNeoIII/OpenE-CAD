import type {
  CadObject,
  CadPage,
  CadSymbol,
  CadWire,
  CadWireSegment,
  Point,
  Rect,
  Rotation,
} from '@/types/cad'
import type { CadText } from '@/types/cad'
import { symbolDef } from './symbolLibrary'

export const TEXT_LINE = 1.25

export function textWidth(t: Pick<CadText, 'text' | 'size'>) {
  const longest = t.text.split('\n').reduce((m, l) => Math.max(m, l.length), 0)
  return Math.max(longest, 1) * t.size * 0.6
}

export function rotatePoint(p: Point, r: Rotation): Point {
  switch (r) {
    case 90:
      return { x: -p.y, y: p.x }
    case 180:
      return { x: -p.x, y: -p.y }
    case 270:
      return { x: p.y, y: -p.x }
    default:
      return { x: p.x, y: p.y }
  }
}

export interface WorldPin {
  symbolId: string
  pinId: string
  x: number
  y: number
}

export function symbolPins(s: CadSymbol): WorldPin[] {
  return symbolDef(s.kind).pins(s).map((p) => {
    const r = rotatePoint(p, s.rotation)
    return { symbolId: s.id, pinId: p.id, x: s.position.x + r.x, y: s.position.y + r.y }
  })
}

export function symbolBounds(s: CadSymbol): Rect {
  const b = symbolDef(s.kind).bbox(s)
  const corners = [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x, y: b.y + b.h },
    { x: b.x + b.w, y: b.y + b.h },
  ].map((c) => rotatePoint(c, s.rotation))
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x: s.position.x + x, y: s.position.y + y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function pointsBounds(points: Point[]): Rect {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function unionRects(rects: Rect[]): Rect | null {
  if (!rects.length) return null
  const x1 = Math.min(...rects.map((r) => r.x))
  const y1 = Math.min(...rects.map((r) => r.y))
  const x2 = Math.max(...rects.map((r) => r.x + r.w))
  const y2 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export function objectBounds(o: CadObject): Rect {
  switch (o.type) {
    case 'symbol':
      return symbolBounds(o)
    case 'wire':
    case 'line':
      return pointsBounds(o.points)
    case 'junction':
      return { x: o.position.x - 10, y: o.position.y - 10, w: 20, h: 20 }
    case 'text': {
      const lines = o.text.split('\n')
      const w = textWidth(o)
      const x = o.anchor === 'start' ? o.position.x : o.anchor === 'end' ? o.position.x - w : o.position.x - w / 2
      return { x, y: o.position.y - o.size, w, h: o.size * 1.2 + (lines.length - 1) * o.size * TEXT_LINE }
    }
    case 'potential':
      return { x: o.x1, y: o.y - 10, w: o.x2 - o.x1, h: 20 }
  }
}

export function rectContains(outer: Rect, inner: Rect) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h
}

export function normalizeRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}

export function wireSegments(w: CadWire): CadWireSegment[] {
  const segs: CadWireSegment[] = []
  for (let i = 0; i < w.points.length - 1; i++) segs.push({ wireId: w.id, index: i, a: w.points[i], b: w.points[i + 1] })
  return segs
}

export function wireLength(w: CadWire) {
  return wireSegments(w).reduce((sum, s) => sum + Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y), 0)
}

export function pointOnSegment(p: Point, a: Point, b: Point, tol = 0.5) {
  const minX = Math.min(a.x, b.x) - tol
  const maxX = Math.max(a.x, b.x) + tol
  const minY = Math.min(a.y, b.y) - tol
  const maxY = Math.max(a.y, b.y) + tol
  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) return false
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
  return Math.abs(cross) <= tol * Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
}

export const samePoint = (a: Point, b: Point) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5

export const snapValue = (v: number, grid: number) => Math.round(v / grid) * grid

export function snapPoint(p: Point, grid: number): Point {
  return { x: snapValue(p.x, grid), y: snapValue(p.y, grid) }
}

/** Removes duplicate and collinear interior vertices of an orthogonal polyline. */
export function simplifyPolyline(points: Point[]): Point[] {
  const dedup = points.filter((p, i) => i === 0 || !samePoint(p, points[i - 1]))
  if (dedup.length < 3) return dedup
  const out: Point[] = [dedup[0]]
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = out[out.length - 1]
    const b = dedup[i]
    const c = dedup[i + 1]
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
    if (!collinear) out.push(b)
  }
  out.push(dedup[dedup.length - 1])
  return out
}

/** 'hv' = horizontal leg first, then vertical. 'vh' = vertical first, then horizontal. */
export type RouteMode = 'hv' | 'vh'

/** Orthogonal L-route from `from` to `to`. Returns the points after `from` (corner, if any, then `to`). */
export function routeOrthogonal(from: Point, to: Point, mode: RouteMode = 'hv'): Point[] {
  if (samePoint(from, to)) return []
  if (from.x === to.x || from.y === to.y) return [to]
  const corner = mode === 'hv' ? { x: to.x, y: from.y } : { x: from.x, y: to.y }
  return [corner, to]
}

export function orthoRoute(from: Point, to: Point): Point[] {
  return routeOrthogonal(from, to, 'hv')
}

export function isOrthogonal(points: Point[]) {
  for (let i = 0; i < points.length - 1; i++) if (points[i].x !== points[i + 1].x && points[i].y !== points[i + 1].y) return false
  return true
}

export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy }
}

export function translateObject<T extends CadObject>(o: T, dx: number, dy: number): T {
  switch (o.type) {
    case 'symbol':
    case 'junction':
    case 'text':
      return { ...o, position: translatePoint(o.position, dx, dy) }
    case 'wire':
    case 'line':
      return { ...o, points: o.points.map((p) => translatePoint(p, dx, dy)) }
    case 'potential':
      return { ...o, x1: o.x1 + dx, x2: o.x2 + dx, y: o.y + dy }
  }
}

export function pageObjects(page: CadPage): CadObject[] {
  return [...page.lines, ...page.potentials, ...page.wires, ...page.junctions, ...page.symbols, ...page.texts]
}

export function findObject(page: CadPage, id: string): CadObject | undefined {
  return (
    page.symbols.find((o) => o.id === id) ??
    page.wires.find((o) => o.id === id) ??
    page.texts.find((o) => o.id === id) ??
    page.junctions.find((o) => o.id === id) ??
    page.potentials.find((o) => o.id === id) ??
    page.lines.find((o) => o.id === id)
  )
}

/** Stable digest of all world coordinates on a page; used to verify resize independence. */
export function geometryChecksum(page: CadPage): string {
  const parts: string[] = []
  for (const s of page.symbols) parts.push(`S${s.id}:${s.position.x},${s.position.y},${s.rotation}`)
  for (const w of page.wires) parts.push(`W${w.id}:${w.points.map((p) => `${p.x},${p.y}`).join(';')}`)
  for (const j of page.junctions) parts.push(`J${j.id}:${j.position.x},${j.position.y}`)
  for (const t of page.texts) parts.push(`T${t.id}:${t.position.x},${t.position.y}`)
  for (const p of page.potentials) parts.push(`P${p.id}:${p.y},${p.x1},${p.x2}`)
  for (const l of page.lines) parts.push(`L${l.id}:${l.points.map((p) => `${p.x},${p.y}`).join(';')}`)
  let h = 2166136261
  const str = parts.join('|')
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
