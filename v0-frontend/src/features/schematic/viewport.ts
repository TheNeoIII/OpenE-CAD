import { getActivePage } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useViewportStore } from '@/stores/viewportStore'
import { PAGE_FORMATS, type CadViewportState, type Point, type Rect } from '@/types/cad'
import { BASE_SCALE, clampZoom, fitRect, screenToWorld } from '@/features/drawing/viewport'
import { findObject, objectBounds, unionRects } from './models/geometry'

export { fitRect, scaleOf, screenToWorld, worldToScreen } from '@/features/drawing/viewport'

function ctx() {
  const page = getActivePage()
  const vs = useViewportStore.getState()
  if (!page || !vs.size.w) return null
  const view = vs.byPage[page.id] ?? { panX: 0, panY: 0, zoom: 1 }
  return { page, view, size: vs.size, set: (v: CadViewportState) => vs.setView(page.id, v) }
}

export function pageRect(format: keyof typeof PAGE_FORMATS): Rect {
  const f = PAGE_FORMATS[format]
  return { x: 0, y: 0, w: f.width, h: f.height }
}

export function zoomAt(factor: number, anchor?: Point) {
  const c = ctx()
  if (!c) return
  const a = anchor ?? { x: c.size.w / 2, y: c.size.h / 2 }
  const zoom = clampZoom(c.view.zoom * factor)
  const world = screenToWorld(c.view, a.x, a.y)
  const s = zoom * BASE_SCALE
  c.set({ zoom, panX: a.x - world.x * s, panY: a.y - world.y * s })
}

export function setZoom(zoom: number) {
  const c = ctx()
  if (c) zoomAt(zoom / c.view.zoom)
}

export function fitPage() {
  const c = ctx()
  if (c) c.set(fitRect(pageRect(c.page.format), c.size))
}

export function fitWidth() {
  const c = ctx()
  if (c) c.set(fitRect(pageRect(c.page.format), c.size, 24, 'width'))
}

export function fitSelection() {
  const c = ctx()
  if (!c) return
  const ids = useSelectionStore.getState().ids
  const rect = unionRects(ids.map((id) => findObject(c.page, id)).filter((o) => !!o).map((o) => objectBounds(o!)))
  if (!rect) return fitPage()
  const pad = 150
  const view = fitRect({ x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 }, c.size)
  c.set({ ...view, zoom: Math.min(view.zoom, 3) , ...(view.zoom > 3 ? fitAround(rect, c.size, 3) : {}) })
}

function fitAround(rect: Rect, size: { w: number; h: number }, zoom: number): CadViewportState {
  const s = zoom * BASE_SCALE
  return { zoom, panX: size.w / 2 - (rect.x + rect.w / 2) * s, panY: size.h / 2 - (rect.y + rect.h / 2) * s }
}

export function centerOn(rect: Rect) {
  const c = ctx()
  if (!c) return
  const zoom = Math.max(c.view.zoom, 0.9)
  c.set(fitAround(rect, c.size, zoom))
}

export function panBy(dx: number, dy: number) {
  const c = ctx()
  if (c) c.set({ ...c.view, panX: c.view.panX + dx, panY: c.view.panY + dy })
}
