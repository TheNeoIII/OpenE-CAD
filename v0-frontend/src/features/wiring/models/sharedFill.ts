import { pageShapes, type CadPage } from '@/types/cad'

export function sharedFill(page: CadPage, ids: readonly string[]) {
  const selected = new Set(ids)
  const shapes = pageShapes(page)
  const items = [...shapes.rectangles, ...shapes.ellipses, ...shapes.diagramBlocks].filter((o) => selected.has(o.id))
  if (!items.length || items.length !== selected.size) return null
  const fill = items[0].fill ?? 'none'
  const opacity = items[0].fillOpacity ?? 1
  return {
    fill: items.every((o) => (o.fill ?? 'none') === fill) ? fill : undefined,
    opacity: items.every((o) => (o.fillOpacity ?? 1) === opacity) ? opacity : undefined,
  }
}
