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

const MAX_IMAGE_SIZE = 300
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function naturalSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || MAX_IMAGE_SIZE, height: img.naturalHeight || MAX_IMAGE_SIZE })
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
    img.src = src
  })
}

export async function insertImageFile(file: File, at: Point = { x: 40, y: 40 }) {
  if (!file.type.startsWith('image/')) throw new Error('Nur Bilddateien sind erlaubt')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Bild ist größer als 5 MB')
  const src = await readAsDataUrl(file)
  const size = await naturalSize(src)
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(size.width, size.height))
  addImage(at, src, Math.round(size.width * scale), Math.round(size.height * scale), file.name)
}

export function pickImageFile(onError: (message: string) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif'
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) insertImageFile(file).catch((e: Error) => onError(e.message))
  }
  input.click()
}

export function updateShape(id: string, patch: Partial<Shape>, label = 'Grafik geändert') {
  const apply = <T extends Shape>(arr: T[]) => arr.map((o) => (o.id === id ? ({ ...o, ...patch, id: o.id, type: o.type } as T) : o))
  withActivePage(label, (p) => {
    const s = pageShapes(p)
    return { ...p, rectangles: apply(s.rectangles), ellipses: apply(s.ellipses), images: apply(s.images) }
  })
}
