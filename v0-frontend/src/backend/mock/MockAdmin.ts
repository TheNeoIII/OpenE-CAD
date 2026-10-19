import { adminGuard, type AdminActionResult, type AdminBackend, type AdminUser, type AdminUserDetail, type AdminUserInput, type AdminUserUpdate, type AuditQuery, type SystemStatus } from '../admin'
import { can, permissionsForRoles, type Permission } from '../permissions'
import type { MockAuditLog } from './audit'

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), 100))

/** Mirrors the HTTP status the Rust server would return; this is NOT a security boundary. */
export class MockForbiddenError extends Error {
  readonly status = 403
}

/**
 * Development-only admin backend. All actions are simulated: no passwords, reset links,
 * TOTP secrets, passkeys or sessions exist. Results carry `simulated: true`.
 */
export class MockAdmin implements AdminBackend {
  private passkeys = new Map<string, AdminUserDetail['passkeys']>([['u-admin', [{ id: 'pk-1', name: 'YubiKey 5C', createdAt: '2026-03-02T10:00:00.000Z', lastUsedAt: '2026-10-19T07:41:00.000Z' }]]])

  constructor(private users: AdminUser[], private actor: () => AdminUser, private audit: MockAuditLog) {}

  private require(permission: Permission) {
    if (!can(this.actor(), permission)) throw new MockForbiddenError('Keine Berechtigung (Mock-Server: 403).')
  }

  private find(id: string) {
    const user = this.users.find((u) => u.id === id)
    if (!user) throw new Error('Benutzer nicht gefunden.')
    return user
  }

  private detail(user: AdminUser): AdminUserDetail {
    const passkeys = this.passkeys.get(user.id) ?? []
    return { ...user, passkeyCount: passkeys.length, passkeys, activeSessions: user.status === 'active' && user.lastLoginAt ? 1 : 0 }
  }

  private log(action: string, user: AdminUser, category: 'users' | 'auth' = 'users', metadata = {}) {
    this.audit.record(this.actor(), { category, action, resourceType: 'user', resourceId: user.id, resourceLabel: user.displayName, metadata: { ...metadata, simulated: true } })
  }

  private result(user: AdminUser, message: string): Promise<AdminActionResult> {
    return delay({ user: this.detail(user), simulated: true, message: `Development-only: ${message}` })
  }

  private guard(target: AdminUser, change: { disable?: boolean; demote?: boolean }) {
    const reason = adminGuard(this.users, this.actor().id, target, change)
    if (reason) throw new Error(reason)
  }

  async listUsers() { this.require('user.manage'); return delay(this.users) }
  async getUser(id: string) { this.require('user.manage'); return delay(this.detail(this.find(id))) }

  async createUser(input: AdminUserInput) {
    this.require('user.manage')
    const username = input.username.trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error('Benutzername: 3–32 Zeichen, a–z, 0–9, Punkt, Bindestrich, Unterstrich.')
    if (this.users.some((u) => u.username === username)) throw new Error('Benutzername ist bereits vergeben.')
    if (!input.displayName.trim() || !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error('Anzeigename und gültige E-Mail sind erforderlich.')
    const user: AdminUser = {
      id: `u-${crypto.randomUUID().slice(0, 8)}`, username, displayName: input.displayName.trim(), email: input.email.trim(),
      roles: [input.role], permissions: permissionsForRoles([input.role]), status: 'active',
      totpEnabled: false, passkeyCount: 0, lastLoginAt: null, mustChangePassword: true, createdAt: new Date().toISOString(),
    }
    this.users.push(user)
    this.log('user.created', user, 'users', { role: input.role })
    return delay(this.detail(user))
  }

  async updateUser(id: string, update: AdminUserUpdate) {
    this.require('user.manage')
    const user = this.find(id)
    const demote = user.roles.includes('admin') && update.role !== 'admin'
    this.guard(user, { demote })
    const roleChanged = !user.roles.includes(update.role)
    Object.assign(user, { displayName: update.displayName.trim(), email: update.email.trim(), mustChangePassword: update.mustChangePassword, roles: [update.role], permissions: permissionsForRoles([update.role]) })
    this.log(roleChanged ? 'user.roleChanged' : 'user.updated', user, 'users', roleChanged ? { role: update.role } : {})
    return delay(this.detail(user))
  }

  async enableUser(id: string) { this.require('user.manage'); const u = this.find(id); u.status = 'active'; this.log('user.enabled', u); return this.result(u, 'Benutzer aktiviert.') }
  async disableUser(id: string) {
    this.require('user.manage')
    const u = this.find(id)
    this.guard(u, { disable: true })
    u.status = 'disabled'
    this.log('user.disabled', u)
    return this.result(u, 'Benutzer deaktiviert, Sitzungen gelten als widerrufen.')
  }
  async unlockUser(id: string) { this.require('user.manage'); const u = this.find(id); if (u.status === 'locked') u.status = 'active'; this.log('user.unlocked', u); return this.result(u, 'Login-Sperre aufgehoben.') }
  async requestPasswordReset(id: string, mustChangePassword: boolean) {
    this.require('user.manage')
    const u = this.find(id)
    u.mustChangePassword = mustChangePassword || u.mustChangePassword
    this.log('password.reset', u, 'auth', { mustChangePassword })
    return this.result(u, 'Es wurde KEIN Reset-Link erzeugt oder versendet. Der Rust-Server übernimmt das.')
  }
  async revokeSessions(id: string) { this.require('user.manage'); const u = this.find(id); this.log('sessions.revoked', u, 'auth'); return this.result(u, 'Es existieren keine echten Sitzungen im Mock.') }
  async resetTotp(id: string) { this.require('user.manage'); const u = this.find(id); u.totpEnabled = false; this.log('totp.disabled', u, 'auth', { byAdmin: true }); return this.result(u, 'TOTP-Flag zurückgesetzt; kein echtes Secret betroffen.') }
  async removePasskey(id: string, passkeyId: string) {
    this.require('user.manage')
    const u = this.find(id)
    this.passkeys.set(id, (this.passkeys.get(id) ?? []).filter((p) => p.id !== passkeyId))
    u.passkeyCount = this.passkeys.get(id)!.length
    this.log('passkey.removed', u, 'auth', { passkeyId, byAdmin: true })
    return this.result(u, 'Passkey-Eintrag entfernt; kein echter Credential-Speicher betroffen.')
  }

  async listAudit(query: AuditQuery) { this.require('audit.read'); return delay(this.audit.query(query)) }

  async systemStatus(): Promise<SystemStatus> {
    this.require('user.manage')
    const count = (s: AdminUser['status']) => this.users.filter((u) => u.status === s).length
    return delay({ backend: 'Mock (Development)', version: 'dev', database: 'not_configured', storage: 'not_configured', activeSessions: null, users: { active: count('active'), disabled: count('disabled'), locked: count('locked') }, simulated: true })
  }
}
