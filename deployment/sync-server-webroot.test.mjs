import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'openecad-deploy-test-'))
  const repo = join(root, 'repo'), webroot = join(root, 'webroot'), bin = join(root, 'bin')
  for (const dir of [join(repo, 'deployment'), join(repo, 'v0-frontend/dist'), webroot, bin]) mkdirSync(dir, { recursive: true })
  copyFileSync(new URL('./sync-server-webroot.sh', import.meta.url), join(repo, 'deployment/sync-server-webroot.sh'))
  writeFileSync(join(repo, 'v0-frontend/package.json'), JSON.stringify({ packageManager: 'pnpm@12.3.4' }))
  writeFileSync(join(repo, 'v0-frontend/dist/index.html'), 'new build')
  writeFileSync(join(webroot, 'index.html'), 'live build')
  writeFileSync(join(bin, 'pnpm'), '#!/bin/bash\nif [[ "$1" == --version ]]; then printf "12.3.4\\n"; exit; fi\n[[ "$1" != "${FAIL_STEP:-never}" ]]\n', { mode: 0o755 })
  writeFileSync(join(bin, 'git'), '#!/bin/bash\nprintf "fixture-commit\\n"\n', { mode: 0o755 })
  // Stub only the publish boundary: these tests prove control flow, not rsync semantics.
  writeFileSync(join(bin, 'rsync'), '#!/bin/bash\nprintf "called\\n" >> "$TEST_ROOT/publish-calls"\n', { mode: 0o755 })
  const execute = (env = {}, target = webroot) => spawnSync('bash', [join(repo, 'deployment/sync-server-webroot.sh'), target], {
    cwd: tmpdir(), encoding: 'utf8', env: { PATH: `${bin}:${process.env.PATH}`, HOME: process.env.HOME, TEST_ROOT: root, ...env },
  })
  try { run({ root, repo, webroot, execute }) } finally { rmSync(root, { recursive: true, force: true }) }
}

test('install, typecheck and build failures never reach publish', () => fixture(({ root, webroot, execute }) => {
  for (const step of ['install', 'typecheck', 'build']) {
    const result = execute({ FAIL_STEP: step })
    assert.notEqual(result.status, 0)
    assert.equal(existsSync(join(root, 'publish-calls')), false)
    assert.equal(readFileSync(join(webroot, 'index.html'), 'utf8'), 'live build')
  }
}))

test('migration failure stops before publish and never logs hook secrets', () => fixture(({ root, execute }) => {
  const result = execute({ OPENECAD_MIGRATE_CMD: 'echo SECRET_TEST; exit 9' })
  assert.notEqual(result.status, 0)
  assert.equal(existsSync(join(root, 'publish-calls')), false)
  assert.doesNotMatch(result.stdout + result.stderr, /SECRET_TEST/)
}))

test('refuses storage overlap, repository overlap and conflicting webroot', () => fixture(({ repo, webroot, execute }) => {
  assert.notEqual(execute({ STORAGE_PATH: join(webroot, 'private') }).status, 0)
  assert.notEqual(execute({}, repo).status, 0)
  assert.notEqual(execute({ DEPLOY_WEBROOT: repo }).status, 0)
  assert.notEqual(execute({}, '/').status, 0)
}))

test('successful build reaches publication from unrelated cwd and reports absent hooks', () => fixture(({ root, execute }) => {
  const result = execute()
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.equal(readFileSync(join(root, 'publish-calls'), 'utf8').trim().split('\n').length, 2)
  assert.match(result.stdout, /OPENECAD_MIGRATE_CMD nicht gesetzt/)
  assert.match(result.stdout, /Backend-Gesundheit NICHT verifiziert/)
}))
