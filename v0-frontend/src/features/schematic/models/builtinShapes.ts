import type { BuiltinSymbolKind, SymbolShape } from '@/types/cad'

/** The same editable primitives drive built-in rendering and duplication. `ways` overrides the conductor count of outlets/marks. */
export function builtinShapes(kind: BuiltinSymbolKind, poles: 1 | 3, ways?: number): SymbolShape[] {
  const shapes: SymbolShape[] = []
  const line = (x1: number, y1: number, x2: number, y2: number, dash?: string) => shapes.push({ t: 'line', x1, y1, x2, y2, ...(dash ? { dashed: true, dash } : {}) })
  const rect = (x: number, y: number, w: number, h: number, filled = false, rx?: number) => shapes.push({ t: 'rect', x, y, w, h, filled, rx, noStroke: filled })
  const circle = (cx: number, cy: number, r: number) => shapes.push({ t: 'circle', cx, cy, r })
  const path = (x: number, y: number, w: number, h: number, d: string, filled = false) => shapes.push({ t: 'path', x, y, w, h, d, ...(filled ? { fillColor: 'currentColor' } : {}) })
  const text = (x: number, y: number, value: string, size: number, weight?: number) => shapes.push({ t: 'text', x, y, text: value, size, weight, anchor: 'middle', font: 'inherit' })
  const contact = (x: number, mark?: 'x' | 'arc') => {
    line(x, -100, x, -30); line(x, 30, x, 100); line(x, 30, x - 32, -38)
    if (mark === 'x') { line(x - 10, -40, x + 10, -20); line(x + 10, -40, x - 10, -20) }
    if (mark === 'arc') shapes.push({ t: 'path', x: x - 12, y: -42, w: 24, h: 12, d: 'M0 12 A12 12 0 0 1 24 12' })
  }
  /** Thermal latch hook at the blade tip plus magnetic trip arrow (LSS per EN 60617). */
  const lss = (x: number, hook = true) => {
    if (hook) { line(x - 32, -38, x - 32, -52); line(x - 32, -52, x - 14, -52); line(x - 14, -52, x - 14, -40) }
    line(x - 22, -18, x - 70, 2)
    path(x - 82, -6, 24, 18, 'M0 12 L18 0 L14 14 Z', true)
  }
  /** RCD release: test/lock box, residual-current relay and summation core left of the first pole. */
  const rcdRelease = (left: number, right: number) => {
    const bx = left - 200
    line(left - 20, -10, right - 20, -10, '14 10')
    line(bx + 44, -10, left - 20, -10, '14 10')
    rect(bx, -32, 44, 44); line(bx + 22, -32, bx + 22, 12); line(bx, -10, bx + 44, -10)
    line(bx, -10, bx - 26, -10); line(bx - 26, -24, bx - 26, 4)
    line(bx + 22, 12, bx + 22, 62, '12 8'); line(bx + 22, 62, bx + 40, 62, '12 8')
    rect(bx + 40, 46, 70, 32); line(bx + 52, 54, bx + 52, 70); line(bx + 60, 54, bx + 60, 70); text(bx + 86, 70, 'I>', 18, 600)
    line(bx + 75, 46, bx + 75, 24); line(bx + 75, 24, left - 60, 24); line(bx + 75, 78, bx + 75, 98); line(bx + 75, 98, left - 60, 98)
    rect(left - 62, 20, 16, 82, true, 5)
    line(left - 46, 62, right + 24, 62)
  }
  const xs = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 100)
  switch (kind) {
    case 'breaker':
    case 'breakerN': {
      const positions = xs(poles + (kind === 'breakerN' ? 1 : 0))
      positions.forEach((x, i) => { contact(x); if (i < poles) lss(x) })
      if (positions.length > 1) line(positions[0] - 20, -10, positions[positions.length - 1] - 20, -10, '14 10')
      break
    }
    case 'contactor': {
      const positions = xs(poles)
      positions.forEach((x) => contact(x, 'arc'))
      if (positions.length > 1) line(positions[0] - 16, 0, positions[positions.length - 1] - 16, 0, '14 10')
      break
    }
    case 'rcd': {
      const positions = xs(poles + 1)
      positions.forEach((x) => contact(x))
      rcdRelease(positions[0], positions[positions.length - 1])
      break
    }
    case 'rcbo': {
      const positions = xs(poles + 1)
      positions.forEach((x, i) => { contact(x); if (i < poles) lss(x, false) })
      rcdRelease(positions[0], positions[positions.length - 1])
      break
    }
    case 'fuseD02':
    case 'fuseD02N': {
      const switched = kind === 'fuseD02N'
      const positions = xs(poles + 1)
      const fused = positions.slice(0, poles)
      const n = positions[poles]
      for (const x of fused) {
        line(x, -100, x, -50); line(x, -10, x - 26, -56); line(x, -10, x, 20)
        rect(x - 10, 20, 20, 54); line(x, 20, x, 74); line(x, 74, x, 100)
      }
      if (switched) { line(n, -100, n, -50); line(n, -10, n - 26, -56); line(n, -10, n, 100) }
      else line(n, -100, n, 100)
      const l = fused[0] - 40, r = (switched ? n : fused[fused.length - 1]) + 30
      line(l, -84, r, -84, '12 8'); line(r, -84, r, 88, '12 8'); line(r, 88, l, 88, '12 8'); line(l, 88, l, -84, '12 8')
      break
    }
    case 'coil': line(0, -100, 0, -40); line(0, 40, 0, 100); rect(-35, -40, 70, 80); break
    case 'timer':
      line(0, -100, 0, -30); line(0, 30, 0, 100); rect(-70, -30, 100, 60)
      circle(-30, 0, 20); line(-30, 0, -30, -13); line(-30, 0, -19, 7); break
    case 'contactNO': contact(0); break
    case 'contactNC': line(0, -100, 0, -30); line(0, 30, 0, 100); line(0, 30, 28, -40); line(0, -30, 34, -30); break
    case 'contactCO':
      line(0, 100, 0, 30); line(0, 30, 44, -36)
      line(50, -100, 50, -30)
      line(-50, -100, -50, -30); line(-50, -30, 22, -30); break
    case 'terminal': line(0, -50, 0, -14); line(0, 14, 0, 50); circle(0, 0, 14); break
    case 'motor':
      line(-100, -150, -100, -30); line(0, -150, 0, -60); line(100, -150, 100, -30); line(200, -150, 200, 20); line(200, 20, 80, 20)
      circle(0, 20, 85); text(0, 14, 'M', 52, 600); text(0, 66, '3~', 34); break
    case 'lamp':
      line(0, -100, 0, -36); line(0, 36, 0, 100); circle(0, 0, 36); line(-25, -25, 25, 25); line(25, -25, -25, 25); break
    case 'pushbutton':
      contact(0); line(-16, 0, -90, 0, '12 8'); line(-90, -26, -90, 26); line(-90, -26, -110, -26); line(-90, 26, -110, 26); break
    case 'outlet': {
      const count = Math.max(1, ways ?? poles)
      xs(count).forEach((x) => line(x, -100, x, 0))
      const half = (count - 1) * 50 + 40
      line(-half, 0, half, 0); line(-half, 0, 0, 60); line(0, 60, half, 0); line(-half * .6, 18, 0, 42); line(0, 42, half * .6, 18); break
    }
    case 'crossMark': {
      const count = Math.max(1, ways ?? poles)
      const half = (count - 1) * 50 + 40
      line(-half, 0, half, 0); break
    }
  }
  return shapes
}
