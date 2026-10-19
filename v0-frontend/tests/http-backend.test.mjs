import assert from 'node:assert/strict'
import { test, afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Exercise the actual adapter without adding a second bundler/test dependency.
const loadModule = (path, requireShim = () => ({})) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const moduleExports = {}
  new Function('exports', 'require', compiled)(moduleExports, requireShim)
  return moduleExports
}
const errorsModule = loadModule('../src/backend/errors.ts')
const exports = loadModule('../src/backend/HttpOpenEcadBackend.ts', (id) => (id === './errors' ? errorsModule : {}))
const { HttpOpenEcadBackend, ApiError } = exports
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
afterEach(() => { globalThis.fetch = originalFetch; globalThis.window = originalWindow })
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

test('rejects external API bases and unsafe URL syntax', () => {
  for (const value of ['https://invalid.test/api', '//invalid.test', '/api?x=1', '/api#x', '/\\invalid']) assert.throws(() => new HttpOpenEcadBackend(value))
  assert.doesNotThrow(() => new HttpOpenEcadBackend('/custom/api/'))
})

test('obtains CSRF before mutations and rotates token after login', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/session')) return json({ user: null, csrfToken: 'pre-auth', expiresAt: null })
    if (url.endsWith('/login')) return json({ status: 'authenticated', session: { user: { id: 'test', displayName: 'Test', roles: ['user'] }, csrfToken: 'rotated', expiresAt: 'future' } })
    return new Response(null, { status: 204 })
  }
  const api = new HttpOpenEcadBackend()
  await api.account.login('test', 'test-fixture-only')
  await api.purgeProject('id/with slash')
  assert.equal(calls[0].url, '/api/auth/session')
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'pre-auth')
  assert.equal(calls[2].options.headers['X-CSRF-Token'], 'rotated')
  assert.equal(calls[2].url, '/api/projects/id%2Fwith%20slash')
  assert.equal(calls[2].options.credentials, 'same-origin')
  assert.equal(calls[2].options.redirect, 'error')
  assert.equal(calls[2].options.cache, 'no-store')
})

test('preserves server lockout and does not retry login', async () => {
  let attempts = 0
  globalThis.fetch = async (url) => url.endsWith('/session') ? json({ user: null, csrfToken: 'token' }) : (attempts++, json({ error: { code: 'LOCKED', message: 'Temporär gesperrt' } }, 429, { 'Retry-After': '93' }))
  await assert.rejects(new HttpOpenEcadBackend().account.login('test', 'fixture'), (error) => error instanceof ApiError && error.retryAfterSeconds === 93 && error.code === 'LOCKED')
  assert.equal(attempts, 1)
})

test('401 protected calls signal expiry, login failures do not', async () => {
  let expired = 0
  globalThis.window = { dispatchEvent: () => { expired++ } }
  globalThis.fetch = async (url) => url.endsWith('/session') ? json({ user: null, csrfToken: 'token' }) : json({ error: { code: 'UNAUTHORIZED', message: 'Nicht angemeldet' } }, 401)
  const api = new HttpOpenEcadBackend()
  await assert.rejects(api.account.login('test', 'fixture'))
  assert.equal(expired, 0)
  await assert.rejects(api.listProjects())
  assert.equal(expired, 1)
})

test('SPA fallback and network failure cannot be treated as success', async () => {
  const api = new HttpOpenEcadBackend()
  globalThis.fetch = async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } })
  await assert.rejects(api.listProjects(), /SPA-Fallback/)
  globalThis.fetch = async () => { throw new Error('offline') }
  await assert.rejects(api.listProjects(), /nicht erreichbar/)
})

test('all domain routes preserve existing interface payloads', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push([url, options.method, options.body && JSON.parse(options.body)])
    return json(url.endsWith('/session') ? { user: null, csrfToken: 'token' } : {})
  }
  const api = new HttpOpenEcadBackend()
  const project = { id: 'project' }
  const document = { id: 'document' }
  await api.listTemplates(); await api.openProject('project'); await api.createProject({ name: 'New' })
  await api.updateProject(project); await api.duplicateProject('project', 'Copy'); await api.archiveProject('project', true)
  await api.saveProject(project, document); await api.getPage('document', 'page'); await api.updateObjects('document', 'page', [])
  await api.listArticles('a&b'); await api.validateProject(document); await api.getDataTable('articles', null)
  await api.exportDocuments(document, { kind: 'pdf' }); await api.account.verifySecondFactor('recovery', 'one-time'); await api.account.security(); await api.account.logout()
  assert.deepEqual(calls.filter(([url]) => !url.endsWith('/session')), [
    ['/api/project-templates', 'GET', undefined], ['/api/projects/project', 'GET', undefined], ['/api/projects', 'POST', { name: 'New' }],
    ['/api/projects/project', 'PUT', { project }], ['/api/projects/project/duplicate', 'POST', { name: 'Copy' }], ['/api/projects/project/archive', 'POST', { archived: true }],
    ['/api/projects/project/document', 'PUT', { project, document }], ['/api/documents/document/pages/page', 'GET', undefined], ['/api/documents/document/pages/page/objects', 'PUT', { objects: [] }],
    ['/api/articles?query=a%26b', 'GET', undefined], ['/api/documents/document/validate', 'POST', { document }], ['/api/data-tables', 'POST', { view: 'articles', document: null }],
    ['/api/export', 'POST', { document, options: { kind: 'pdf' } }], ['/api/auth/recovery/verify', 'POST', { code: 'one-time' }], ['/api/account/security', 'GET', undefined], ['/api/auth/logout', 'POST', undefined],
  ])
})
