import type { BuiltinSymbolKind, CadConnectionPoint, SymbolShape } from '@/types/cad'

export interface BuiltinGeometry {
  shapes: SymbolShape[]
  pins: CadConnectionPoint[]
}

const N_BLUE = '#0961bb'
const RCD3_BOTTOM = 219.14

const rcd3Pole = (x: number, color?: string): SymbolShape[] => [
  { t: 'line', x1: x, y1: -100, x2: x, y2: -30, ...(color ? { color } : {}) },
  { t: 'line', x1: x, y1: 30, x2: x, y2: RCD3_BOTTOM, ...(color ? { color } : {}) },
  { t: 'line', x1: x, y1: 30, x2: x - 32, y2: -38, ...(color ? { color } : {}) },
]

const rcd3: BuiltinGeometry = {
  pins: [
    { id: '1', x: -150, y: -100 },
    { id: '2', x: -150, y: RCD3_BOTTOM },
    { id: '3', x: -50, y: -100 },
    { id: '4', x: -50, y: RCD3_BOTTOM },
    { id: '5', x: 50, y: -100 },
    { id: '6', x: 50, y: RCD3_BOTTOM },
    { id: 'N', x: 150, y: -100 },
    { id: "N'", x: 150, y: RCD3_BOTTOM },
  ],
  shapes: [
    ...rcd3Pole(-150),
    ...rcd3Pole(-50),
    ...rcd3Pole(50),
    ...rcd3Pole(150, N_BLUE),
    { t: 'line', x1: -321.97, y1: -10, x2: 118.03, y2: -10, dashed: true, dash: '14 10' },
    { t: 'rect', x: -389.8, y: -32, w: 44, h: 44, filled: false, noStroke: false },
    { t: 'line', x1: -367.8, y1: -32, x2: -367.8, y2: 12 },
    { t: 'line', x1: -399.24, y1: -10, x2: -336.24, y2: -10 },
    { t: 'line', x1: -417.57, y1: -10, x2: -435.57, y2: -10 },
    { t: 'line', x1: -435.7, y1: -24, x2: -435.7, y2: 4 },
    { t: 'line', x1: -367.8, y1: 12, x2: -367.8, y2: 121, dashed: true, dash: '12 8' },
    { t: 'rect', x: -310, y: 100.76, w: 70, h: 41.98, filled: false, noStroke: false },
    { t: 'line', x1: -286.85, y1: 113.7, x2: -286.85, y2: 129.7, group: 'rcd3-test' },
    { t: 'text', x: -263.57, y: 129.4, text: 'I >', size: 22.68, weight: 600, anchor: 'middle', font: 'inherit' },
    { t: 'line', x1: -275, y1: 99.4, x2: -275, y2: 61.4 },
    { t: 'line', x1: -275, y1: 60.09, x2: -205, y2: 60.09 },
    { t: 'line', x1: -275, y1: 144, x2: -275, y2: 182 },
    { t: 'line', x1: -275, y1: 182.88, x2: -205, y2: 182.86 },
    { t: 'rect', x: -212, y: 79.7, w: 16, h: 82, filled: true, rx: 5, noStroke: true },
    { t: 'line', x1: -222.14, y1: 121.7, x2: 178.86, y2: 121.7 },
    { t: 'line', x1: -296.36, y1: 121.34, x2: -288.36, y2: 121.34, dashed: true, dash: '12 8', group: 'rcd3-test' },
    { t: 'line', x1: -204, y1: 81.73, x2: -204, y2: 60.73 },
    { t: 'line', x1: -204, y1: 182.09, x2: -204, y2: 160.09 },
    { t: 'line', x1: -322.43, y1: 121.7, x2: -368.49, y2: 121.7, dashed: true, dash: '16 12' },
  ],
}

/** Built-in symbols redrawn in the symbol editor; they replace the procedural `builtinShapes` drawing. */
export const BUILTIN_GEOMETRY: Partial<Record<BuiltinSymbolKind, Partial<Record<1 | 3, BuiltinGeometry>>>> = {
  rcd: { 3: rcd3 },
}
