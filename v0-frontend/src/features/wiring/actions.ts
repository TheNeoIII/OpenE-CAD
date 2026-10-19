import { useDocumentStore } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { pageShapes, type CadEllipse, type CadImage, type CadPage, type CadRectangle, type CadShapeStyle, type Point } from '@/types/cad'
import { uid } from '@/utils/format'

export const DEFAULT_SHAPE_STYLE: CadShapeStyle = { stroke: '#1f2937', strokeWidth: 3, lineStyle: 'solid', fill: 'none' }

type Shape = CadRectangle | CadEllipse | CadImage

function withActivePage(label: string, fn: (p: CadPage) => CadPage) {
  const store = useDocumentStore.getState()
  const pageId = store.activePageId
  store.commit(label, (d) => ({ ...d, pages: d.pages.map((p) => (p.id === pageId ? fn(p) : p)) }))
}

function cornerRect(a: Point, b: Point) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }
}

export function addRectangle(a: Point, b: Point) {
  const r = cornerRect(a, b)
  if (r.width < 1 || r.height < 1) return
  const shape: CadRectangle = { id: uid('rect'), type: 'rectangle', ...r, ...DEFAULT_SHAPE_STYLE }
  withActivePage('Rechteck gezeichnet', (p) => ({ ...p, rectangles: [...pageShapes(p).rectangles, shape] }))
  useSelectionStore.getState().set([shape.id])
}

export function addEllipse(a: Point, b: Point) {
  const r = cornerRect(a, b)
  if (r.width < 1 || r.height < 1) return
  const shape: CadEllipse = { id: uid('ell'), type: 'ellipse', cx: r.x + r.width / 2, cy: r.y + r.height / 2, rx: r.width / 2, ry: r.height / 2, ...DEFAULT_SHAPE_STYLE }
  withActivePage('Ellipse gezeichnet', (p) => ({ ...p, ellipses: [...pageShapes(p).ellipses, shape] }))
  useSelectionStore.getState().set([shape.id])
}

export function addImage(at: Point, src: string, width: number, height: number, alt = '') {
  const shape: CadImage = { id: uid('img'), type: 'image', x: at.x, y: at.y, width, height, src, alt }
  withActivePage('Bild eingefügt', (p) => ({ ...p, images: [...pageShapes(p).images, shape] }))
  useSelectionStore.getState().set([shape.id])
}

export function updateShape(id: string, patch: Partial<Shape>, label = 'Grafik geändert') {
  const apply = <T extends Shape>(arr: T[]) => arr.map((o) => (o.id === id ? ({ ...o, ...patch, id: o.id, type: o.type } as T) : o))
  withActivePage(label, (p) => {
    const s = pageShapes(p)
    return { ...p, rectangles: apply(s.rectangles), ellipses: apply(s.ellipses), images: apply(s.images) }
  })
}
