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
const grid = load(resolve(root, 'features/drawing/gridSettings'))
const units = load(resolve(root, 'utils/units'))
const { symbolGridStep } = load(resolve(root, 'workspaces/symbolEditor/symbolGrid'))

test('mm presets map to document world units', () => {
  assert.deepEqual(grid.GRID_PRESETS, [5, 10, 25, 50, 100, 250])
  assert.equal(units.formatMm(25), '2,5 mm')
  assert.equal(units.formatMm(5), '0,5 mm')
})

test('custom grid input accepts comma and dot, rejects invalid values', () => {
  assert.equal(grid.parseGridMm('2,5'), 25)
  assert.equal(grid.parseGridMm('0.5 mm'), 5)
  assert.equal(grid.parseGridMm('100'), 1000)
  for (const bad of ['', '0', '-1', 'abc', '0,05', '101', '1e2']) assert.equal(grid.parseGridMm(bad), null, bad)
})

test('v1 settings migrate to separate display and snap grids', () => {
  assert.deepEqual(grid.migrateGridSettings({ gridSize: 25 }), { gridSize: 25, snapGridSize: 25, snapFollowsGrid: true })
  assert.deepEqual(grid.migrateGridSettings({}), { gridSize: 50, snapGridSize: 50, snapFollowsGrid: true })
  assert.deepEqual(grid.migrateGridSettings({ gridSize: 'x' }), { gridSize: 50, snapGridSize: 50, snapFollowsGrid: true })
  assert.deepEqual(grid.migrateGridSettings({ gridSize: 50, snapGridSize: 5, snapFollowsGrid: false }), { gridSize: 50, snapGridSize: 5, snapFollowsGrid: false })
})

test('zoom input parses percent and clamps', () => {
  assert.equal(grid.parseZoomPercent('100'), 1)
  assert.equal(grid.parseZoomPercent('62,5 %'), 0.625)
  assert.equal(grid.parseZoomPercent('5000'), 8)
  assert.equal(grid.parseZoomPercent('abc'), null)
  assert.equal(grid.parseZoomPercent('0'), null)
})

test('symbol editor grid is independent of zoom', () => {
  assert.equal(symbolGridStep(5), 50)
  assert.equal(symbolGridStep(2.5), 25)
})
