import type { CadDiagramBlock, CadPage, CadPort, CadPortEdge, Point, Rect } from '@/types/cad'

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

export function nearestPortAnchor(bounds: Rect, worldPoint: Point) {
  const edges: CadPortEdge[] = ['top', 'right', 'bottom', 'left']
  const candidates = edges.map((edge) => {
    const horizontal = edge === 'top' || edge === 'bottom'
    const length = horizontal ? bounds.w : bounds.h
    const t = clampPortT(length > 0 ? ((horizontal ? worldPoint.x - bounds.x : worldPoint.y - bounds.y) / length) : 0)
    return { edge, t, point: portWorldPosition(bounds, { edge, t }) }
  })
  const distance = ({ point }: typeof candidates[number]) => Math.hypot(point.x - worldPoint.x, point.y - worldPoint.y)
  return candidates.reduce((best, next) => distance(next) < distance(best) ? next : best)
}

export function selectedPortOwner(page: CadPage | null | undefined, ids: readonly string[]): PortOwner | undefined {
  return page?.kind === 'wiring' && ids.length === 1 ? page.diagramBlocks?.find((o) => o.id === ids[0]) : undefined
}

export function updatePortOnPage(page: CadPage, objectId: string, portId: string, patch: Partial<CadPort>): CadPage {
  if (page.kind !== 'wiring') return page
  return { ...page, diagramBlocks: (page.diagramBlocks ?? []).map((owner) => owner.id !== objectId ? owner : {
    ...owner, ports: (owner.ports ?? []).map((port) => port.id !== portId ? port : { ...port, ...patch, id: port.id, t: clampPortT(patch.t ?? port.t) }),
  }) }
}

export function wiringPortAnchors(page: CadPage) {
  if (page.kind !== 'wiring') return []
  return (page.diagramBlocks ?? []).flatMap((owner) => (owner.ports ?? []).map((port) => ({
    objectId: owner.id, portId: port.id, point: portWorldPosition(portOwnerBounds(owner), port),
  })))
}
