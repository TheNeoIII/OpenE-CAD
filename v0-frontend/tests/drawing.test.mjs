import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const loadModule = (path) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const moduleExports = {}
  new Function('exports', 'require', compiled)(moduleExports, () => ({}))
  return moduleExports
}

const geo = loadModule('../src/features/drawing/geometry.ts')
const vp = loadModule('../src/features/drawing/viewport.ts')

test('screen/world transforms are inverse', () => {
  const view = { panX: 120, panY: -40, zoom: 2.5 }
  const world = vp.screenToWorld(view, 333, 444)
  const screen = vp.worldToScreen(view, world)
  assert.ok(Math.abs(screen.x - 333) < 1e-9)
  assert.ok(Math.abs(screen.y - 444) < 1e-9)
})

test('screen tolerance shrinks in world units when zoomed in', () => {
  const near = vp.screenToWorldTolerance(10, vp.scaleOf({ panX: 0, panY: 0, zoom: 4 }))
  const far = vp.screenToWorldTolerance(10, vp.scaleOf({ panX: 0, panY: 0, zoom: 1 }))
  assert.ok(Math.abs(near * 4 - far) < 1e-9)
})

test('fitRect clamps zoom and centers the rect', () => {
  const v = vp.fitRect({ x: 0, y: 0, w: 1, h: 1 }, { w: 1000, h: 800 })
  assert.equal(v.zoom, vp.MAX_ZOOM)
  const s = vp.scaleOf(v)
  assert.ok(Math.abs(v.panX + 0.5 * s - 500) < 1e-9)
})

test('bounds, union and normalize', () => {
  assert.deepEqual(geo.pointsBounds([{ x: 5, y: 2 }, { x: -1, y: 8 }]), { x: -1, y: 2, w: 6, h: 6 })
  assert.equal(geo.unionRects([]), null)
  assert.deepEqual(geo.unionRects([{ x: 0, y: 0, w: 1, h: 1 }, { x: 4, y: -2, w: 1, h: 1 }]), { x: 0, y: -2, w: 5, h: 3 })
  assert.deepEqual(geo.normalizeRect({ x: 4, y: 4 }, { x: 1, y: 6 }), { x: 1, y: 4, w: 3, h: 2 })
  assert.ok(geo.rectContains({ x: 0, y: 0, w: 10, h: 10 }, { x: 2, y: 2, w: 3, h: 3 }))
})

test('point on segment and grid snap', () => {
  assert.ok(geo.pointOnSegment({ x: 5, y: 0.2 }, { x: 0, y: 0 }, { x: 10, y: 0 }))
  assert.ok(!geo.pointOnSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }))
  assert.deepEqual(geo.snapPoint({ x: 26, y: -24 }, 25), { x: 25, y: -25 })
  assert.ok(geo.samePoint({ x: 1, y: 1 }, { x: 1.2, y: 0.9 }))
})
