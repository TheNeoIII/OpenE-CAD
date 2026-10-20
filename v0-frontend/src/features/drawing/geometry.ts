import type { Point, Rect } from '@/types/cad'

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

export function rectContains(outer: Rect, inner: Rect) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h
}

export function normalizeRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
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

export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy }
}

/** Line height factor of multi-line texts, relative to the font size. */
export const TEXT_LINE = 1.25

/** Constrains `to` to the nearest 45° direction from `from` (Shift while drawing graphical lines). */
export function constrain45(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const step = Math.PI / 4
  const a = Math.round(Math.atan2(dy, dx) / step) * step
  const len = Math.hypot(dx, dy)
  return { x: Math.round(from.x + Math.cos(a) * len), y: Math.round(from.y + Math.sin(a) * len) }
}

export const polylinePath = (pts: Point[]) => 'M' + pts.map((p) => `${p.x} ${p.y}`).join(' L')
