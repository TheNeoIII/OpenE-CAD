import type { CadPage, CadPortEdge, Point, ShapeAnchor } from '@/types/cad'
import { nearestPortAnchor, portWorldPosition } from './ports'
import { findShape, shapeBox, type WiringShape } from './shapes'

export function shapeAnchorAt(shape: WiringShape, point: Point): ShapeAnchor {
  if (shape.type !== 'ellipse') {
    const { edge, t } = nearestPortAnchor(shapeBox(shape), point)
    return { kind: 'edge', edge, t }
  }
  const angle = Math.atan2((point.y - shape.cy) / shape.ry, (point.x - shape.cx) / shape.rx)
  return { kind: 'ellipse', angle: (angle / (2 * Math.PI) + 1) % 1 }
}

export function resolveShapeAnchor(page: CadPage, objectId: string, anchor: ShapeAnchor) {
  if (page.kind !== 'wiring') return null
  const owner = findShape(page, objectId)
  if (!owner) return null
  const bounds = shapeBox(owner)
  if (anchor.kind === 'edge' && owner.type !== 'ellipse') {
    return { owner, bounds, edge: anchor.edge, point: portWorldPosition(bounds, anchor) }
  }
  if (anchor.kind !== 'ellipse' || owner.type !== 'ellipse' || !Number.isFinite(anchor.angle) || owner.rx <= 0 || owner.ry <= 0) return null
  const theta = anchor.angle * Math.PI * 2
  const dx = Math.cos(theta), dy = Math.sin(theta)
  const edge: CadPortEdge = Math.abs(dx / owner.rx) >= Math.abs(dy / owner.ry) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'bottom' : 'top')
  return { owner, bounds: { ...bounds, ellipse: true }, edge, point: { x: owner.cx + owner.rx * dx, y: owner.cy + owner.ry * dy } }
}

export function shapeEndpointAt(page: CadPage, raw: Point, tolerance: number) {
  if (page.kind !== 'wiring') return null
  let best: { kind: 'shape'; objectId: string; anchor: ShapeAnchor } | null = null
  let distance = tolerance
  for (const owner of [...(page.rectangles ?? []), ...(page.ellipses ?? []), ...(page.diagramBlocks ?? [])]) {
    const anchor = shapeAnchorAt(owner, raw)
    const resolved = resolveShapeAnchor(page, owner.id, anchor)
    if (!resolved) continue
    const next = Math.hypot(resolved.point.x - raw.x, resolved.point.y - raw.y)
    if (next <= distance) {
      best = { kind: 'shape', objectId: owner.id, anchor }
      distance = next
    }
  }
  return best
}
