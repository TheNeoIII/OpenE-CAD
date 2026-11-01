import type { CadPage, Point, Rect } from '@/types/cad'
import { TEXT_LINE } from '@/features/drawing/geometry'
import { graphicBounds, graphicLabelPoint, shapeBox, wiringGraphics, type WiringShape } from './shapes'
import { connectionLabelPoint, resolveConnectionPolyline } from './connections'
import { BLOCK_FIELD_SIZE, BLOCK_PADDING, BLOCK_TITLE_SIZE, LABEL_SIZE, blockFieldBaseline, blockTitleBaseline } from './inlineEdit'
import { PORT_LABEL_SIZE, portLabelLayout, wiringPortAnchors } from './ports'

export type WiringHitKind = 'port' | 'label' | 'stroke' | 'boundary' | 'interior'
export interface WiringHit { id: string; type: string; kind: WiringHitKind }
export const HIT_TOLERANCE_PX = 6
export const CYCLE_TOLERANCE_PX = 4

export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}
const inBox = (p: Point, b: Rect, tolerance = 0) => p.x >= b.x - tolerance && p.x <= b.x + b.w + tolerance && p.y >= b.y - tolerance && p.y <= b.y + b.h + tolerance

export function shapeInteriorHit(shape: WiringShape, p: Point): boolean {
  if (shape.type === 'ellipse') return shape.rx > 0 && shape.ry > 0 && ((p.x - shape.cx) / shape.rx) ** 2 + ((p.y - shape.cy) / shape.ry) ** 2 <= 1
  const b = shapeBox(shape)
  if (!inBox(p, b)) return false
  const radius = shape.type === 'rectangle' ? Math.min(shape.cornerRadius ?? 0, b.w / 2, b.h / 2) : 0
  const x = Math.max(b.x + radius, Math.min(b.x + b.w - radius, p.x))
  const y = Math.max(b.y + radius, Math.min(b.y + b.h - radius, p.y))
  return Math.hypot(p.x - x, p.y - y) <= radius
}

export function shapeBoundaryHit(shape: WiringShape, p: Point, tolerance: number): boolean {
  const b = shapeBox(shape)
  if (!inBox(p, b, tolerance)) return false
  if (shape.type !== 'ellipse') {
    const radius = shape.type === 'rectangle' ? Math.min(shape.cornerRadius ?? 0, b.w / 2, b.h / 2) : 0
    const qx = Math.abs(p.x - b.x - b.w / 2) - (b.w / 2 - radius)
    const qy = Math.abs(p.y - b.y - b.h / 2) - (b.h / 2 - radius)
    const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
    return Math.abs(distance) <= tolerance
  }
  if (shape.rx <= 0 || shape.ry <= 0) return false
  // Minimise Euclidean distance, not radial distance (which fails on elongated ellipses).
  const x = Math.abs(p.x - shape.cx), y = Math.abs(p.y - shape.cy)
  const distance = (angle: number) => Math.hypot(shape.rx * Math.cos(angle) - x, shape.ry * Math.sin(angle) - y)
  const step = Math.PI / 64
  let best = 0
  for (let i = 1; i <= 32; i++) if (distance(i * step) < distance(best * step)) best = i
  let lo = Math.max(0, (best - 1) * step), hi = Math.min(Math.PI / 2, (best + 1) * step)
  for (let i = 0; i < 32; i++) {
    const a = lo + (hi - lo) / 3, c = hi - (hi - lo) / 3
    if (distance(a) < distance(c)) hi = c
    else lo = a
  }
  return Math.min(distance(0), distance(Math.PI / 2), distance((lo + hi) / 2)) <= tolerance
}

function textHit(p: Point, text: string | undefined, at: Point, size: number, anchor: 'start' | 'middle' | 'end', middle = false): boolean {
  if (!text) return false
  return text.split('\n').some((line, i) => {
    const w = line.length * size * 0.6
    return !!line.trim() && inBox(p, { x: at.x - (anchor === 'middle' ? w / 2 : anchor === 'end' ? w : 0), y: at.y - (middle ? size / 2 : size) + i * size * TEXT_LINE, w, h: size * 1.2 })
  })
}

/** All objects remain reachable. Explicit DOM handles are dispatched before this stack. */
export function wiringHitStack(page: CadPage, p: Point, scale: number): WiringHit[] {
  if (page.kind !== 'wiring' || !(scale > 0)) return []
  const tolerance = HIT_TOLERANCE_PX / scale
  const hits: WiringHit[] = []
  const graphics = wiringGraphics(page)
  const objects = [...graphics.filter((o) => o.type !== 'line' && o.type !== 'text'), ...(page.connections ?? []), ...graphics.filter((o) => o.type === 'line' || o.type === 'text')]
  for (const o of objects) {
    let kind: WiringHitKind | undefined
    if (o.type === 'line' || o.type === 'connection') {
      const points = o.type === 'line' ? o.points : resolveConnectionPolyline(page, o)
      const center = o.type === 'line' ? graphicLabelPoint(o) : connectionLabelPoint(page, o)
      if (center && textHit(p, o.label, center, LABEL_SIZE, 'middle', true)) kind = 'label'
      else if (points.some((a, i) => pointToSegmentDistance(p, a, points[Math.max(0, i - 1)]) <= tolerance + (o.strokeWidth ?? 2.5) / 2)) kind = 'stroke'
    } else if (o.type === 'text') {
      if (textHit(p, o.text, o.position, o.size, o.anchor)) kind = 'label'
    } else if (o.type === 'image') {
      if (inBox(p, graphicBounds(o))) kind = 'interior'
    } else {
      if (o.type === 'diagramBlock') {
        const clip = { x: o.x + 8, y: o.y + 8, w: Math.max(0, o.width - 16), h: Math.max(0, o.height - 16) }
        if (inBox(p, clip) && (textHit(p, o.title, { x: o.x + BLOCK_PADDING, y: blockTitleBaseline(o.y) }, BLOCK_TITLE_SIZE, 'start') || (o.fields ?? []).filter((f) => f.visible !== false).some((f, i) => textHit(p, `${f.label ? f.label + ': ' : ''}${f.value}`, { x: o.x + BLOCK_PADDING, y: blockFieldBaseline(o.y, i) }, BLOCK_FIELD_SIZE, 'start')))) kind = 'label'
      } else if (textHit(p, o.label, graphicLabelPoint(o), LABEL_SIZE, 'middle', true)) kind = 'label'
      if (!kind && shapeBoundaryHit(o, p, tolerance + o.strokeWidth / 2)) kind = 'boundary'
      if (!kind && shapeInteriorHit(o, p)) kind = 'interior'
    }
    if (kind) hits.unshift({ id: o.id, type: o.type, kind })
  }
  for (const anchor of wiringPortAnchors(page)) {
    const owner = page.diagramBlocks?.find((o) => o.id === anchor.objectId)
    const port = owner?.ports?.find((o) => o.id === anchor.portId)
    if (!port) continue
    const layout = portLabelLayout(anchor.point, port, scale)
    const labelPoint = { x: layout.x, y: layout.y + (layout.baseline === 'hanging' ? PORT_LABEL_SIZE : 0) }
    if (Math.hypot(p.x - anchor.point.x, p.y - anchor.point.y) <= 8 / scale) hits.unshift({ id: anchor.objectId, type: 'diagramBlock', kind: 'port' })
    else if (textHit(p, port.label, labelPoint, PORT_LABEL_SIZE, layout.anchor, layout.baseline === 'middle')) hits.unshift({ id: anchor.objectId, type: 'diagramBlock', kind: 'label' })
  }
  const priority = { port: 0, label: 1, stroke: 2, boundary: 2, interior: 3 }
  const seen = new Set<string>()
  return hits.sort((a, b) => priority[a.kind] - priority[b.kind]).filter((hit) => {
    if (seen.has(hit.id)) return false
    seen.add(hit.id)
    return true
  })
}

export interface HitCycle { screen: Point; context: string; candidates: string; index: number }
export function cycleWiringHit(previous: HitCycle | null, hits: readonly WiringHit[], screen: Point, context: string): { hit: WiringHit | undefined; cycle: HitCycle | null } {
  if (!hits.length) return { hit: undefined, cycle: null }
  const candidates = JSON.stringify(hits.map((hit) => [hit.id, hit.kind]))
  const repeat = previous && previous.context === context && previous.candidates === candidates && Math.hypot(previous.screen.x - screen.x, previous.screen.y - screen.y) <= CYCLE_TOLERANCE_PX
  const index = repeat ? (previous.index + 1) % hits.length : 0
  return { hit: hits[index], cycle: { screen, context, candidates, index } }
}
