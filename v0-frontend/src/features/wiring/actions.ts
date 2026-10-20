import { useDocumentStore } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { pageShapes, type CadEllipse, type CadImage, type CadLine, type CadPage, type CadRectangle, type CadShapeStyle, type CadText, type LineStyle, type Point, type Rect } from '@/types/cad'
import { samePoint } from '@/features/drawing/geometry'
import { uid } from '@/utils/format'
import { creationBounds, findShape, resizeShapeOnPage, translateGraphics } from './models/shapes'

export const DEFAULT_SHAPE_STYLE: CadShapeStyle = { stroke: '#1f2937', strokeWidth: 3, lineStyle: 'solid', fill: 'none' }

type Shape = CadRectangle | CadEllipse | CadImage

/** Every wiring action is exactly one commit = one undo step. */
function withActivePage(label: string, fn: (p: CadPage) => CadPage) {
  const store = useDocumentStore.getState()
  const pageId = store.activePageId
  if (activePage()?.kind !== 'wiring') return
  store.commit(label, (d) => ({ ...d, pages: d.pages.map((p) => (p.id === pageId ? fn(p) : p)) }))
}

function activePage() {
  const st = useDocumentStore.getState()
  return st.document?.pages.find((p) => p.id === st.activePageId)
}

function cornerRect(a: Point, b: Point) {
  const r = creationBounds(a, b)
  return r ? { x: r.x, y: r.y, width: r.w, height: r.h } : null
}

export function addRectangle(a: Point, b: Point) {
  const r = cornerRect(a, b)
  if (!r || activePage()?.kind !== 'wiring') return
  const shape: CadRectangle = { id: uid('rect'), type: 'rectangle', ...r, ...DEFAULT_SHAPE_STYLE }
  withActivePage('Rechteck gezeichnet', (p) => ({ ...p, rectangles: [...pageShapes(p).rectangles, shape] }))
  useSelectionStore.getState().set([shape.id])
}

export function addEllipse(a: Point, b: Point) {
  const r = cornerRect(a, b)
  if (!r || activePage()?.kind !== 'wiring') return
  const shape: CadEllipse = { id: uid('ell'), type: 'ellipse', cx: r.x + r.width / 2, cy: r.y + r.height / 2, rx: r.width / 2, ry: r.height / 2, ...DEFAULT_SHAPE_STYLE }
  withActivePage('Ellipse gezeichnet', (p) => ({ ...p, ellipses: [...pageShapes(p).ellipses, shape] }))
  useSelectionStore.getState().set([shape.id])
}

/** Commits a graphic polyline exactly as given (consecutive duplicates removed). */
export function addPolyline(points: Point[], style: LineStyle = 'solid') {
  const pts = points.filter((p, i) => i === 0 || !samePoint(p, points[i - 1]))
  if (pts.length < 2 || activePage()?.kind !== 'wiring') return
  const line: CadLine = { id: uid('ln'), type: 'line', points: pts, style }
  withActivePage('Linie gezeichnet', (p) => ({ ...p, lines: [...p.lines, line] }))
  useSelectionStore.getState().set([line.id])
}

export function addWiringText(at: Point, text: string) {
  if (!text.trim() || activePage()?.kind !== 'wiring') return
  const t: CadText = { id: uid('txt'), type: 'text', position: at, text, size: 28, style: 'note', anchor: 'start' }
  withActivePage('Text eingefügt', (p) => ({ ...p, texts: [...p.texts, t] }))
  useSelectionStore.getState().set([t.id])
}

export function moveWiringObjects(ids: readonly string[], dx: number, dy: number) {
  if (!ids.length || (!dx && !dy)) return
  withActivePage(ids.length > 1 ? `${ids.length} Grafiken verschoben` : 'Grafik verschoben', (p) => translateGraphics(p, ids, dx, dy))
}

export function resizeShape(id: string, rect: Rect) {
  const page = activePage()
  if (!page || !findShape(page, id)) return
  withActivePage('Grafik skaliert', (p) => resizeShapeOnPage(p, id, rect))
}

export function updateShape(id: string, patch: Partial<Shape>, label = 'Grafik geändert') {
  const apply = <T extends Shape>(arr: T[]) => arr.map((o) => (o.id === id ? ({ ...o, ...patch, id: o.id, type: o.type } as T) : o))
  withActivePage(label, (p) => {
    const s = pageShapes(p)
    return { ...p, rectangles: apply(s.rectangles), ellipses: apply(s.ellipses), images: apply(s.images) }
  })
}
