import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ configFile: false, root, server: { middlewareMode: true }, resolve: { alias: { '@': `${root}src` } } })
try {
  const lib = await server.ssrLoadModule('/src/features/schematic/models/symbolLibrary.ts')
  const { symbolLabelPosition, terminalLabelGroups } = await server.ssrLoadModule('/src/features/schematic/models/labels.ts')
  const { symbolPins } = await server.ssrLoadModule('/src/features/schematic/models/geometry.ts')
  const variants = lib.symbolVariants()
  assert.equal(variants.length, 17)
  assert.equal(new Set(variants.map((v) => v.key)).size, variants.length)
  for (const variant of variants) {
    const shapes = lib.symbolShapes(variant.kind, variant.poles)
    assert.ok(shapes.length > 0, variant.key)
    const original = lib.symbolDef(variant.kind)
    const copy = { id: 'copy', label: variant.label, description: original.description, bmkPrefix: original.bmkPrefix, category: original.category, mount: original.mount, shapes: structuredClone(shapes), pins: structuredClone(original.pins(variant)) }
    lib.setProjectSymbols({ customSymbols: [copy] })
    assert.deepEqual(lib.symbolShapes('custom:copy', 1), shapes, `${variant.key} graphic`)
    assert.deepEqual(lib.symbolDef('custom:copy').pins({ poles: 1 }), original.pins(variant), `${variant.key} pins`)
    assert.notEqual(copy.shapes, shapes)
    const box = lib.symbolDef('custom:copy').bbox({ poles: 1 })
    assert.ok([box.x, box.y, box.w, box.h].every(Number.isFinite))
    lib.setProjectSymbols(null)
  }
  for (const kind of ['breakerN', 'rcd']) {
    assert.deepEqual(lib.symbolDef(kind).pins({ poles: 1 }).map((p) => p.id), ['1', '2', 'N', "N'"])
    assert.equal(lib.symbolDef(kind).pins({ poles: 3 }).length, 8)
    assert.ok(lib.symbolShapes(kind, 1).some((s) => s.t === 'line' && s.x1 !== s.x2))
  }
  const original = lib.symbolShapes('rcd', 1)
  const untouched = lib.symbolShapes('rcd', 3)
  const pins = lib.symbolDef('rcd').pins({ poles: 1 })
  const adjusted = { symbolOverrides: { rcd: { geometry: { 1: { shapes: [...original, { t: 'circle', cx: -400, cy: 0, r: 25 }], pins: pins.map((p, i) => i === 0 ? { ...p, x: -450 } : p) } } } } }
  lib.setProjectSymbols(JSON.parse(JSON.stringify(adjusted)))
  assert.equal(lib.symbolDef('rcd').bbox({ poles: 1 }).x, -450)
  assert.equal(lib.symbolDef('rcd').pins({ poles: 1 })[0].x, -450)
  assert.deepEqual(lib.symbolShapes('rcd', 3), untouched)
  lib.setProjectSymbols(null)
  assert.deepEqual(lib.symbolShapes('rcd', 1), original, 'reset/project switch restores geometry')
  lib.setProjectSymbols(adjusted)
  assert.equal(lib.symbolShapes('rcd', 1).length, original.length + 1, 'snapshot restore reapplies geometry')
  lib.setProjectSymbols(null)
  const symbol = { id: 'test', type: 'symbol', kind: 'breakerN', deviceId: null, position: { x: 500, y: 500 }, rotation: 0, poles: 1 }
  const left = symbolLabelPosition(symbol), right = symbolLabelPosition({ ...symbol, labelSide: 'right' })
  assert.ok(left.x < symbol.position.x && right.x > symbol.position.x)
  assert.equal(left.anchor, 'end'); assert.equal(right.anchor, 'start')
  const custom = { ...symbol, labelSide: 'custom', labelOffset: { x: 180, y: -77 }, labelAnchor: 'start' }
  assert.deepEqual(symbolLabelPosition(custom), { x: 680, y: 423, top: 323, anchor: 'start' })
  assert.equal(symbolLabelPosition({ ...custom, position: { x: 600, y: 700 }, rotation: 90 }).x, 780)
  assert.deepEqual(symbolPins(symbol), symbolPins(custom), 'label movement cannot change electrical pins')
  const terminals = [0, 100].map((x, i) => ({ ...symbol, id: `t${i}`, kind: 'terminal', deviceId: 'strip', position: { x, y: 500 } }))
  assert.ok(terminalLabelGroups({ symbols: terminals }).has('t0'))
  assert.equal(terminalLabelGroups({ symbols: terminals.map((s) => ({ ...s, labelSide: 'custom' })) }).size, 0)
  console.log('Passed: all 17 variants, exact duplicate primitives/pins, neutral poles, geometry overrides, snapshot/JSON round-trip, label anchors and terminal grouping.')
} finally {
  await server.close()
}
