import type { CadPotential, CadWire, ConductorLabelPos, Point, TextAnchor } from '@/types/cad'

export interface ConductorLabelPlacement {
  x: number
  y: number
  anchor: TextAnchor
  /** Text is rotated -90° to run along a vertical conductor. */
  vertical: boolean
}

export const CONDUCTOR_LABEL_POSITIONS: { value: ConductorLabelPos; label: string }[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'top-left', label: 'Links oben' },
  { value: 'top-right', label: 'Rechts oben' },
  { value: 'bottom-left', label: 'Links unten' },
  { value: 'bottom-right', label: 'Rechts unten' },
  { value: 'custom', label: 'Benutzerdefiniert' },
]

const ABOVE = 10
const BELOW = 26
const INSET = 10

function longestSegment(points: Point[]) {
  let best: { a: Point; b: Point } | null = null
  let bestLen = -1
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y)
    if (len > bestLen) {
      bestLen = len
      best = { a: points[i], b: points[i + 1] }
    }
  }
  return best
}

export function conductorLabelRef(c: CadWire | CadPotential): Point {
  return c.type === 'wire' ? c.points[0] ?? { x: 0, y: 0 } : { x: c.x1, y: c.y }
}

function wirePlacement(w: CadWire, pos: ConductorLabelPos): ConductorLabelPlacement | null {
  const seg = longestSegment(w.points)
  if (!seg) return null
  const { a, b } = seg
  const vertical = Math.abs(b.x - a.x) < Math.abs(b.y - a.y)
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  if (pos === 'custom') {
    const ref = conductorLabelRef(w)
    const off = w.labelOffset ?? { x: mid.x - ref.x - (vertical ? ABOVE : 0), y: mid.y - ref.y - (vertical ? 0 : ABOVE) }
    return { x: ref.x + off.x, y: ref.y + off.y, anchor: w.labelAnchor ?? 'middle', vertical }
  }
  const left = pos === 'top-left' || pos === 'bottom-left'
  const top = pos === 'top-left' || pos === 'top-right'
  if (vertical) {
    const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y)
    if (pos === 'auto') return { x: mid.x - ABOVE, y: mid.y, anchor: 'middle', vertical }
    // Rotated -90°: glyphs extend toward -x from the baseline, and "end" is the upper end.
    return { x: left ? mid.x - ABOVE : mid.x + BELOW - 4, y: top ? minY + INSET : maxY - INSET, anchor: top ? 'end' : 'start', vertical }
  }
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x)
  if (pos === 'auto') return { x: mid.x, y: mid.y - ABOVE, anchor: 'middle', vertical }
  return { x: left ? minX + INSET : maxX - INSET, y: top ? mid.y - ABOVE : mid.y + BELOW, anchor: left ? 'start' : 'end', vertical }
}

function railPlacements(p: CadPotential, pos: ConductorLabelPos, tipL: number, tipR: number): ConductorLabelPlacement[] {
  const leftX = Math.max(p.x1, tipL) + INSET
  const rightX = Math.min(p.x2, tipR) - INSET
  if (pos === 'custom') {
    const off = p.labelOffset ?? { x: leftX - p.x1, y: -ABOVE }
    return [{ x: p.x1 + off.x, y: p.y + off.y, anchor: p.labelAnchor ?? 'start', vertical: false }]
  }
  if (pos === 'auto') {
    return [
      { x: leftX, y: p.y - ABOVE, anchor: 'start', vertical: false },
      { x: rightX, y: p.y - ABOVE, anchor: 'end', vertical: false },
    ]
  }
  const left = pos === 'top-left' || pos === 'bottom-left'
  const top = pos === 'top-left' || pos === 'top-right'
  return [{ x: left ? leftX : rightX, y: top ? p.y - ABOVE : p.y + BELOW, anchor: left ? 'start' : 'end', vertical: false }]
}

/** Label placements in world coordinates. Rails may yield two (one per end). */
export function conductorLabelPlacements(c: CadWire | CadPotential, tips?: { left: number; right: number }): ConductorLabelPlacement[] {
  const pos = c.labelPos ?? 'auto'
  if (c.type === 'wire') {
    const p = wirePlacement(c, pos)
    return p ? [p] : []
  }
  return railPlacements(c, pos, tips?.left ?? c.x1, tips?.right ?? c.x2)
}

/** Patch for switching the label position; "custom" freezes the currently shown position. */
export function conductorLabelPosPatch(c: CadWire | CadPotential, labelPos: ConductorLabelPos, tips?: { left: number; right: number }) {
  if (labelPos !== 'custom') return { labelPos }
  if (c.labelPos === 'custom' && c.labelOffset) return { labelPos }
  const at = conductorLabelPlacements(c, tips)[0]
  if (!at) return { labelPos }
  const ref = conductorLabelRef(c)
  return { labelPos, labelOffset: { x: at.x - ref.x, y: at.y - ref.y }, labelAnchor: at.anchor }
}
