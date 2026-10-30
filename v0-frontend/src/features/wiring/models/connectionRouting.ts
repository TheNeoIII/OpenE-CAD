import type { CadPortEdge, Point } from '@/types/cad'

/** 5 mm in document units, independent of viewport zoom. */
export const CONNECTION_LEAD = 50
const equal = (a: Point, b: Point) => a.x === b.x && a.y === b.y
const horizontal = (edge: CadPortEdge) => edge === 'left' || edge === 'right'
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

export function routeConnection(a: Point, b: Point, startEdge?: CadPortEdge, endEdge?: CadPortEdge, manual?: readonly Point[]): Point[] {
  const start = lead(a, startEdge)
  const end = lead(b, endEdge)
  let middle: Point[]
  if (manual?.length) {
    middle = [start]
    for (const point of [...manual, end]) {
      middle.push(...orthogonalRoute(middle.at(-1)!, point, middle.length === 1 && startEdge && horizontal(startEdge) ? 'VH' : 'HV').slice(1))
    }
  } else if (startEdge && endEdge && horizontal(startEdge) === horizontal(endEdge)) {
    if (horizontal(startEdge)) {
      const y = start.y === end.y ? start.y + CONNECTION_LEAD : (start.y + end.y) / 2
      middle = [start, { x: start.x, y }, { x: end.x, y }, end]
    } else {
      const x = start.x === end.x ? start.x + CONNECTION_LEAD : (start.x + end.x) / 2
      middle = [start, { x, y: start.y }, { x, y: end.y }, end]
    }
  } else {
    const mode = startEdge ? (horizontal(startEdge) ? 'VH' : 'HV') : endEdge && !horizontal(endEdge) ? 'VH' : 'HV'
    middle = orthogonalRoute(start, end, mode)
  }
  return normalizeOrthogonalPoints([a, ...middle, b])
}

/** Boundary segments gain doglegs so both endpoint positions remain unchanged. */
export function moveConnectionSegment(points: readonly Point[], index: number, at: Point): Point[] {
  if (!Number.isInteger(index) || index < 0 || index >= points.length - 1) return points.map((p) => ({ ...p }))
  const next = points.map((p) => ({ ...p }))
  const a = next[index]
  const b = next[index + 1]
  if (a.x === b.x) a.x = b.x = at.x
  else if (a.y === b.y) a.y = b.y = at.y
  else throw new Error('Diagonal connection segment')
  if (index === 0) next.unshift({ ...points[0] })
  if (index === points.length - 2) next.push({ ...points.at(-1)! })
  return normalizeOrthogonalPoints(next)
}
