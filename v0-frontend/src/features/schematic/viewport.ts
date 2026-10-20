import { useSelectionStore } from '@/stores/selectionStore'
import type { Rect } from '@/types/cad'
import { fitRect } from '@/features/drawing/viewport'
import { activeViewport, fitAround, fitPage } from '@/features/drawing/viewportActions'
import { findObject, objectBounds, unionRects } from './models/geometry'

export { fitRect, scaleOf, screenToWorld, worldToScreen } from '@/features/drawing/viewport'
export { fitPage, fitWidth, pageRect, panBy, setZoom, zoomAt } from '@/features/drawing/viewportActions'

export function fitSelection() {
  const c = activeViewport()
  if (!c) return
  const ids = useSelectionStore.getState().ids
  const rect = unionRects(ids.map((id) => findObject(c.page, id)).filter((o) => !!o).map((o) => objectBounds(o!)))
  if (!rect) return fitPage()
  const pad = 150
  const view = fitRect({ x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 }, c.size)
  c.set({ ...view, zoom: Math.min(view.zoom, 3), ...(view.zoom > 3 ? fitAround(rect, c.size, 3) : {}) })
}

export function centerOn(rect: Rect) {
  const c = activeViewport()
  if (!c) return
  const zoom = Math.max(c.view.zoom, 0.9)
  c.set(fitAround(rect, c.size, zoom))
}
