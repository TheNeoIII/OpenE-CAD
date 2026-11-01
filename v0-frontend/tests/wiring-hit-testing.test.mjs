import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const cache = new Map()
function load(path) {
  const filename = path.endsWith('.ts') ? path : `${path}.ts`
  if (cache.has(filename)) return cache.get(filename)
  const exports = {}
  cache.set(filename, exports)
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('exports', 'require', output)(exports, (name) => load(name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(dirname(filename), name)))
  return exports
}
const hit = load(resolve(root, 'features/wiring/models/hitTesting'))
const { toolPointerIntent } = load(resolve(root, 'features/wiring/models/interaction'))
const { BASE_SCALE } = load(resolve(root, 'features/drawing/viewport'))
const rect = (id, x, y, width, height, fill = '#fff') => ({ id, type: 'rectangle', x, y, width, height, strokeWidth: 0, fill })
const page = (rectangles = []) => ({ id: 'page', kind: 'wiring', lines: [], texts: [], rectangles })

for (const fill of ['none', '#fff']) test(`nested hit stack and three-way cycling with fill=${fill}`, () => {
  const p = page([rect('C', 300, 300, 400, 400, fill), rect('B', 200, 200, 600, 600, fill), rect('A', 0, 0, 1000, 1000, fill)])
  assert.deepEqual(hit.wiringHitStack(p, { x: 300, y: 500 }, 1).map((h) => h.id), ['C', 'A', 'B'])
  const stack = hit.wiringHitStack(p, { x: 450, y: 450 }, 1)
  assert.deepEqual(stack.map((h) => h.id), ['A', 'B', 'C'])
  let cycle = null
  for (const id of ['A', 'B', 'C', 'A']) {
    const next = hit.cycleWiringHit(cycle, stack, { x: 100, y: 100 }, 'page/select/zoom/pan')
    assert.equal(next.hit.id, id)
    cycle = next.cycle
  }
  for (const context of ['other-page', 'other-tool', 'other-zoom', 'other-pan']) assert.equal(hit.cycleWiringHit(cycle, stack, { x: 100, y: 100 }, context).hit.id, 'A')
  assert.equal(hit.cycleWiringHit(cycle, stack, { x: 105, y: 100 }, cycle.context).hit.id, 'A')
  assert.equal(hit.cycleWiringHit(cycle, stack.slice(1), { x: 100, y: 100 }, cycle.context).hit.id, 'B')
  assert.equal(hit.cycleWiringHit(null, stack, { x: 100, y: 100 }, cycle.context).hit.id, 'A', 'marquee reset')
  assert.equal(hit.cycleWiringHit(cycle, [], { x: 100, y: 100 }, cycle.context).cycle, null)
})

for (const zoom of [0.25, 0.5, 1, 2, 4]) test(`boundary and stroke hit tolerance stays six screen pixels at ${zoom * 100}%`, () => {
  const scale = zoom * BASE_SCALE
  const shape = rect('r', 0, 0, 1000, 1000)
  const ellipse = { id: 'e', type: 'ellipse', cx: 500, cy: 500, rx: 500, ry: 200, strokeWidth: 0 }
  for (const [o, point] of [[shape, { x: -5 / scale, y: 500 }], [ellipse, { x: 1000 + 5 / scale, y: 500 }]]) assert.equal(hit.shapeBoundaryHit(o, point, 6 / scale), true)
  assert.equal(hit.shapeBoundaryHit(shape, { x: -7 / scale, y: 500 }, 6 / scale), false)
  assert.equal(hit.shapeBoundaryHit(ellipse, { x: 1000 + 7 / scale, y: 500 }, 6 / scale), false)
  const p = { ...page(), lines: [{ id: 'l', type: 'line', strokeWidth: 0, points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }] }] }
  assert.equal(hit.wiringHitStack(p, { x: 500, y: 5 / scale }, scale)[0].id, 'l')
  assert.equal(hit.wiringHitStack(p, { x: 500, y: 7 / scale }, scale).length, 0)
})

for (const [tool, hitType] of [['rect', 'rectangle'], ['ellipse', 'ellipse'], ['block', 'diagramBlock']]) test(`${tool}: interiors create; contours and labels select; explicit handles/ports win`, () => {
  assert.equal(toolPointerIntent({ tool, hitType, hitKind: 'interior' }), 'create')
  for (const hitKind of ['boundary', 'label']) {
    assert.equal(toolPointerIntent({ tool, hitType, hitKind }), 'select')
    assert.equal(toolPointerIntent({ tool, hitType, hitKind, forceCreate: true }), 'create')
  }
  for (const hitKind of ['handle', 'port']) for (const forceCreate of [false, true]) assert.equal(toolPointerIntent({ tool, hitType, hitKind, forceCreate }), 'edit')
})

test('line/text tools create through interiors and select only matching edit hits', () => {
  for (const tool of ['line', 'text']) for (const hitType of ['rectangle', 'ellipse', 'diagramBlock']) assert.equal(toolPointerIntent({ tool, hitType, hitKind: 'interior' }), 'create')
  assert.equal(toolPointerIntent({ tool: 'line', hitType: 'line', hitKind: 'stroke' }), 'select')
  assert.equal(toolPointerIntent({ tool: 'text', hitType: 'text', hitKind: 'label' }), 'select')
  assert.equal(toolPointerIntent({ tool: 'line', hitType: 'line', hitKind: 'stroke', drafting: true }), 'create')
})

test('labels, ports, free text and connection strokes beat filled interiors', () => {
  const p = page([rect('r', 0, 0, 1000, 1000)])
  p.rectangles[0].label = 'Caption'
  assert.equal(hit.wiringHitStack(p, { x: 500, y: 500 }, 1)[0].kind, 'label')
  p.diagramBlocks = [{ ...rect('b', 100, 100, 300, 300), type: 'diagramBlock', title: 'Title', fields: [{ id: 'f', label: 'IP', value: 'localhost' }], ports: [{ id: 'port', edge: 'left', t: 0.5 }] }]
  assert.equal(hit.wiringHitStack(p, { x: 100, y: 250 }, 1)[0].kind, 'port')
  assert.equal(hit.wiringHitStack(p, { x: 120, y: 130 }, 1)[0].kind, 'label')
  assert.equal(hit.wiringHitStack(p, { x: 120, y: 170 }, 1)[0].kind, 'label')
  p.texts = [{ id: 't', type: 'text', position: { x: 600, y: 600 }, size: 30, anchor: 'start', text: 'Hello\nworld' }]
  assert.equal(hit.wiringHitStack(p, { x: 610, y: 620 }, 1)[0].id, 't')
  p.connections = [{ id: 'c', type: 'connection', start: { kind: 'point', point: { x: 500, y: 800 } }, end: { kind: 'point', point: { x: 900, y: 800 } } }]
  assert.equal(hit.wiringHitStack(p, { x: 700, y: 800 }, 1)[0].id, 'c')
})

test('ellipse interiors exclude bounding-box corners; rounded rectangles exclude clipped corners', () => {
  const e = { type: 'ellipse', cx: 100, cy: 100, rx: 100, ry: 50 }
  assert.equal(hit.shapeInteriorHit(e, { x: 100, y: 100 }), true)
  assert.equal(hit.shapeInteriorHit(e, { x: 1, y: 51 }), false)
  assert.equal(hit.shapeInteriorHit({ ...rect('r', 0, 0, 100, 100), cornerRadius: 30 }, { x: 1, y: 1 }), false)
  assert.equal(hit.pointToSegmentDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }), 5)
})
