import type { CadPortEdge, Point, Rect } from '@/types/cad'

/** 5 mm in document units, independent of viewport zoom. */
export const CONNECTION_LEAD = 50
const equal = (a: Point, b: Point) => a.x === b.x && a.y === b.y
const normals: Record<CadPortEdge, Point> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } }

export function normalizeOrthogonalPoints(points: readonly Point[]): Point[] {
  const result: Point[] = []
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Non-finite connection coordinate')
    const last = result.at(-1)
    if (last && equal(last, point)) continue
    if (last && last.x !== point.x && last.y !== point.y) throw new Error('Diagonal connection segment')
    result.push({ ...point })
    while (result.length >= 3) {
      const [a, b, c] = result.slice(-3)
      const between = (b.x - a.x) * (c.x - b.x) >= 0 && (b.y - a.y) * (c.y - b.y) >= 0
      if (!between || !((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y))) break
      result.splice(result.length - 2, 1)
    }
  }
  return result
}

export function orthogonalRoute(a: Point, b: Point, mode: 'HV' | 'VH' = 'HV'): Point[] {
  return normalizeOrthogonalPoints([a, mode === 'HV' ? { x: b.x, y: a.y } : { x: a.x, y: b.y }, b])
}

function lead(point: Point, edge?: CadPortEdge): Point {
  return edge ? { x: point.x + normals[edge].x * CONNECTION_LEAD, y: point.y + normals[edge].y * CONNECTION_LEAD } : point
}

export function hasRouteDegeneracy(points: readonly Point[]): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || equal(a, b) || (a.x !== b.x && a.y !== b.y)) return true
    if (i > 1) {
      const previous = points[i - 2]
      if ((a.x - previous.x) * (b.x - a.x) + (a.y - previous.y) * (b.y - a.y) < 0) return true
    }
    for (let j = 1; j < i - 1; j++) {
      const c = points[j - 1], d = points[j]
      if (Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
          Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))) return true
    }
  }
  return points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
}

export type RoutingOwner = Rect & { ellipse?: boolean }

export function routeCrossesOwner(points: readonly Point[], bounds: RoutingOwner): boolean {
  return points.slice(1).some((b, index) => {
    const a = points[index]
    if (bounds.ellipse) {
      const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2
      const x = Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), cx))
      const y = Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), cy))
      return ((x - cx) / (bounds.w / 2)) ** 2 + ((y - cy) / (bounds.h / 2)) ** 2 < 1 - 1e-9
    }
    return a.x === b.x
      ? a.x > bounds.x && a.x < bounds.x + bounds.w && Math.max(a.y, b.y) > bounds.y && Math.min(a.y, b.y) < bounds.y + bounds.h
      : a.y > bounds.y && a.y < bounds.y + bounds.h && Math.max(a.x, b.x) > bounds.x && Math.min(a.x, b.x) < bounds.x + bounds.w
  })
}

export function routeConnection(a: Point, b: Point, startEdge?: CadPortEdge, endEdge?: CadPortEdge, manual?: readonly Point[], owners: readonly RoutingOwner[] = []): Point[] {
  const start = lead(a, startEdge), end = lead(b, endEdge)
  const outward = (origin: Point, next: Point, edge?: CadPortEdge) => !edge || (next.x - origin.x) * normals[edge].x + (next.y - origin.y) * normals[edge].y > 0
  const valid = (points: Point[]) => points.length >= 2 && !hasRouteDegeneracy(points) && outward(a, points[1], startEdge) && outward(b, points.at(-2)!, endEdge) && !owners.some((owner) => routeCrossesOwner(points, owner))
  if (manual?.length) {
    const points = [a]
    for (const point of [...manual, b]) points.push(...orthogonalRoute(points.at(-1)!, point).slice(1))
    const normalized = normalizeOrthogonalPoints(points)
    if (valid(normalized)) return normalized
  }
  const xs = [start.x, end.x, (start.x + end.x) / 2, Math.min(a.x, b.x, ...owners.map((o) => o.x)) - CONNECTION_LEAD * 2, Math.max(a.x, b.x, ...owners.map((o) => o.x + o.w)) + CONNECTION_LEAD * 2]
  const ys = [start.y, end.y, (start.y + end.y) / 2, Math.min(a.y, b.y, ...owners.map((o) => o.y)) - CONNECTION_LEAD * 2, Math.max(a.y, b.y, ...owners.map((o) => o.y + o.h)) + CONNECTION_LEAD * 2]
  const candidates: Point[][] = [orthogonalRoute(start, end), orthogonalRoute(start, end, 'VH')]
  for (const x of xs) candidates.push([start, { x, y: start.y }, { x, y: end.y }, end])
  for (const y of ys) candidates.push([start, { x: start.x, y }, { x: end.x, y }, end])
  for (const x of xs) for (const y of ys) {
    candidates.push([start, { x, y: start.y }, { x, y }, { x: end.x, y }, end])
    candidates.push([start, { x: start.x, y }, { x, y }, { x, y: end.y }, end])
  }
  const routes = candidates.map((middle) => normalizeOrthogonalPoints([a, ...middle, b])).filter(valid)
  const length = (points: Point[]) => points.slice(1).reduce((sum, p, i) => sum + Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y), 0)
  routes.sort((left, right) => length(left) - length(right) || left.length - right.length)
  // Overlapping owners or coincident endpoints can make an outward route impossible.
  return routes[0] ?? orthogonalRoute(a, b)
}

/** Boundary segments gain doglegs so both endpoint positions remain unchanged. */
export function moveConnectionSegment(points: readonly Point[], index: number, at: Point, startBound = false, endBound = false): Point[] {
  if (!Number.isInteger(index) || index < 0 || index >= points.length - 1) return points.map((p) => ({ ...p }))
  const next = points.map((p) => ({ ...p }))
  const a = next[index]
  const b = next[index + 1]
  if (a.x === b.x) a.x = b.x = at.x
  else if (a.y === b.y) a.y = b.y = at.y
  else throw new Error('Diagonal connection segment')
  const originalA = points[index], originalB = points[index + 1]
  if (equal(a, originalA) && equal(b, originalB)) return points.map((p) => ({ ...p }))
  const length = Math.abs(originalB.x - originalA.x) + Math.abs(originalB.y - originalA.y)
  const fraction = Math.min(CONNECTION_LEAD, length / 3) / length
  const stub = (origin: Point, toward: Point): Point => ({ x: origin.x + (toward.x - origin.x) * fraction, y: origin.y + (toward.y - origin.y) * fraction })
  if (index === 0) {
    if (startBound) {
      const outward = stub(originalA, originalB)
      if (originalA.x === originalB.x) a.y = outward.y
      else a.x = outward.x
      next.unshift({ ...originalA }, outward)
    } else next.unshift({ ...originalA })
  }
  if (index === points.length - 2) {
    if (endBound) {
      const outward = stub(originalB, originalA)
      if (originalA.x === originalB.x) b.y = outward.y
      else b.x = outward.x
      next.push(outward, { ...originalB })
    } else next.push({ ...originalB })
  }
  const normalized = normalizeOrthogonalPoints(next)
  return hasRouteDegeneracy(normalized) ? points.map((p) => ({ ...p })) : normalized
}
