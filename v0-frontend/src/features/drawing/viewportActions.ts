import { getActivePage } from '@/stores/documentStore'
import { useViewportStore } from '@/stores/viewportStore'
import { pageSizeOf, type CadPage, type CadViewportState, type Point, type Rect } from '@/types/cad'
import { BASE_SCALE, clampZoom, fitRect, screenToWorld } from './viewport'

/** Viewport of the active page, shared by every page editor (schematic, wiring, …). */
export function activeViewport() {
  const page = getActivePage()
  const vs = useViewportStore.getState()
  if (!page || !vs.size.w) return null
  const view = vs.byPage[page.id] ?? { panX: 0, panY: 0, zoom: 1 }
  return { page, view, size: vs.size, set: (v: CadViewportState) => vs.setView(page.id, v) }
}

export function pageRect(page: Pick<CadPage, 'format' | 'customSize'>): Rect {
  const f = pageSizeOf(page)
  return { x: 0, y: 0, w: f.width, h: f.height }
}

export function zoomAt(factor: number, anchor?: Point) {
  const c = activeViewport()
  if (!c) return
  const a = anchor ?? { x: c.size.w / 2, y: c.size.h / 2 }
  const zoom = clampZoom(c.view.zoom * factor)
  const world = screenToWorld(c.view, a.x, a.y)
  const s = zoom * BASE_SCALE
  c.set({ zoom, panX: a.x - world.x * s, panY: a.y - world.y * s })
}

export function setZoom(zoom: number) {
  const c = activeViewport()
  if (c) zoomAt(zoom / c.view.zoom)
}

export function fitPage() {
  const c = activeViewport()
  if (c) c.set(fitRect(pageRect(c.page), c.size))
}

export function fitWidth() {
  const c = activeViewport()
  if (c) c.set(fitRect(pageRect(c.page), c.size, 24, 'width'))
}

export function fitAround(rect: Rect, size: { w: number; h: number }, zoom: number): CadViewportState {
  const s = zoom * BASE_SCALE
  return { zoom, panX: size.w / 2 - (rect.x + rect.w / 2) * s, panY: size.h / 2 - (rect.y + rect.h / 2) * s }
}

export function panBy(dx: number, dy: number) {
  const c = activeViewport()
  if (c) c.set({ ...c.view, panX: c.view.panX + dx, panY: c.view.panY + dy })
}
