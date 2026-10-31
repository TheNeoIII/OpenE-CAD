import type { CadDiagramBlock, CadPage, CadPort, CadPortEdge, CadPortLabelPlacement, Point, Rect } from '@/types/cad'

export type PortOwner = CadDiagramBlock
export const clampPortT = (t: number) => Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0
export const portOwnerBounds = (owner: PortOwner): Rect => ({ x: owner.x, y: owner.y, w: owner.width, h: owner.height })

export function portWorldPosition(bounds: Rect, port: Pick<CadPort, 'edge' | 't'>): Point {
  const t = clampPortT(port.t)
  switch (port.edge) {
    case 'top': return { x: bounds.x + bounds.w * t, y: bounds.y }
    case 'right': return { x: bounds.x + bounds.w, y: bounds.y + bounds.h * t }
    case 'bottom': return { x: bounds.x + bounds.w * t, y: bounds.y + bounds.h }
    case 'left': return { x: bounds.x, y: bounds.y + bounds.h * t }
  }
}

export function nearestPortAnchor(bounds: Rect, worldPoint: Point, grid?: number) {
  const edges: CadPortEdge[] = ['top', 'right', 'bottom', 'left']
  const candidates = edges.map((edge) => {
    const horizontal = edge === 'top' || edge === 'bottom'
    const length = horizontal ? bounds.w : bounds.h
    const t = clampPortT(length > 0 ? ((horizontal ? worldPoint.x - bounds.x : worldPoint.y - bounds.y) / length) : 0)
    return { edge, t, point: portWorldPosition(bounds, { edge, t }) }
  })
  const distance = ({ point }: typeof candidates[number]) => Math.hypot(point.x - worldPoint.x, point.y - worldPoint.y)
  const nearest = candidates.reduce((best, next) => distance(next) < distance(best) ? next : best)
  if (!grid || grid <= 0) return nearest
  const horizontal = nearest.edge === 'top' || nearest.edge === 'bottom'
  const length = horizontal ? bounds.w : bounds.h
  const coordinate = horizontal ? nearest.point.x : nearest.point.y
  const origin = horizontal ? bounds.x : bounds.y
  const t = clampPortT(length > 0 ? (Math.round(coordinate / grid) * grid - origin) / length : 0)
  return { edge: nearest.edge, t, point: portWorldPosition(bounds, { edge: nearest.edge, t }) }
}

export function selectedPortOwner(page: CadPage | null | undefined, ids: readonly string[]): PortOwner | undefined {
  return page?.kind === 'wiring' && ids.length === 1 ? page.diagramBlocks?.find((o) => o.id === ids[0]) : undefined
}

/**
 * Moves the dragged port to `anchor`; the other selected ports keep their spacing.
 * Ports on the dragged port's edge follow it (also onto a new edge); ports on other
 * edges shift along their own edge only while the dragged port stays on its edge.
 * The shift is clamped so no port of the group is squeezed against an edge end.
 */
export function movePortsOnPage(page: CadPage, objectId: string, portIds: readonly string[], draggedId: string, anchor: Pick<CadPort, 'edge' | 't'>): CadPage {
  const ports = page.diagramBlocks?.find((o) => o.id === objectId)?.ports ?? []
  const dragged = ports.find((p) => p.id === draggedId)
  if (!dragged) return page
  const sameEdge = anchor.edge === dragged.edge
  const moving = ports.filter((p) => p.id === draggedId || (portIds.includes(p.id) && (sameEdge || p.edge === dragged.edge)))
  if (moving.length === 1) return updatePortOnPage(page, objectId, draggedId, { edge: anchor.edge, t: anchor.t })
  const ts = moving.map((p) => clampPortT(p.t))
  const dt = Math.max(-Math.min(...ts), Math.min(1 - Math.max(...ts), clampPortT(anchor.t) - clampPortT(dragged.t)))
  return moving.reduce((next, port) => updatePortOnPage(next, objectId, port.id, {
    edge: port.edge === dragged.edge ? anchor.edge : port.edge,
    t: clampPortT(port.t) + dt,
  }), page)
}

export function updatePortOnPage(page: CadPage, objectId: string, portId: string, patch: Partial<CadPort>): CadPage {
  if (page.kind !== 'wiring') return page
  return { ...page, diagramBlocks: (page.diagramBlocks ?? []).map((owner) => owner.id !== objectId ? owner : {
    ...owner, ports: (owner.ports ?? []).map((port) => port.id !== portId ? port : { ...port, ...patch, id: port.id, t: clampPortT(patch.t ?? port.t) }),
  }) }
}

export const PORT_LABEL_SIZE = 24
const OUTSIDE: Record<CadPortEdge, Exclude<CadPortLabelPlacement, 'auto'>> = { top: 'top', right: 'right', bottom: 'bottom', left: 'left' }

export const resolvePortLabelSide = (port: Pick<CadPort, 'edge' | 'labelPlacement'>) =>
  !port.labelPlacement || port.labelPlacement === 'auto' ? OUTSIDE[port.edge] : port.labelPlacement

/** Single source of truth for port label position: render and inline editor use it. `s` = screen px per world unit. */
export function portLabelLayout(point: Point, port: Pick<CadPort, 'edge' | 'labelPlacement'>, s = 1) {
  const gap = 10 / s
  const side = resolvePortLabelSide(port)
  switch (side) {
    case 'left': return { side, x: point.x - gap, y: point.y, anchor: 'end' as const, baseline: 'middle' as const }
    case 'right': return { side, x: point.x + gap, y: point.y, anchor: 'start' as const, baseline: 'middle' as const }
    case 'top': return { side, x: point.x, y: point.y - gap, anchor: 'middle' as const, baseline: 'auto' as const }
    case 'bottom': return { side, x: point.x, y: point.y + gap, anchor: 'middle' as const, baseline: 'hanging' as const }
  }
}

export function wiringPortAnchors(page: CadPage) {
  if (page.kind !== 'wiring') return []
  return (page.diagramBlocks ?? []).flatMap((owner) => (owner.ports ?? []).map((port) => ({
    objectId: owner.id, portId: port.id, point: portWorldPosition(portOwnerBounds(owner), port),
  })))
}
