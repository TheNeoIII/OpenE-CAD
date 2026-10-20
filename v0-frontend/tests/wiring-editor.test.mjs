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

const profiles = loadModule('../src/features/editorProfiles.ts', {
  './schematic/profile': loadModule('../src/features/schematic/profile.ts'), './wiring/profile': wiringProfile,
})

test('page profiles never default to electrical tools', () => {
  for (const kind of ['cover', 'report', undefined]) assert.equal(profiles.pageTools(kind).size, 0)
  for (const tool of ['wire', 'place']) assert.equal(profiles.isToolAllowed('schematic', tool), true)
  for (const tool of ['rect', 'ellipse']) assert.equal(profiles.isToolAllowed('schematic', tool), false)
  for (const tool of ['rect', 'ellipse', 'line', 'text']) assert.equal(profiles.isToolAllowed('wiring', tool), true)
})

test('registered electrical commands reject wiring, cover, report and missing pages', () => {
  let kind
  let commands
  loadModule('../src/commands/commands.ts', {
    './registry': { registerCommands: (list) => { commands = new Map(list.map((c) => [c.id, c])) } },
    '@/features/editorProfiles': profiles,
    '@/stores/documentStore': { getActivePage: () => kind ? { kind } : null },
    '@/stores/projectStore': { useProjectStore: { getState: () => ({ current: {} }) } },
    '@/stores/uiStore': { useUiStore: { getState: () => ({ workspace: 'schematic' }) } },
  })
  for (const k of ['schematic', 'wiring', 'cover', 'report', undefined]) {
    kind = k
    for (const id of ['tool.wire', 'tool.routeMode', 'insert.symbol', 'insert.contactor', 'insert.breaker', 'insert.coil', 'insert.contactNO', 'insert.terminal', 'insert.motor', 'insert.potential', 'insert.xref', 'xref.goto']) {
      assert.equal(commands.get(id).isEnabled(), k === 'schematic', `${k}: ${id}`)
    }
    for (const id of ['tool.rect', 'tool.ellipse']) assert.equal(commands.get(id).isEnabled(), k === 'wiring')
    for (const id of ['tool.line', 'tool.text']) assert.equal(commands.get(id).isEnabled(), k === 'schematic' || k === 'wiring')
  }
})

test('clipboard compatibility prevents electrical objects and xrefs entering wiring', () => {
  for (const type of ['symbol', 'wire', 'junction', 'potential']) assert.equal(profiles.isObjectAllowed('wiring', { type }), false)
  assert.equal(profiles.isObjectAllowed('wiring', { type: 'text', style: 'xref' }), false)
  for (const type of ['line', 'rectangle', 'ellipse', 'image', 'text']) {
    assert.equal(profiles.isObjectAllowed('wiring', { type }), true)
    assert.equal(profiles.isObjectAllowed('cover', { type }), false)
    assert.equal(profiles.isObjectAllowed('report', { type }), false)
  }
})

test('shape creation normalizes all four drag directions and rejects tiny geometry', () => {
  for (const end of [{ x: 200, y: 200 }, { x: 0, y: 200 }, { x: 200, y: 0 }, { x: 0, y: 0 }]) {
    assert.deepEqual(shapes.creationBounds({ x: 100, y: 100 }, end), { x: Math.min(100, end.x), y: Math.min(100, end.y), w: 100, h: 100 })
  }
  for (const end of [{ x: 100, y: 100 }, { x: 109, y: 200 }, { x: NaN, y: 200 }]) assert.equal(shapes.creationBounds({ x: 100, y: 100 }, end), null)
})

test('shape actions commit once, ignore invalid geometry and reject other page kinds', () => {
  let doc = { pages: [{ id: 'p', kind: 'wiring', rectangles: [], ellipses: [] }] }
  const history = []
  const store = { activePageId: 'p', get document() { return doc }, commit: (label, fn) => { history.push(doc); doc = fn(doc) } }
  const actions = loadModule('../src/features/wiring/actions.ts', {
    '@/stores/documentStore': { useDocumentStore: { getState: () => store } },
    '@/stores/selectionStore': { useSelectionStore: { getState: () => ({ set() {} }) } },
    '@/types/cad': cad, '@/features/drawing/geometry': geo,
    '@/utils/format': { uid: (prefix) => prefix + history.length }, './models/shapes': shapes,
  })
  actions.addRectangle({ x: 200, y: 300 }, { x: 50, y: 100 })
  assert.equal(history.length, 1)
  assert.deepEqual(shapes.shapeBox(doc.pages[0].rectangles[0]), { x: 50, y: 100, w: 150, h: 200 })
  actions.addEllipse({ x: 0, y: 0 }, { x: 100, y: 50 })
  assert.equal(history.length, 2)
  actions.addRectangle({ x: 0, y: 0 }, { x: 1, y: 2 })
  assert.equal(history.length, 2)
  for (const kind of ['schematic', 'cover', 'report']) {
    doc = { pages: [{ ...doc.pages[0], kind }] }
    actions.addEllipse({ x: 0, y: 0 }, { x: 100, y: 100 })
    assert.equal(history.length, 2)
  }
})

test('shape bounds retain the exact snap point used by the preview', () => {
  const preview = snap.resolveGraphicSnap({ x: 168, y: 236 }, { scale: 1, grid: 50, gridSnap: true, anchors: [] })
  const committed = shapes.creationBounds({ x: 50, y: 50 }, preview.point)
  assert.deepEqual({ x: committed.x + committed.w, y: committed.y + committed.h }, preview.point)
})

test('legacy images migrate centrally, preserve existing legacySrc and are idempotent', () => {
  const normalize = loadModule('../src/utils/pageOrganization.ts', {
    '@/features/wiring/models/shapes': shapes,
    './pages': { sortedPages: (doc) => doc.pages, groupNo: () => 0 },
  }).normalizePages
  const doc = { functionGroups: [{ id: 'g' }], pages: [{ id: 'p', number: '0.1', functionGroup: 'g', potentials: [], images: [
    { src: 'data:image/png;base64,old' }, { src: 'data:image/png;base64,old', legacySrc: 'kept' }, { src: 123 }, { src: undefined }, { src: 'https://external/image' },
  ] }, { id: 'q', number: '0.2', functionGroup: 'g', potentials: [] }] }
  const out = normalize(doc)
  assert.deepEqual(out.pages[0].images, [{ legacySrc: 'data:image/png;base64,old' }, { legacySrc: 'kept' }, {}, {}, {}])
  assert.deepEqual(normalize(out), out)
  assert.equal(doc.pages[0].images[0].src, 'data:image/png;base64,old')
})

test('terminal report excludes wiring, cover and report symbols', () => {
  const report = loadModule('../src/features/schematic/models/terminalReport.ts')
  const doc = { devices: [], pages: ['wiring', 'cover', 'report', 'schematic'].map((kind) => ({ kind, number: kind, symbols: [{ kind: 'terminal', terminalNo: '1' }] })) }
  assert.deepEqual(report.terminalReportRows(doc), [['—', '1', '', '—', '/schematic']])
})

test('wiring production source does not generate data URLs', async () => {
  const { readdirSync } = await import('node:fs')
  const base = new URL('../src/features/wiring/', import.meta.url)
  for (const name of readdirSync(base, { recursive: true }).filter((n) => /\.tsx?$/.test(n))) {
    assert.equal(readFileSync(new URL(name, base), 'utf8').includes('readAsDataURL'), false, name)
  }
})

test('schematic canvas no longer carries wiring shape code', () => {
  const src = readFileSync(new URL('../src/features/schematic/components/SchematicCanvas.tsx', import.meta.url), 'utf8')
  for (const needle of ['addRectangle', 'addEllipse', 'pageShapes', "'rect'", "'ellipse'"]) assert.equal(src.includes(needle), false, needle)
})
