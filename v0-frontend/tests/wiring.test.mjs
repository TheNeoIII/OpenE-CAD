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

const xref = loadModule('../src/features/schematic/models/xref.ts')

const contact = (id) => ({ id, kind: 'contactNO', deviceId: 'dev-k1' })
const page = (id, kind, symbols) => ({ id, kind, number: id, symbols, wires: [] })

test('contact mirror ignores symbols on wiring pages', () => {
  const doc = { pages: [page('s1', 'schematic', [contact('a')]), page('w1', 'wiring', [contact('b')])] }
  const refs = xref.deviceContacts(doc, 'dev-k1', 'coil')
  assert.deepEqual(refs.map((r) => r.symbol.id), ['a'])
})

test('data tables and validation scope electrical evaluation to schematic pages', () => {
  const tables = readFileSync(new URL('../src/backend/mock/dataTables.ts', import.meta.url), 'utf8')
  const validation = readFileSync(new URL('../src/backend/mock/validation.ts', import.meta.url), 'utf8')
  assert.equal((tables.match(/doc\.pages\.filter\(\(p\) => p\.kind === 'schematic'\)/g) ?? []).length, 2)
  assert.match(validation, /page\.kind !== 'schematic'/)
})
