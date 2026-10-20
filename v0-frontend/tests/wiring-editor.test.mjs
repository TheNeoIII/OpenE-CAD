import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const loadModule = (path, deps = {}) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const moduleExports = {}
  new Function('exports', 'require', compiled)(moduleExports, (id) => deps[id] ?? {})
  return moduleExports
}

const geo = loadModule('../src/features/drawing/geometry.ts')
const vp = loadModule('../src/features/drawing/viewport.ts')
const snap = loadModule('../src/features/drawing/snap.ts', { './geometry': geo, './viewport': vp })
const resize = loadModule('../src/features/drawing/resize.ts')
const cad = { pageShapes: (p) => ({ rectangles: p.rectangles ?? [], ellipses: p.ellipses ?? [], images: p.images ?? [] }) }
const shapes = loadModule('../src/features/wiring/models/shapes.ts', { '@/types/cad': cad, '@/features/drawing/geometry': geo })
const wiringProfile = loadModule('../src/features/wiring/profile.ts')

test('graphic snap: endpoint beats grid, grid when free, Alt disables', () => {
  const o = { scale: 1, grid: 50, gridSnap: true, anchors: [{ x: 103, y: 97 }] }
  assert.deepEqual(snap.resolveGraphicSnap({ x: 108, y: 100 }, o).kind, 'endpoint')
  assert.deepEqual(snap.resolveGraphicSnap({ x: 108, y: 100 }, o).point, { x: 103, y: 97 })
  assert.deepEqual(snap.resolveGraphicSnap({ x: 160, y: 40 }, o), { point: { x: 150, y: 50 }, kind: 'grid', label: 'Raster' })
  assert.equal(snap.resolveGraphicSnap({ x: 108, y: 100 }, { ...o, disabled: true }).kind, 'free')
})

test('graphic snap tolerance is constant in screen pixels', () => {
  const anchors = [{ x: 0, y: 0 }]
  const zoomedIn = { scale: 4, grid: 0, gridSnap: false, anchors }
  assert.equal(snap.resolveGraphicSnap({ x: 2, y: 0 }, zoomedIn).kind, 'endpoint')
  assert.equal(snap.resolveGraphicSnap({ x: 5, y: 0 }, zoomedIn).kind, 'free')
})

test('resize keeps the opposite edge and never inverts', () => {
  const r = { x: 100, y: 100, w: 200, h: 100 }
  assert.deepEqual(resize.resizeRect(r, 'se', { x: 400, y: 260 }), { x: 100, y: 100, w: 300, h: 160 })
  assert.deepEqual(resize.resizeRect(r, 'w', { x: 50, y: 999 }), { x: 50, y: 100, w: 250, h: 100 })
  const crossed = resize.resizeRect(r, 'nw', { x: 900, y: 900 }, 10)
  assert.deepEqual(crossed, { x: 290, y: 190, w: 10, h: 10 })
})

test('ellipse resize goes through its bounding box', () => {
  const page = { lines: [], texts: [], rectangles: [], images: [], ellipses: [{ id: 'e', type: 'ellipse', cx: 100, cy: 100, rx: 50, ry: 20 }] }
  const out = shapes.resizeShapeOnPage(page, 'e', { x: 0, y: 0, w: 300, h: 100 })
  assert.deepEqual({ cx: out.ellipses[0].cx, cy: out.ellipses[0].cy, rx: out.ellipses[0].rx, ry: out.ellipses[0].ry }, { cx: 150, cy: 50, rx: 150, ry: 50 })
})

test('wiring editor exposes only graphic tools', () => {
  for (const t of ['wire', 'place']) assert.equal(wiringProfile.WIRING_TOOLS.has(t), false)
  for (const t of ['select', 'pan', 'line', 'text', 'rect', 'ellipse']) assert.equal(wiringProfile.WIRING_TOOLS.has(t), true)
})

test('schematic canvas no longer carries wiring shape code', () => {
  const src = readFileSync(new URL('../src/features/schematic/components/SchematicCanvas.tsx', import.meta.url), 'utf8')
  for (const needle of ['addRectangle', 'addEllipse', 'pageShapes', "'rect'", "'ellipse'"]) assert.equal(src.includes(needle), false, needle)
})
