import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import ts from 'typescript'

const root = new URL('../src/', import.meta.url).pathname
const cache = new Map()
let serial = 0
function load(name, overrides = {}) {
  const path = resolve(root, name.endsWith('.ts') ? name : `${name}.ts`)
  if (cache.has(path) && !Object.keys(overrides).length) return cache.get(path)
  const output = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, (dep) => {
    if (dep in overrides) return overrides[dep]
    if (dep === '@/utils/format') return { uid: (prefix) => `${prefix}-${++serial}` }
    return load(dep.startsWith('@/') ? dep.slice(2) : resolve(dirname(path), dep))
  })
  if (!Object.keys(overrides).length) cache.set(path, exports)
  return exports
}
const cad = load('types/cad')
const domain = load('features/wiring/models/connections')
const routing = load('features/wiring/models/connectionRouting')
const shapes = load('features/wiring/models/shapes')
const ports = load('features/wiring/models/ports')
const clone = load('features/wiring/models/connectionClone')
const profiles = load('features/editorProfiles')
const inline = load('features/wiring/models/inlineEdit')
const point = (x, y) => ({ kind: 'point', point: { x, y } })
const endpoint = (objectId, portId = 'port') => ({ kind: 'port', objectId, portId })
const block = (id, x, edge) => ({ id, type: 'diagramBlock', title: id, x, y: 200, width: 200, height: 200, ports: [{ id: 'port', edge, t: 0.5 }] })
const connection = (start = endpoint('a'), end = endpoint('b')) => ({ id: 'connection', type: 'connection', connectionType: 'network', style: 'solid', start, end })
const page = () => ({ id: 'w', kind: 'wiring', lines: [], texts: [], symbols: [], wires: [], junctions: [], potentials: [], diagramBlocks: [block('a', 100, 'right'), block('b', 800, 'left')], connections: [connection()] })
function orthogonal(points) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    assert.ok(a.x === b.x || a.y === b.y, JSON.stringify(points))
    assert.notDeepEqual(a, b)
  }
}

test('legacy connection list is empty; endpoint resolution is owner scoped', () => {
  assert.deepEqual(cad.pageConnections({}), [])
  assert.deepEqual(domain.resolveConnectionEndpoint(page(), endpoint('a')), { x: 300, y: 300 })
  assert.deepEqual(domain.resolveConnectionEndpoint(page(), endpoint('b')), { x: 800, y: 300 })
  assert.deepEqual(domain.resolveConnectionEndpoint(page(), point(10, 20)), { x: 10, y: 20 })
  assert.equal(domain.resolveConnectionEndpoint(page(), endpoint('missing')), null)
  assert.equal(domain.resolveConnectionEndpoint(page(), endpoint('a', 'missing')), null)
})

test('JSON roundtrip preserves references without duplicated world positions', () => {
  const p = page()
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p)
  assert.deepEqual(Object.keys(p.connections[0].start).sort(), ['kind', 'objectId', 'portId'])
})

test('owner move, resize and port move resolve live without changing references', () => {
  const p = page(), c = p.connections[0]
  const moved = shapes.translateGraphics(p, ['a'], 40, 80)
  assert.deepEqual(domain.resolveConnectionEndpoint(moved, c.start), { x: 340, y: 380 })
  const resized = shapes.resizeShapeOnPage(p, 'a', { x: 100, y: 200, w: 400, h: 300 })
  assert.deepEqual(domain.resolveConnectionEndpoint(resized, c.start), { x: 500, y: 350 })
  const portMoved = ports.updatePortOnPage(p, 'a', 'port', { edge: 'top', t: 0.75 })
  assert.deepEqual(domain.resolveConnectionEndpoint(portMoved, c.start), { x: 250, y: 200 })
  for (const changed of [moved, resized, portMoved]) {
    assert.deepEqual(changed.connections[0], c)
    orthogonal(domain.resolveConnectionPolyline(changed, c))
  }
})

for (const startEdge of ['top', 'right', 'bottom', 'left']) for (const endEdge of ['top', 'right', 'bottom', 'left']) {
  test(`router follows outward normals: ${startEdge} to ${endEdge}`, () => {
    const normals = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }
    for (const b of [{ x: 400, y: 500 }, { x: -400, y: -500 }, { x: 0, y: 500 }, { x: 400, y: 0 }]) {
      const a = { x: 0, y: 0 }, route = routing.routeConnection(a, b, startEdge, endEdge)
      orthogonal(route)
      assert.deepEqual(route[0], a)
      assert.deepEqual(route.at(-1), b)
      const s = route[1], e = route.at(-2)
      assert.ok((s.x - a.x) * normals[startEdge][0] + (s.y - a.y) * normals[startEdge][1] > 0)
      assert.ok((e.x - b.x) * normals[endEdge][0] + (e.y - b.y) * normals[endEdge][1] > 0)
      assert.deepEqual(route, routing.routeConnection(a, b, startEdge, endEdge))
    }
  })
}

for (const mode of ['HV', 'VH']) test(`free routing ${mode}: aligned, diagonal and identical points`, () => {
  for (const b of [{ x: 400, y: 500 }, { x: -400, y: -500 }, { x: 0, y: 500 }, { x: 400, y: 0 }, { x: 0, y: 0 }]) orthogonal(routing.orthogonalRoute({ x: 0, y: 0 }, b, mode))
})

test('normalization removes duplicates and redundant collinear points, rejects diagonals', () => {
  assert.deepEqual(routing.normalizeOrthogonalPoints([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }]), [{ x: 0, y: 0 }, { x: 40, y: 0 }])
  assert.throws(() => routing.normalizeOrthogonalPoints([{ x: 0, y: 0 }, { x: 20, y: 30 }]))
})

for (const vertical of [true, false]) test(`segment editing preserves endpoints (${vertical ? 'vertical' : 'horizontal'})`, () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 100 }].map((p) => vertical ? p : { x: p.y, y: p.x })
  const next = routing.moveConnectionSegment(points, 1, { x: 150, y: 150 })
  orthogonal(next)
  assert.deepEqual(next[0], points[0])
  assert.deepEqual(next.at(-1), points.at(-1))
  assert.equal(vertical ? next[1].x : next[1].y, 150)
  for (const index of [0, points.length - 2]) {
    const boundary = routing.moveConnectionSegment(points, index, { x: 999, y: 999 })
    orthogonal(boundary)
    assert.deepEqual(boundary[0], points[0])
    assert.deepEqual(boundary.at(-1), points.at(-1))
    assert.notDeepEqual(boundary, points)
  }
})

test('manual waypoints remain persistent after owners move; output stays orthogonal', () => {
  const p = page(), c = { ...connection(), routePoints: [{ x: 400, y: 300 }, { x: 400, y: 600 }, { x: 700, y: 600 }] }
  p.connections = [c]
  const changed = shapes.translateGraphics(p, ['a'], 70, 90)
  assert.deepEqual(changed.connections[0].routePoints, c.routePoints)
  orthogonal(domain.resolveConnectionPolyline(changed, c))
})

test('delete detaches only selected owner/port references; unresolved data is preserved', () => {
  const p = page()
  const detached = domain.detachConnectionEndpoints(p, (e) => e.objectId === 'a' && e.portId === 'port')
  assert.deepEqual(detached.connections[0].start, point(300, 300))
  assert.deepEqual(detached.connections[0].end, endpoint('b'))
  assert.deepEqual(p.connections[0].start, endpoint('a'))
  const missing = { ...p, diagramBlocks: [] }
  assert.deepEqual(domain.detachConnectionEndpoints(missing, () => true).connections, p.connections)
  assert.deepEqual(domain.resolveConnectionPolyline(missing, p.connections[0]), [])
  const half = { ...p, diagramBlocks: [p.diagramBlocks[0]] }
  assert.deepEqual(domain.resolveConnectionPolyline(half, p.connections[0]), [{ x: 300, y: 300 }])
})

test('group clone remaps owner-scoped port IDs; connection-only copy materializes both ends', () => {
  const p = page(), objects = [...p.diagramBlocks, ...p.connections]
  const copies = clone.cloneConnectionGraph(clone.prepareConnectionCopy(p, objects))
  assert.deepEqual(copies[2].start, endpoint(copies[0].id, copies[0].ports[0].id))
  assert.deepEqual(copies[2].end, endpoint(copies[1].id, copies[1].ports[0].id))
  assert.notEqual(copies[2].id, 'connection')
  assert.notEqual(copies[0].ports[0].id, copies[1].ports[0].id)
  assert.deepEqual(clone.prepareConnectionCopy(p, [p.connections[0]])[0], { ...p.connections[0], start: point(300, 300), end: point(800, 300) })
  const partial = clone.prepareConnectionCopy(p, [p.diagramBlocks[0], p.connections[0]])
  assert.deepEqual(partial[1].start, endpoint('a'))
  assert.deepEqual(partial[1].end, point(800, 300))
})

for (const kind of ['wiring', 'schematic', 'cover', 'report', undefined]) test(`connection PageKind guard: ${kind}`, () => {
  assert.equal(profiles.isToolAllowed(kind, 'connection'), kind === 'wiring')
  assert.equal(profiles.isObjectAllowed(kind, connection()), kind === 'wiring')
  if (kind !== 'wiring') assert.deepEqual(domain.resolveConnectionPolyline({ ...page(), kind }, connection()), [])
})

test('resolved bounds, hit testing, geometric midpoint and inline edit follow the route', () => {
  const p = page(), c = connection(point(0, 0), point(400, 200))
  p.connections = [c]
  assert.deepEqual(domain.connectionBounds(p, c), { x: 0, y: 0, w: 400, h: 200 })
  assert.equal(domain.connectionHitTest(p, c, { x: 100, y: 5 }, 10), true)
  assert.equal(domain.connectionHitTest(p, c, { x: 100, y: 15 }, 10), false)
  assert.deepEqual(domain.connectionLabelPoint(p, c), { x: 300, y: 0 })
  const target = { kind: 'label', id: c.id }
  const edited = inline.applyEditOnPage(p, target, 'CAT7')
  assert.equal(inline.readEditValue(edited, target), 'CAT7')
  assert.ok(inline.editAnchor(edited, target))
  assert.equal(c.label, undefined)
})

test('creation, endpoint edit, inline label and port deletion each commit once; history restores binding', () => {
  let current = page(), ids = [], history = []
  current.connections = []
  const state = { activePageId: 'w', get document() { return { pages: [current] } }, commit: (_, change) => { history.push(current); current = change({ pages: [current] }).pages[0] } }
  const actions = load('features/wiring/actions', {
    '@/stores/documentStore': { useDocumentStore: { getState: () => state } },
    '@/stores/selectionStore': { useSelectionStore: { getState: () => ({ ids, set: (next) => { ids = next } }) } },
  })
  actions.addConnection(endpoint('a'), endpoint('b'))
  assert.equal(history.length, 1)
  const id = current.connections[0].id
  actions.updateConnection(id, { end: point(900, 500) })
  assert.equal(history.length, 2)
  actions.updateConnection(id, { end: endpoint('b') })
  assert.equal(history.length, 3)
  actions.applyInlineEdit({ kind: 'label', id }, 'LAN')
  actions.applyInlineEdit({ kind: 'label', id }, 'LAN')
  assert.equal(history.length, 4)
  actions.deletePort('a', 'port')
  assert.equal(history.length, 5)
  assert.deepEqual(current.connections[0].start, point(300, 300))
  current = history.pop()
  assert.deepEqual(current.connections[0].start, endpoint('a'))
  assert.equal(current.diagramBlocks[0].ports.length, 1)
})
