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
const interaction = load('features/wiring/models/interaction')
const shapes = load('features/wiring/models/shapes', { '@/types/cad': cad, '@/features/drawing/geometry': geometry })
const ports = load('features/wiring/models/ports', { '@/types/cad': cad, '@/features/drawing/geometry': geometry })
const inline = load('features/wiring/models/inlineEdit', { '@/types/cad': cad, './shapes': shapes, './ports': ports })

const viewport = load('features/drawing/viewport')
const grid = load('features/drawing/grid')
const snap = load('features/drawing/snap', { './geometry': geometry, './viewport': viewport })

const page = () => ({
  id: 'w', kind: 'wiring', texts: [{ id: 't', x: 0, y: 0, text: 'Hallo' }],
  lines: [{ id: 'l', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }] }],
  rectangles: [{ id: 'r', x: 0, y: 0, width: 50, height: 50 }],
  diagramBlocks: [{ id: 'b', x: 0, y: 0, width: 200, height: 100, title: 'Switch', fields: [{ id: 'f', label: 'IP', value: '10.0.0.1' }], ports: [{ id: 'p', edge: 'left', t: 0.5, label: 'LAN' }] }],
})

test('port anchors override grid and endpoints, while Alt disables snapping', () => {
  const viewport = load('features/drawing/viewport')
  const { resolveGraphicSnap } = load('features/drawing/snap', { './geometry': geometry, './viewport': viewport })
  const options = { scale: 1, grid: 20, gridSnap: true, ports: ports.wiringPortAnchors(page()).map((a) => a.point), anchors: [{ x: 2, y: 52 }] }
  assert.deepEqual(resolveGraphicSnap({ x: 2, y: 52 }, options), { point: { x: 0, y: 50 }, kind: 'port', label: 'Port' })
  assert.equal(resolveGraphicSnap({ x: 2, y: 52 }, { ...options, disabled: true }).kind, 'free')
})

test('port label placement defaults outside and preserves explicit sides when the edge changes', () => {
  for (const edge of ['left', 'right', 'top', 'bottom']) {
    assert.equal(ports.resolvePortLabelSide({ edge }), edge)
    assert.equal(ports.resolvePortLabelSide({ edge, labelPlacement: 'auto' }), edge)
    for (const labelPlacement of ['left', 'right', 'top', 'bottom']) {
      assert.equal(ports.portLabelLayout({ x: 0, y: 0 }, { edge, labelPlacement }).side, labelPlacement)
    }
  }
})

test('same-type hit selects, other hits create, Ctrl and drafts force creation', () => {
  const { toolPointerIntent } = interaction
  assert.equal(toolPointerIntent({ tool: 'rect', hitType: 'rectangle' }), 'select')
  assert.equal(toolPointerIntent({ tool: 'block', hitType: 'diagramBlock' }), 'select')
  assert.equal(toolPointerIntent({ tool: 'rect', hitType: 'ellipse' }), 'create')
  assert.equal(toolPointerIntent({ tool: 'rect' }), 'create')
  assert.equal(toolPointerIntent({ tool: 'rect', hitType: 'rectangle', forceCreate: true }), 'create')
  assert.equal(toolPointerIntent({ tool: 'line', hitType: 'line', drafting: true }), 'create')
})

test('escape ladder removes exactly one level per press', () => {
  const base = { editing: false, gesture: false, drafting: false, tool: 'rect', hasSelection: false }
  const { escapeAction } = interaction
  assert.equal(escapeAction({ ...base, editing: true, gesture: true }), 'cancelEdit')
  assert.equal(escapeAction({ ...base, gesture: true, drafting: true }), 'cancelGesture')
  assert.equal(escapeAction({ ...base, drafting: true, hasSelection: true }), 'cancelDraft')
  assert.equal(escapeAction({ ...base, tool: 'port', hasSelection: true }), 'exitTool')
  assert.equal(escapeAction({ ...base, hasSelection: true }), 'clearSelection')
  assert.equal(escapeAction(base), 'exitTool')
  assert.equal(escapeAction({ ...base, tool: 'select' }), 'none')
})

test('inline edits read and write exactly one string', () => {
  const p = page()
  const cases = [
    [{ kind: 'text', id: 't' }, 'Hallo', (q) => q.texts[0].text],
    [{ kind: 'label', id: 'r' }, '', (q) => q.rectangles[0].label],
    [{ kind: 'label', id: 'l' }, '', (q) => q.lines[0].label],
    [{ kind: 'blockTitle', id: 'b' }, 'Switch', (q) => q.diagramBlocks[0].title],
    [{ kind: 'fieldLabel', id: 'b', fieldId: 'f' }, 'IP', (q) => q.diagramBlocks[0].fields[0].label],
    [{ kind: 'fieldValue', id: 'b', fieldId: 'f' }, '10.0.0.1', (q) => q.diagramBlocks[0].fields[0].value],
    [{ kind: 'portLabel', id: 'b', portId: 'p' }, 'LAN', (q) => q.diagramBlocks[0].ports[0].label],
  ]
  for (const [target, before, read] of cases) {
    assert.equal(inline.readEditValue(p, target), before)
    const next = inline.applyEditOnPage(p, target, 'Neu')
    assert.equal(read(next), 'Neu')
    assert.equal(inline.readEditValue(next, target), 'Neu')
  }
  assert.equal(p.diagramBlocks[0].title, 'Switch', 'original page is not mutated')
  assert.equal(inline.readEditValue(p, { kind: 'blockTitle', id: 'gone' }), undefined)
  assert.equal(inline.applyEditOnPage({ ...p, kind: 'schematic' }, { kind: 'text', id: 't' }, 'X').texts[0].text, 'Hallo')
})

test('line vertex move changes one point, ignores invalid indices and skips itself as snap anchor', () => {
  const p = page()
  const moved = shapes.moveLineVertexOnPage(p, 'l', 1, { x: 120, y: 10 })
  assert.deepEqual(moved.lines[0].points, [{ x: 0, y: 0 }, { x: 120, y: 10 }, { x: 100, y: 50 }])
  assert.equal(shapes.moveLineVertexOnPage(p, 'l', 9, { x: 1, y: 1 }), p)
  assert.equal(shapes.moveLineVertexOnPage(p, 'nope', 0, { x: 1, y: 1 }), p)
  const anchors = shapes.graphicAnchors(p, [], { lineId: 'l', index: 1 })
  assert.equal(anchors.length, 2)
  assert.ok(!anchors.some((a) => a.x === 100 && a.y === 0))
})

for (const kind of ['port', 'endpoint', 'grid', 'free', 'alt']) {
  test(`Shift + ${kind} preserves hard anchors and truthful final metadata`, () => {
    const target = { x: 100, y: 50 }
    const options = { scale: 1, grid: 50, gridSnap: kind !== 'free', disabled: kind === 'alt', ports: kind === 'port' || kind === 'alt' ? [target] : [], anchors: kind === 'endpoint' || kind === 'alt' ? [target] : [] }
    const resolved = snap.resolveGraphicSnap(target, options)
    const final = snap.resolveConstrainedLinePoint(resolved, { x: 0, y: 0 }, true)
    if (kind === 'port' || kind === 'endpoint') {
      assert.equal(final, resolved)
      assert.deepEqual(final.point, target)
      assert.equal(final.kind, kind)
    } else {
      assert.deepEqual(final.point, geometry.constrain45({ x: 0, y: 0 }, resolved.point))
      assert.notDeepEqual(final.point, target)
      assert.equal(final.kind, 'free')
    }
    assert.equal(snap.resolveConstrainedLinePoint(resolved, undefined, true), resolved)
    assert.equal(snap.resolveConstrainedLinePoint(resolved, { x: 0, y: 0 }, false), resolved)
  })
}

const BASE_SCALE = 96 / 25.4 / 10
for (const zoom of [0.2, 0.5, 0.75, 1, 2]) {
  for (const lattice of [25, 50, 100]) {
    test(`grid ${lattice} at ${zoom * 100}% has screen-constant dots and world-stable snaps`, () => {
      const scale = viewport.scaleOf({ zoom, panX: 0, panY: 0 })
      assert.equal(scale, zoom * BASE_SCALE)
      assert.ok(Math.abs(grid.gridDotRadius(scale) * scale - grid.GRID_DOT_PX) < 1e-12)
      const step = grid.visibleGridStep(lattice, scale)
      assert.ok(step >= lattice)
      assert.equal(step % lattice, 0)
      assert.ok(step * scale >= grid.GRID_MIN_SPACING_PX)
      assert.deepEqual(grid.GRID_ORIGIN, { x: 0, y: 0 })
      const positions = grid.gridLinePositions(-201, 501, step, grid.GRID_ORIGIN.x)
      assert.ok(positions.length > 0)
      for (const x of positions) {
        assert.ok(x >= -201 && x <= 501)
        const point = { x, y: x }
        assert.deepEqual(snap.resolveGraphicSnap(point, { scale, grid: lattice, gridSnap: true }), { point, kind: 'grid', label: 'Raster' })
      }
    })
  }
}

test('thinned grid still snaps at an invisible intermediate lattice point', () => {
  const scale = viewport.scaleOf({ zoom: 0.2, panX: 0, panY: 0 })
  const step = grid.visibleGridStep(50, scale)
  assert.ok(step > 50)
  assert.ok(!grid.gridLinePositions(0, step, step).includes(50))
  assert.deepEqual(snap.resolveGraphicSnap({ x: 50, y: 50 }, { scale, grid: 50, gridSnap: true }), { point: { x: 50, y: 50 }, kind: 'grid', label: 'Raster' })
  assert.deepEqual(grid.gridLinePositions(-10, 110, 50, 10), [10, 60, 110])
})

test('port labels and inline anchors agree for all edges and placements', () => {
  for (const edge of ['left', 'right', 'top', 'bottom']) for (const labelPlacement of ['auto', 'left', 'right', 'top', 'bottom']) for (const s of [0.2 * BASE_SCALE, BASE_SCALE, 2 * BASE_SCALE]) {
    const p = page()
    const b = p.diagramBlocks[0]
    b.ports[0] = { ...b.ports[0], edge, labelPlacement }
    const point = ports.portWorldPosition(ports.portOwnerBounds(b), b.ports[0])
    const layout = ports.portLabelLayout(point, b.ports[0], s)
    const anchor = inline.editAnchor(p, { kind: 'portLabel', id: 'b', portId: 'p' }, s)
    const x = anchor.box.x + (anchor.align === 'end' ? anchor.box.w : anchor.align === 'middle' ? anchor.box.w / 2 : 0)
    assert.ok(Math.abs(x - layout.x) < 1e-9)
    assert.equal(anchor.align, layout.anchor)
    const baseline = layout.baseline === 'middle' ? layout.y + ports.PORT_LABEL_SIZE * 0.35 : layout.baseline === 'hanging' ? layout.y + ports.PORT_LABEL_SIZE : layout.y
    assert.ok(Math.abs(anchor.box.y + anchor.size - baseline) < 1e-9)
    if (layout.side === 'left') assert.ok(x < point.x)
    if (layout.side === 'right') assert.ok(x > point.x)
    if (layout.side === 'top') assert.ok(layout.y < point.y)
    if (layout.side === 'bottom') assert.ok(layout.y > point.y)
  }
})

function actionHarness(p) {
  let commits = 0
  const store = { activePageId: p.id, document: { pages: [p] }, commit: (_label, update) => { commits++; store.document = update(store.document) } }
  const actions = load('features/wiring/actions', {
    '@/stores/documentStore': { useDocumentStore: { getState: () => store } },
    '@/stores/selectionStore': { useSelectionStore: { getState: () => ({ set() {} }) } },
    '@/types/cad': cad, '@/features/drawing/geometry': geometry,
    './models/shapes': shapes, './models/ports': ports, './models/inlineEdit': inline,
  })
  return { actions, store, count: () => commits }
}

test('inline action commits once, skips unchanged and missing targets for every edit kind', () => {
  const p = page()
  p.ellipses = [{ id: 'e', type: 'ellipse', label: 'Alt' }]
  const targets = [{ kind: 'text', id: 't' }, ...['r', 'e', 'l'].map((id) => ({ kind: 'label', id })), { kind: 'blockTitle', id: 'b' }, { kind: 'fieldLabel', id: 'b', fieldId: 'f' }, { kind: 'fieldValue', id: 'b', fieldId: 'f' }, { kind: 'portLabel', id: 'b', portId: 'p' }]
  for (const target of targets) {
    const h = actionHarness(inline.applyEditOnPage(p, target, 'Alt'))
    h.actions.applyInlineEdit(target, 'Neu')
    assert.equal(h.count(), 1)
    assert.equal(inline.readEditValue(h.store.document.pages[0], target), 'Neu')
    h.actions.applyInlineEdit(target, 'Neu')
    h.actions.applyInlineEdit({ ...target, id: 'missing' }, 'X')
    h.store.document.pages = []
    h.actions.applyInlineEdit(target, 'X')
    assert.equal(h.count(), 1)
  }
})

test('vertex port snap preview equals one committed change on 2/3/5-point lines', () => {
  for (const count of [2, 3, 5]) {
    const p = page()
    p.lines[0].type = 'line'
    p.lines[0].points = Array.from({ length: count }, (_, i) => ({ x: 100 + i * 50, y: 100 + i * 20 }))
    const before = structuredClone(p)
    const options = { scale: 1, grid: 50, gridSnap: true, ports: ports.wiringPortAnchors(p).map((a) => a.point), anchors: shapes.graphicAnchors(p, [], { lineId: 'l', index: 0 }) }
    const resolved = snap.resolveGraphicSnap({ x: 2, y: 52 }, options)
    assert.equal(resolved.kind, 'port')
    const preview = shapes.moveLineVertexOnPage(p, 'l', 0, resolved.point)
    const h = actionHarness(p)
    assert.equal(h.count(), 0, 'preview/cancel does not commit')
    h.actions.moveLineVertex('l', 0, resolved.point)
    assert.equal(h.count(), 1)
    assert.deepEqual(h.store.document.pages[0], preview)
    assert.deepEqual(preview.lines[0].points.slice(1), before.lines[0].points.slice(1))
    assert.deepEqual(p, before)
    assert.equal(snap.resolveGraphicSnap({ x: 2, y: 52 }, { ...options, disabled: true }).kind, 'free')
    const moved = shapes.translateGraphics(preview, ['l'], 50, 25)
    assert.deepEqual(moved.lines[0].points, preview.lines[0].points.map(({ x, y }) => ({ x: x + 50, y: y + 25 })))
  }
})

test('fill opacity clamps, defaults to opaque and keeps none transparent', () => {
  for (const [value, expected] of [[undefined, 1], [-1, 0], [2, 1], [0, 0], [0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [1, 1]]) {
    assert.equal(shapes.clampOpacity(value), expected)
    assert.deepEqual(shapes.shapeFill({ fill: 'none', fillOpacity: value }), { fill: 'transparent' })
    const fill = shapes.shapeFill({ fill: '#123456', fillOpacity: value })
    assert.deepEqual(fill, expected === 0 ? { fill: 'transparent' } : expected === 1 ? { fill: '#123456' } : { fill: '#123456', fillOpacity: expected })
  }
})
