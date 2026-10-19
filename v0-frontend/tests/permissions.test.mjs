import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const loadModule = (path, requireShim = () => ({})) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const moduleExports = {}
  new Function('exports', 'require', compiled)(moduleExports, requireShim)
  return moduleExports
}
const permissions = loadModule('../src/backend/permissions.ts')
const shim = (id) => (id === '@/backend/permissions' || id === '../permissions' ? permissions : {})
const { seedUsers, MOCK_ADMIN_ID, MOCK_USER_ID } = loadModule('../src/backend/mock/users.ts', shim)
const ownership = loadModule('../src/features/library/symbolOwnership.ts', shim)
const library = loadModule('../src/features/library/libraryPermissions.ts', shim)
const { MockAuditLog, MOCK_CLIENTS } = loadModule('../src/backend/mock/audit.ts')
const { auditParams } = loadModule('../src/backend/HttpOpenEcadBackend.ts', (id) => (id === './errors' ? loadModule('../src/backend/errors.ts') : {}))

const users = seedUsers()
const admin = users.find((u) => u.id === MOCK_ADMIN_ID)
const user = users.find((u) => u.id === MOCK_USER_ID)
const { can } = permissions

test('mock user cannot manage articles or system library data', () => {
  assert.equal(can(user, 'article.manage'), false)
  assert.equal(can(user, 'library.manageSystem'), false)
  assert.equal(library.canWriteDataView('articles', user), false)
  assert.equal(library.canManageSystemLibrary(user), false) // gates system potentials and wire styles
  assert.equal(library.canDeleteRows('articles', library.canManageArticles(user)), false)
  assert.equal(library.canWriteDataView('devices', user), true)
})

test('mock admin holds library permissions; article delete waits for a backend contract', () => {
  for (const p of ['article.manage', 'library.manageSystem', 'symbol.editSystem', 'symbol.editAny', 'audit.read']) assert.equal(can(admin, p), true, p)
  assert.equal(library.canWriteDataView('articles', admin), true)
  assert.equal(library.canDeleteRows('articles', library.canManageArticles(admin)), library.ARTICLE_DELETE_BACKEND_AVAILABLE)
})

test('inactive accounts are denied everything', () => {
  assert.equal(can({ ...admin, status: 'locked' }, 'article.manage'), false)
})

test('symbol ownership rules', () => {
  const own = ownership.symbolOrigin({ scope: 'user', ownerUserId: user.id })
  const foreign = ownership.symbolOrigin({ scope: 'user', ownerUserId: 'u-other' })
  const builtin = ownership.symbolOrigin(undefined)
  const systemCustom = ownership.symbolOrigin({ scope: 'system', ownerUserId: 'ignored' })
  assert.equal(ownership.canEditSymbol(user, own), true)
  assert.equal(ownership.canEditSymbol(user, foreign), false)
  assert.equal(ownership.canDuplicateSymbol(user), true)
  assert.equal(ownership.canEditSymbol(user, builtin), false)
  assert.equal(ownership.canEditSymbol(user, systemCustom), false)
  assert.equal(systemCustom.ownerUserId, null)
  assert.equal(ownership.canEditSymbol(admin, builtin), true)
  assert.equal(ownership.canEditSymbol(admin, foreign), true)
  assert.equal(ownership.canDeleteSymbol(admin, builtin), false)
})

test('audit page uses `events`, carries `source` and allows null client context', () => {
  const log = new MockAuditLog()
  log.record({ id: admin.id, displayName: admin.displayName }, { category: 'project', action: 'project.saved', resourceType: 'project', resourceLabel: 'P' })
  log.record(null, { category: 'system', action: 'system.backup', resourceType: 'system', resourceLabel: 'Backup', source: 'system' }, undefined, MOCK_CLIENTS.system)
  const page = log.query({ page: 1, pageSize: 25 })
  assert.deepEqual(Object.keys(page).sort(), ['events', 'page', 'pageSize', 'total'])
  assert.equal(page.total, 2)
  for (const event of page.events) assert.ok(['web', 'api', 'system'].includes(event.source))
  const systemEvent = page.events.find((e) => e.source === 'system')
  assert.ok(systemEvent)
  assert.equal(systemEvent.clientHostname ?? null, null)
})

test('audit filter parameters serialize IP and hostname, skip empty values', () => {
  const params = new URLSearchParams(auditParams({ clientIp: '192.168.1.25', clientHostname: 'PC-BÜRO 1', q: '', category: undefined, page: 2, pageSize: 25 }))
  assert.equal(params.get('clientIp'), '192.168.1.25')
  assert.equal(params.get('clientHostname'), 'PC-BÜRO 1')
  assert.equal(params.has('q'), false)
  assert.equal(params.has('category'), false)
  assert.equal(params.get('page'), '2')
})
