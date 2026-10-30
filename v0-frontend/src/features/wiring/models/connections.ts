import { pageConnections, type CadConnection, type CadConnectionEndpoint, type CadPage, type Point, type Rect } from '@/types/cad'
import { pointOnSegment, pointsBounds } from '@/features/drawing/geometry'
import { portOwnerBounds, portWorldPosition, wiringPortAnchors } from './ports'
import { orthogonalRoute, routeConnection } from './connectionRouting'
import { resolveShapeAnchor, shapeEndpointAt } from './shapeBinding'

function boundPort(page: CadPage, endpoint: CadConnectionEndpoint) {
  if (page.kind !== 'wiring' || endpoint.kind !== 'port') return null
  const owner = page.diagramBlocks?.find((o) => o.id === endpoint.objectId)
  const port = owner?.ports?.find((p) => p.id === endpoint.portId)
  return owner && port ? { owner, port } : null
}

export function resolveConnectionEndpoint(page: CadPage, endpoint: CadConnectionEndpoint): Point | null {
  if (page.kind !== 'wiring') return null
  if (endpoint.kind === 'point') return { ...endpoint.point }
  if (endpoint.kind === 'shape') return resolveShapeAnchor(page, endpoint.objectId, endpoint.anchor)?.point ?? null
  const bound = boundPort(page, endpoint)
  return bound ? portWorldPosition(portOwnerBounds(bound.owner), bound.port) : null
}

export function resolveConnectionPolyline(page: CadPage, connection: CadConnection): Point[] {
  if (page.kind !== 'wiring') return []
  const a = resolveConnectionEndpoint(page, connection.start)
  const b = resolveConnectionEndpoint(page, connection.end)
  if (a && b) {
    const geometry = (endpoint: CadConnectionEndpoint) => {
      if (endpoint.kind === 'shape') return resolveShapeAnchor(page, endpoint.objectId, endpoint.anchor)
      const port = boundPort(page, endpoint)
      return port ? { bounds: portOwnerBounds(port.owner), edge: port.port.edge } : null
    }
    const start = geometry(connection.start), end = geometry(connection.end)
    const owners = [start, end].flatMap((bound) => bound ? [bound.bounds] : [])
    return routeConnection(a, b, start?.edge, end?.edge, connection.routePoints, owners)
  }
  // Unresolved references remain references. Only known points can form a warning route.
  const known = [...(a ? [a] : []), ...(connection.routePoints ?? []), ...(b ? [b] : [])]
  return known.reduce<Point[]>((result, p) => result.length ? [...result, ...orthogonalRoute(result.at(-1)!, p).slice(1)] : [{ ...p }], [])
}

export function connectionBounds(page: CadPage, connection: CadConnection): Rect | null {
  const points = resolveConnectionPolyline(page, connection)
  return points.length ? pointsBounds(points) : null
}

export function connectionHitTest(page: CadPage, connection: CadConnection, point: Point, tolerance: number): boolean {
  const points = resolveConnectionPolyline(page, connection)
  return points.length === 1 ? Math.hypot(point.x - points[0].x, point.y - points[0].y) <= tolerance : points.some((p, i) => i > 0 && pointOnSegment(point, points[i - 1], p, tolerance))
}

export function connectionLabelPoint(page: CadPage, connection: CadConnection): Point | null {
  const points = resolveConnectionPolyline(page, connection)
  const lengths = points.slice(1).map((p, i) => Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y))
  let remaining = lengths.reduce((sum, n) => sum + n, 0) / 2
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = remaining / lengths[i]
      return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t }
    }
    remaining -= lengths[i]
  }
  return points[0] ?? null
}

/** Port binding is separate from geometric snapping used by CadLine. */
export function connectionEndpointAt(page: CadPage, raw: Point, fallback: Point, tolerance: number, disabled = false): CadConnectionEndpoint {
  if (!disabled) {
    const anchors = wiringPortAnchors(page)
    let best: typeof anchors[number] | undefined
    let distance = tolerance
    for (const anchor of anchors) {
      const next = Math.hypot(anchor.point.x - raw.x, anchor.point.y - raw.y)
      if (next <= distance) { best = anchor; distance = next }
    }
    if (best) return { kind: 'port', objectId: best.objectId, portId: best.portId }
    const shape = shapeEndpointAt(page, raw, tolerance)
    if (shape) return shape
  }
  return { kind: 'point', point: { ...fallback } }
}

/** Called before deletion, inside the same document/history transaction. */
export function detachConnectionEndpoints(page: CadPage, removed: (endpoint: Exclude<CadConnectionEndpoint, { kind: 'point' }>) => boolean): CadPage {
  if (page.kind !== 'wiring' || !page.connections?.length) return page
  const detach = (endpoint: CadConnectionEndpoint): CadConnectionEndpoint => {
    if (endpoint.kind === 'point' || !removed(endpoint)) return endpoint
    const point = resolveConnectionEndpoint(page, endpoint)
    return point ? { kind: 'point', point } : endpoint
  }
  return { ...page, connections: pageConnections(page).map((c) => ({ ...c, start: detach(c.start), end: detach(c.end) })) }
}

export function endpointDescription(page: CadPage, endpoint: CadConnectionEndpoint): string {
  if (endpoint.kind === 'point') return `Freier Punkt (${endpoint.point.x / 10} / ${endpoint.point.y / 10} mm)`
  if (endpoint.kind === 'shape') {
    const bound = resolveShapeAnchor(page, endpoint.objectId, endpoint.anchor)
    return bound ? `Objektkante: ${bound.owner.type === 'diagramBlock' ? bound.owner.title : bound.owner.label || bound.owner.id}` : `Nicht auflösbar: ${endpoint.objectId}`
  }
  const bound = boundPort(page, endpoint)
  return bound ? `${bound.owner.title} / ${bound.port.label || bound.port.id}` : `Nicht auflösbar: ${endpoint.objectId} / ${endpoint.portId}`
}
