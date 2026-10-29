import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function session(kind, initial = '') {
  let value = initial
  let stored = initial
  let commits = 0
  let closed = false
  let refIndex = 0
  const refs = [{ current: false }, { current: null }]
  const exports = {}
  const jsx = (type, props) => ({ type, props })
  const source = fs.readFileSync(new URL('../src/features/wiring/components/WiringInlineEditor.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  const require = (name) => {
    if (name === 'react') return { useState: () => [value, (v) => { value = v }], useRef: () => refs[refIndex++], useEffect: () => {} }
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (name.includes('viewport')) return { scaleOf: () => 1, worldToScreen: (_, p) => p }
    if (name.includes('inlineEdit')) return { readEditValue: () => initial, editAnchor: () => ({ box: { x: 0, y: 0, w: 200 }, size: 24, align: 'start' }) }
    throw Error(name)
  }
  vm.runInNewContext(code, { exports, require })
  const render = () => {
    refIndex = 0
    return exports.WiringInlineEditor({ page: {}, view: {}, target: { kind }, onCancel: () => { closed = true }, onCommit: (v) => {
      closed = true
      if (v !== stored && (kind !== 'newText' || v.trim())) { stored = v; commits++ }
    } }).props
  }
  return {
    change: (v) => render().onChange({ target: { value: v } }),
    key: (key, extra = {}) => { let prevented = false; render().onKeyDown({ key, nativeEvent: {}, stopPropagation() {}, preventDefault() { prevented = true }, ...extra }); return prevented },
    blur: () => render().onBlur(),
    result: () => ({ stored, commits, closed }),
  }
}

test('dirty existing label + Escape commits once, subsequent blur cannot double commit', () => {
  const s = session('label', 'Alt'); s.change('Neu'); s.key('Escape'); s.blur()
  assert.deepEqual(s.result(), { stored: 'Neu', commits: 1, closed: true })
})
test('unchanged label + Escape closes without commit', () => {
  const s = session('label', 'Alt'); s.key('Escape'); assert.equal(s.result().commits, 0); assert.equal(s.result().closed, true)
})
test('new empty text + Escape creates nothing', () => {
  const s = session('newText'); s.key('Escape'); assert.equal(s.result().commits, 0)
})
test('new nonempty text + Escape preserves content', () => {
  const s = session('newText'); s.change('Test'); s.key('Escape'); assert.deepEqual(s.result(), { stored: 'Test', commits: 1, closed: true })
})
test('multiline Enter is native newline; Escape preserves both lines', () => {
  const s = session('label'); s.change('Zeile 1'); assert.equal(s.key('Enter'), false); assert.equal(s.result().closed, false)
  s.change('Zeile 1\nZeile 2'); s.key('Escape'); assert.equal(s.result().stored, 'Zeile 1\nZeile 2')
})
for (const modifier of ['ctrlKey', 'metaKey']) test(`${modifier}+Enter commits and closes`, () => {
  const s = session('text', 'Alt'); s.change('Neu'); assert.equal(s.key('Enter', { [modifier]: true }), true); assert.equal(s.result().commits, 1); assert.equal(s.result().closed, true)
})
test('IME Enter never commits', () => {
  const s = session('text'); s.change('文字'); s.key('Enter', { ctrlKey: true, nativeEvent: { isComposing: true } }); s.key('Enter', { ctrlKey: true, keyCode: 229 }); assert.equal(s.result().closed, false)
})
