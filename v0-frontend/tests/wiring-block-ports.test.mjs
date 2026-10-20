import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function load(path, deps = {}) {
  const text = readFileSync(new URL(`../src/${path}.ts`, import.meta.url), 'utf8')
  const output = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, (name) => deps[name] ?? {})
  return exports
}
const cad = load('types/cad')
const geometry = load('features/drawing/geometry')
const ports = load('features/wiring/models/ports')
const shapes = load('features/wiring/models/shapes', { '@/types/cad': cad, '@/features/drawing/geometry': geometry })
const profiles = load('features/editorProfiles', { './wiring/profile': load('features/wiring/profile'), './schematic/profile': load('features/schematic/profile') })
let serial = 0
const format = { uid: (prefix) => `${prefix}-${++serial}` }
const clone = load('features/drawing/clone', { '@/utils/format': format })
const block = () => ({ id: 'b', type: 'diagramBlock', x: 100, y: 200, width: 300, height: 100, title: 'Switch', fields: [{ id: 'f', label: 'IP', value: '10.0.0.1' }], ports: ['top', 'right', 'left'].map((edge, i) => ({ id: `p${i}`, edge, t: 0.5, label: `LAN${i}` })) })
const page = () => ({ id: 'w', kind: 'wiring', lines: [], texts: [], diagramBlocks: [block()] })
const bounds = { x: 100, y: 200, w: 300, h: 100 }

test('legacy pages have empty block arrays and no anchors', () => {
  assert.deepEqual(cad.pageShapes({}).diagramBlocks, [])
  assert.deepEqual(ports.wiringPortAnchors({ kind: 'wiring' }), [])
})
for (const edge of ['top', 'right', 'bottom', 'left']) {
  test(`port coordinates on ${edge}: endpoints, midpoint and clamps`, () => {
    for (const t of [-1, 0, 0.5, 1, 2]) {
      const n = Math.max(0, Math.min(1, t))
      const expected = edge === 'top' ? { x: 100 + 300 * n, y: 200 } : edge === 'bottom' ? { x: 100 + 300 * n, y: 300 } : { x: edge === 'left' ? 100 : 400, y: 200 + 100 * n }
      assert.deepEqual(ports.portWorldPosition(bounds, { edge, t }), expected)
    }
  })
}
test('nearest edge projection equals rendered position including exterior corners', () => {
  for (const [point, edge] of [[{ x: 175, y: 201 }, 'top'], [{ x: 399, y: 225 }, 'right'], [{ x: 175, y: 299 }, 'bottom'], [{ x: 101, y: 225 }, 'left']]) {
    const anchor = ports.nearestPortAnchor(bounds, point)
    assert.equal(anchor.edge, edge)
    assert.equal(anchor.t, 0.25)
    assert.deepEqual(anchor.point, ports.portWorldPosition(bounds, anchor))
  }
  const corner = ports.nearestPortAnchor(bounds, { x: -900, y: -900 })
  assert.deepEqual(corner.point, { x: 100, y: 200 })
})
test('block creation bounds cover four drag directions and minimum size', () => {
  for (const x of [-100, 100]) for (const y of [-100, 100]) {
    const r = shapes.creationBounds({ x: 0, y: 0 }, { x, y })
    assert.deepEqual(r, { x: Math.min(0, x), y: Math.min(0, y), w: 100, h: 100 })
  }
  assert.equal(shapes.creationBounds({ x: 0, y: 0 }, { x: 9, y: 100 }), null)
  assert.equal(shapes.creationBounds({ x: 0, y: 0 }, { x: NaN, y: 100 }), null)
  assert.ok(shapes.creationBounds({ x: 0, y: 0 }, { x: 10, y: 10 }))
})
test('move and repeated resize preserve port records without drift', () => {
  const original = page()
  assert.deepEqual(shapes.graphicBounds(original.diagramBlocks[0]), bounds)
  let next = shapes.translateGraphics(original, ['b'], 50, -25)
  assert.equal(next.diagramBlocks[0].ports, original.diagramBlocks[0].ports)
  assert.deepEqual(ports.wiringPortAnchors(next)[1].point, { x: 450, y: 225 })
  for (let i = 0; i < 100; i++) next = shapes.resizeShapeOnPage(next, 'b', { x: 50, y: 75, w: 600 + i, h: 200 + i })
  assert.equal(next.diagramBlocks[0].ports, original.diagramBlocks[0].ports)
  assert.deepEqual(ports.wiringPortAnchors(next)[1].point, { x: 749, y: 224.5 })
})
test('clones get fresh owner, field and port IDs without shared data', () => {
  const original = block()
  for (let i = 0; i < 2; i++) {
    const copy = clone.cloneOwnedObject(original)
    assert.notEqual(copy.id, original.id)
    assert.notEqual(copy.fields[0].id, original.fields[0].id)
    assert.equal(copy.ports.length, 3)
    copy.ports.forEach((port, index) => {
      assert.ok(!original.ports.some((p) => p.id === port.id))
      assert.deepEqual({ ...port, id: original.ports[index].id }, original.ports[index])
    })
    copy.ports[0].label = 'Changed'
    assert.equal(original.ports[0].label, 'LAN0')
  }
})
test('owner selection and PageKind guard block tools and objects', () => {
  for (const kind of ['schematic', 'wiring', 'cover', 'report', undefined]) {
    for (const tool of ['block', 'port']) assert.equal(profiles.isToolAllowed(kind, tool), kind === 'wiring')
    assert.equal(profiles.isObjectAllowed(kind, block()), kind === 'wiring')
    assert.equal(!!ports.selectedPortOwner({ ...page(), kind }, ['b']), kind === 'wiring')
  }
  assert.equal(ports.selectedPortOwner(page(), []), undefined)
  assert.equal(ports.selectedPortOwner(page(), ['b', 'c']), undefined)
})
test('port update is immutable, clamps and can cross an edge', () => {
  const original = page()
  const updated = ports.updatePortOnPage(original, 'b', 'p1', { edge: 'top', t: 1.5 })
  assert.equal(updated.diagramBlocks[0].ports[1].edge, 'top')
  assert.equal(updated.diagramBlocks[0].ports[1].t, 1)
  assert.equal(original.diagramBlocks[0].ports[1].edge, 'right')
  assert.equal(updated.diagramBlocks[0].ports[0], original.diagramBlocks[0].ports[0])
})
test('JSON roundtrip retains block fields and normalized ports; electrical pages expose no anchors', () => {
  const original = page()
  assert.deepEqual(JSON.parse(JSON.stringify(original)), original)
  assert.deepEqual(ports.wiringPortAnchors({ ...original, kind: 'schematic' }), [])
  assert.deepEqual(ports.wiringPortAnchors({ ...original, diagramBlocks: [] }), [])
  assert.equal('x' in original.diagramBlocks[0].ports[0], false)
})
test('actions commit once, preserve undo snapshots and delete only the requested port', () => {
  let current = page()
  let ids = ['b']
  const history = []
  const state = { activePageId: 'w', get document() { return { pages: [current] } }, commit: (_, change) => { history.push(current); current = change({ pages: [current] }).pages[0] } }
  const actions = load('features/wiring/actions', {
    '@/stores/documentStore': { useDocumentStore: { getState: () => state } },
    '@/stores/selectionStore': { useSelectionStore: { getState: () => ({ ids, set: (next) => { ids = next } }) } },
    '@/types/cad': cad, '@/utils/format': format, '@/features/drawing/geometry': geometry, './models/shapes': shapes, './models/ports': ports,
  })
  actions.addPort('b', { edge: 'bottom', t: 0.75 })
  assert.equal(history.length, 1)
  assert.equal(current.diagramBlocks[0].ports.length, 4)
  assert.equal(history[0].diagramBlocks[0].ports.length, 3)
  actions.deletePort('b', 'p0')
  assert.equal(history.length, 2)
  assert.deepEqual(current.diagramBlocks[0].ports.slice(0, 2).map((p) => p.id), ['p1', 'p2'])
  actions.updatePort('b', 'p1', { edge: 'right', t: 0.5 })
  assert.equal(history.length, 2)
  ids = []
  actions.addPort('b', { edge: 'left', t: 0 })
  assert.equal(history.length, 2)
  actions.addDiagramBlock({ x: 0, y: 0 }, { x: 100, y: 100 })
  assert.equal(history.length, 3)
  assert.equal(current.diagramBlocks.length, 2)
  assert.equal(ids[0], current.diagramBlocks[1].id)
})
