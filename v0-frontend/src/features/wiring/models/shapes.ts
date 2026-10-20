import { pageShapes, type CadDocument, type CadEllipse, type CadImage, type CadLine, type CadPage, type CadRectangle, type CadText, type Point, type Rect } from '@/types/cad'
import { pointsBounds, TEXT_LINE, translatePoint } from '@/features/drawing/geometry'

/** Minimum edge length of a resized rectangle/ellipse, in world units (0.1 mm). */
export const MIN_SHAPE_SIZE = 10

export function creationBounds(a: Point, b: Point): Rect | null {
  const rect = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
  return Object.values(rect).every(Number.isFinite) && rect.w >= MIN_SHAPE_SIZE && rect.h >= MIN_SHAPE_SIZE ? rect : null
}

export type WiringShape = CadRectangle | CadEllipse
export type WiringGraphic = CadLine | CadRectangle | CadEllipse | CadImage | CadText

export function shapeBox(s: WiringShape | CadImage): Rect {
  if (s.type === 'ellipse') return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 }
  return { x: s.x, y: s.y, w: s.width, h: s.height }
}

export function withShapeBox<T extends WiringShape | CadImage>(s: T, r: Rect): T {
  if (s.type === 'ellipse') return { ...s, cx: r.x + r.w / 2, cy: r.y + r.h / 2, rx: r.w / 2, ry: r.h / 2 }
  return { ...s, x: r.x, y: r.y, width: r.w, height: r.h }
}

/** Render/hit order: images below shapes below lines below texts. */
export function wiringGraphics(page: CadPage): WiringGraphic[] {
  const s = pageShapes(page)
  return [...s.images, ...s.rectangles, ...s.ellipses, ...page.lines, ...page.texts]
}

export function findShape(page: CadPage, id: string): WiringShape | undefined {
  const s = pageShapes(page)
  return s.rectangles.find((o) => o.id === id) ?? s.ellipses.find((o) => o.id === id)
}

export function graphicBounds(o: WiringGraphic): Rect {
  switch (o.type) {
    case 'line':
      return pointsBounds(o.points)
    case 'text': {
      const lines = o.text.split('\n')
      const w = Math.max(...lines.map((l) => l.length), 1) * o.size * 0.6
      const x = o.anchor === 'start' ? o.position.x : o.anchor === 'end' ? o.position.x - w : o.position.x - w / 2
      return { x, y: o.position.y - o.size, w, h: o.size * 1.2 + (lines.length - 1) * o.size * TEXT_LINE }
    }
    default:
      return shapeBox(o)
  }
}

function moved<T extends WiringGraphic>(o: T, dx: number, dy: number): T {
  switch (o.type) {
    case 'line':
      return { ...o, points: o.points.map((p) => translatePoint(p, dx, dy)) }
    case 'text':
      return { ...o, position: translatePoint(o.position, dx, dy) }
    case 'ellipse':
      return { ...o, cx: o.cx + dx, cy: o.cy + dy }
    default:
      return { ...o, x: o.x + dx, y: o.y + dy }
  }
}

/** Moves only graphic objects; electrical objects on the page are never touched. */
export function translateGraphics(page: CadPage, ids: readonly string[], dx: number, dy: number): CadPage {
  const set = new Set(ids)
  const map = <T extends WiringGraphic>(arr: T[]) => arr.map((o) => (set.has(o.id) ? moved(o, dx, dy) : o))
  const s = pageShapes(page)
  return { ...page, lines: map(page.lines), texts: map(page.texts), rectangles: map(s.rectangles), ellipses: map(s.ellipses), images: map(s.images) }
}

/** Shared by resize preview and commit, so both produce identical geometry. */
export function resizeShapeOnPage(page: CadPage, id: string, rect: Rect): CadPage {
  const s = pageShapes(page)
  const fit = <T extends WiringShape>(arr: T[]) => arr.map((o) => (o.id === id ? withShapeBox(o, rect) : o))
  return { ...page, rectangles: fit(s.rectangles), ellipses: fit(s.ellipses) }
}

/** Vertices that attract graphic snapping: line points plus caller-supplied extras (e.g. draft points). */
export function graphicAnchors(page: CadPage, extra: readonly Point[] = []): Point[] {
  return [...page.lines.flatMap((l) => l.points), ...extra]
}

/** Only inline raster/SVG data URLs are accepted from legacy documents. */
export function imageHref(im: CadImage): string | null {
  return im.legacySrc && /^data:image\//.test(im.legacySrc) ? im.legacySrc : null
}

/** Moves the former inline `src` of images into the read-only `legacySrc` field. */
export function migrateLegacyImages(doc: CadDocument): CadDocument {
  let changed = false
  const pages = doc.pages.map((p) => {
    if (!p.images?.length) return p
    const images = p.images.map((im) => {
      const { src, ...rest } = im as CadImage & { src?: unknown }
      if (!Object.prototype.hasOwnProperty.call(im, 'src')) return im
      changed = true
      return typeof src === 'string' && /^data:image\//.test(src) && rest.legacySrc === undefined ? { ...rest, legacySrc: src } : rest
    })
    return { ...p, images }
  })
  return changed ? { ...doc, pages } : doc
}
