import type { Point } from '@/types/cad'

export function wireSegmentHandles(points: readonly Point[]) {
  return points.slice(0, -1).flatMap((a, index) => {
    const b = points[index + 1]
    if ((a.x === b.x && a.y === b.y) || (a.x !== b.x && a.y !== b.y)) return []
    return [{ index, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, horizontal: a.y === b.y }]
  })
}
