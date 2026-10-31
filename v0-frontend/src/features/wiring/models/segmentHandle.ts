import type { Point } from '@/types/cad'

/** Keep the short-segment grip clear of endpoint circles at every zoom level. */
export function connectionSegmentHandle(a: Point, b: Point, scale: number) {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1
  const short = Math.hypot(b.x - a.x, b.y - a.y) * s < 28
  const offset = short ? (a.x === b.x ? { x: 18 / s, y: 0 } : { x: 0, y: -18 / s }) : { x: 0, y: 0 }
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return { midpoint, offset, position: { x: midpoint.x + offset.x, y: midpoint.y + offset.y } }
}
