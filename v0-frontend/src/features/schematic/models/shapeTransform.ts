import type { CadConnectionPoint, SymbolShape } from '@/types/cad'

export type Pt = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }

const rad = (deg: number) => (deg * Math.PI) / 180
const normDeg = (deg: number) => {
  const d = ((deg % 360) + 360) % 360
  return Math.round(d * 1000) / 1000
}

export function rotatePoint(p: Pt, deg: number, c: Pt): Pt {
  const a = rad(deg)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: round(c.x + dx * cos - dy * sin), y: round(c.y + dx * sin + dy * cos) }
}

const round = (v: number) => Math.round(v * 100) / 100

/** Unrotated box of a shape plus the pivot its own `rot` is applied around. */
function localBox(s: SymbolShape): { box: Box; pivot: Pt } {
  if (s.t === 'line') {
    const x = Math.min(s.x1, s.x2)
    const y = Math.min(s.y1, s.y2)
    const box = { x, y, w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) }
    return { box, pivot: { x: x + box.w / 2, y: y + box.h / 2 } }
  }
  if (s.t === 'circle') return { box: { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 }, pivot: { x: s.cx, y: s.cy } }
  if (s.t === 'rect' || s.t === 'path') return { box: { x: s.x, y: s.y, w: s.w, h: s.h }, pivot: { x: s.x + s.w / 2, y: s.y + s.h / 2 } }
  const w = s.text.length * s.size * 0.6
  const x0 = s.anchor === 'middle' ? s.x - w / 2 : s.anchor === 'end' ? s.x - w : s.x
  return { box: { x: x0, y: s.y - s.size, w, h: s.size }, pivot: { x: s.x, y: s.y } }
}

export function shapeRotationPivot(s: SymbolShape): Pt {
  return localBox(s).pivot
}

/** Outline points of a shape in symbol coordinates, honouring its rotation. */
export function shapePoints(s: SymbolShape): Pt[] {
  if (s.t === 'line') return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]
  const { box, pivot } = localBox(s)
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x, y: box.y + box.h },
  ]
  if (s.t === 'circle' || !s.rot) return corners
  return corners.map((p) => rotatePoint(p, s.rot!, pivot))
}

export function pointsBox(points: Pt[]): Box | null {
  if (!points.length) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function selectionBox(shapes: SymbolShape[], pins: CadConnectionPoint[]): Box | null {
  return pointsBox([...shapes.flatMap(shapePoints), ...pins.map((p) => ({ x: p.x, y: p.y }))])
}

export function translateShape(s: SymbolShape, dx: number, dy: number): SymbolShape {
  if (s.t === 'line') return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
  if (s.t === 'circle') return { ...s, cx: s.cx + dx, cy: s.cy + dy }
  return { ...s, x: s.x + dx, y: s.y + dy }
}

/** Rotates a shape by `deg` around an arbitrary pivot `c` (e.g. the centre of a group). */
export function rotateShape(s: SymbolShape, deg: number, c: Pt): SymbolShape {
  if (s.t === 'line') {
    const a = rotatePoint({ x: s.x1, y: s.y1 }, deg, c)
    const b = rotatePoint({ x: s.x2, y: s.y2 }, deg, c)
    return { ...s, x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }
  if (s.t === 'circle') {
    const m = rotatePoint({ x: s.cx, y: s.cy }, deg, c)
    return { ...s, cx: m.x, cy: m.y }
  }
  const pivot = shapeRotationPivot(s)
  const next = rotatePoint(pivot, deg, c)
  const moved = translateShape(s, next.x - pivot.x, next.y - pivot.y)
  const rot = normDeg((s.rot ?? 0) + deg)
  return { ...moved, rot: rot === 0 ? undefined : rot } as SymbolShape
}

/** Scales a shape relative to `anchor`; negative factors mirror positions but keep sizes positive. */
export function scaleShape(s: SymbolShape, sx: number, sy: number, anchor: Pt): SymbolShape {
  const sp = (p: Pt): Pt => ({ x: round(anchor.x + (p.x - anchor.x) * sx), y: round(anchor.y + (p.y - anchor.y) * sy) })
  const avg = (Math.abs(sx) + Math.abs(sy)) / 2
  if (s.t === 'line') {
    const a = sp({ x: s.x1, y: s.y1 })
    const b = sp({ x: s.x2, y: s.y2 })
    return { ...s, x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }
  if (s.t === 'circle') {
    const m = sp({ x: s.cx, y: s.cy })
    return { ...s, cx: m.x, cy: m.y, r: Math.max(1, round(s.r * avg)) }
  }
  if (s.t === 'text') {
    const m = sp({ x: s.x, y: s.y })
    return { ...s, x: m.x, y: m.y, size: Math.max(5, round(s.size * avg)) }
  }
  const pivot = shapeRotationPivot(s)
  const m = sp(pivot)
  const w = Math.max(1, round(s.w * Math.abs(sx)))
  const h = Math.max(1, round(s.h * Math.abs(sy)))
  const base = { ...s, x: round(m.x - w / 2), y: round(m.y - h / 2), w, h }
  if (s.t === 'path') return { ...base, t: 'path', sx: round((s.sx ?? 1) * Math.abs(sx)), sy: round((s.sy ?? 1) * Math.abs(sy)) } as SymbolShape
  return base as SymbolShape
}

export function lineLength(s: Extract<SymbolShape, { t: 'line' }>) {
  return round(Math.hypot(s.x2 - s.x1, s.y2 - s.y1))
}

export function lineAngle(s: Extract<SymbolShape, { t: 'line' }>) {
  return normDeg(round((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI))
}

/** Keeps the start point and sets a new length and/or angle for a line. */
export function setLinePolar(s: Extract<SymbolShape, { t: 'line' }>, length: number, angle: number): SymbolShape {
  const a = rad(angle)
  return { ...s, x2: round(s.x1 + Math.cos(a) * length), y2: round(s.y1 + Math.sin(a) * length) }
}

/** Arrowhead triangle at `tip`, pointing away from `from`. */
export function arrowHead(from: Pt, tip: Pt, strokeWidth: number) {
  const len = Math.hypot(tip.x - from.x, tip.y - from.y) || 1
  const ux = (tip.x - from.x) / len
  const uy = (tip.y - from.y) / len
  const L = Math.min(len * 0.6, Math.max(28, strokeWidth * 4))
  const W = L * 0.6
  const base = { x: tip.x - ux * L, y: tip.y - uy * L }
  return {
    base,
    points: `${tip.x},${tip.y} ${base.x - uy * W},${base.y + ux * W} ${base.x + uy * W},${base.y - ux * W}`,
  }
}
