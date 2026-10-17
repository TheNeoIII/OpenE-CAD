import type { BuiltinSymbolKind, SymbolShape } from '@/types/cad'

/** The same editable primitives drive built-in rendering and duplication. */
export function builtinShapes(kind: BuiltinSymbolKind, poles: 1 | 3): SymbolShape[] {
  const shapes: SymbolShape[] = []
  const line = (x1: number, y1: number, x2: number, y2: number, dash?: string) => shapes.push({ t: 'line', x1, y1, x2, y2, ...(dash ? { dashed: true, dash } : {}) })
  const rect = (x: number, y: number, w: number, h: number, filled = false, rx?: number) => shapes.push({ t: 'rect', x, y, w, h, filled, rx, noStroke: filled })
  const circle = (cx: number, cy: number, r: number) => shapes.push({ t: 'circle', cx, cy, r })
  const text = (x: number, y: number, value: string, size: number, weight?: number) => shapes.push({ t: 'text', x, y, text: value, size, weight, anchor: 'middle', font: 'inherit' })
  const contact = (x: number, mark?: 'x' | 'arc') => {
    line(x, -100, x, -30); line(x, 30, x, 100); line(x, 30, x - 32, -38)
    if (mark === 'x') { line(x - 10, -40, x + 10, -20); line(x + 10, -40, x - 10, -20) }
    if (mark === 'arc') shapes.push({ t: 'path', x: x - 12, y: -42, w: 24, h: 12, d: 'M0 12 A12 12 0 0 1 24 12' })
  }
  const xs = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 100)
  switch (kind) {
    case 'breaker':
    case 'contactor':
    case 'breakerN':
    case 'rcd': {
      const neutral = kind === 'breakerN' || kind === 'rcd'
      const positions = xs(poles + (neutral ? 1 : 0))
      const left = positions[0], right = positions[positions.length - 1]
      positions.forEach((x, i) => contact(x, kind === 'rcd' || (neutral && i === poles) ? undefined : kind === 'contactor' ? 'arc' : 'x'))
      if (positions.length > 1) line(left - 16, 0, right - 16, 0, '14 10')
      if (kind === 'breaker' || kind === 'breakerN') { line(left - 16, 0, left - 60, 0); line(left - 60, -14, left - 60, 14) }
      if (kind === 'rcd') {
        const box = left - 150
        line(left - 16, 0, box + 80, 0, '14 10'); rect(box, -26, 80, 52); text(box + 40, 11, 'IΔ', 30, 600)
        line(box + 20, -26, box + 20, -56); line(box + 20, -56, box + 60, -56); line(box + 20, -56, box + 20, -70)
        line(box + 40, 26, box + 40, 66, '14 10'); line(box + 40, 66, left - 30, 66, '14 10')
        rect(left - 30, 56, right - left + 60, 20, true, 10)
      }
      break
    }
    case 'coil': line(0, -100, 0, -40); line(0, 40, 0, 100); rect(-35, -40, 70, 80); break
    case 'contactNO': contact(0); break
    case 'contactNC': line(0, -100, 0, -30); line(0, 30, 0, 100); line(0, 30, 28, -40); line(0, -30, 34, -30); break
    case 'terminal': line(0, -50, 0, -14); line(0, 14, 0, 50); circle(0, 0, 14); break
    case 'motor':
      line(-100, -150, -100, -30); line(0, -150, 0, -60); line(100, -150, 100, -30); line(200, -150, 200, 20); line(200, 20, 80, 20)
      circle(0, 20, 85); text(0, 14, 'M', 52, 600); text(0, 66, '3~', 34); break
    case 'lamp':
      line(0, -100, 0, -36); line(0, 36, 0, 100); circle(0, 0, 36); line(-25, -25, 25, 25); line(25, -25, -25, 25); break
    case 'pushbutton':
      contact(0); line(-16, 0, -90, 0, '12 8'); line(-90, -26, -90, 26); line(-90, -26, -110, -26); line(-90, 26, -110, 26); break
    case 'outlet': {
      xs(poles).forEach((x) => line(x, -100, x, 0))
      const half = (poles - 1) * 50 + 40
      line(-half, 0, half, 0); line(-half, 0, 0, 60); line(0, 60, half, 0); line(-half * .6, 18, 0, 42); line(0, 42, half * .6, 18); break
    }
  }
  return shapes
}
