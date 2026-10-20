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

const page = () => ({
  id: 'w', kind: 'wiring', texts: [{ id: 't', x: 0, y: 0, text: 'Hallo' }],
  lines: [{ id: 'l', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }] }],
  rectangles: [{ id: 'r', x: 0, y: 0, width: 50, height: 50 }],
  diagramBlocks: [{ id: 'b', x: 0, y: 0, width: 200, height: 100, title: 'Switch', fields: [{ id: 'f', label: 'IP', value: '10.0.0.1' }], ports: [{ id: 'p', edge: 'left', t: 0.5, label: 'LAN' }] }],
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
