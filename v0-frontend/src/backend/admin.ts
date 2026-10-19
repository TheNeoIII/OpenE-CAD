import type { AccountStatus, AccountUser } from './auth'
import type { Role } from './permissions'

/** Admin list projection. Contains flags only — never secrets, hashes or credential material. */
export interface AdminUser extends AccountUser {
  email: string
  totpEnabled: boolean
  passkeyCount: number
  lastLoginAt: string | null
  mustChangePassword: boolean
  createdAt: string
}

export interface AdminPasskey {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
}

export interface AdminUserDetail extends AdminUser {
  passkeys: AdminPasskey[]
  activeSessions: number
}

export interface AdminUserInput {
  username: string
  displayName: string
  email: string
  role: Role
}

export interface AdminUserUpdate {
  displayName: string
  email: string
  role: Role
  mustChangePassword: boolean
}

/** Minimal directory entry visible to every authenticated user (owner badges, editor picker). */
export interface DirectoryUser {
  id: string
  username: string
  displayName: string
  status: AccountStatus
}

/**
 * Result of an admin security action. `simulated` is true only in the development
 * mock: no reset link, credential change or session revocation actually happened.
 */
export interface AdminActionResult {
  user: AdminUserDetail
  simulated: boolean
  message: string
}

export const AUDIT_CATEGORIES = ['auth', 'users', 'project', 'symbol', 'library'] as const
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: 'Anmeldung',
  users: 'Benutzer',
  project: 'Projekt',
  symbol: 'Symbol',
  library: 'Bibliothek',
}

export const AUDIT_ACTIONS: Record<AuditCategory, readonly string[]> = {
  auth: ['login.success', 'login.failure', 'login.lockout', 'logout', 'password.changed', 'password.reset', 'totp.enabled', 'totp.disabled', 'passkey.added', 'passkey.removed', 'sessions.revoked'],
  users: ['user.created', 'user.updated', 'user.enabled', 'user.disabled', 'user.roleChanged', 'user.unlocked'],
  project: ['project.created', 'project.saved', 'project.duplicated', 'project.archived', 'project.restored', 'project.trashed', 'project.deleted', 'project.imported', 'project.exported'],
  symbol: ['symbol.created', 'symbol.updated', 'symbol.duplicated', 'symbol.deleted', 'symbol.imported', 'systemSymbol.updated'],
  library: ['article.created', 'article.updated', 'article.deleted', 'article.imported', 'potential.updated', 'wireStyle.updated'],
}

export type AuditResult = 'success' | 'failure' | 'denied'

/** Metadata values are scalar and non-sensitive by contract (no secrets, cookies, tokens or documents). */
export type AuditMetadata = Record<string, string | number | boolean | null>

export interface AuditEvent {
  id: string
  timestamp: string
  actorUserId: string | null
  actorDisplayName: string
  category: AuditCategory
  action: string
  result: AuditResult
  resourceType: string
  resourceId: string | null
  resourceLabel: string
  projectId?: string | null
  /**
   * Request context. Determined exclusively by the Rust server (socket peer IP, forwarded
   * headers only from configured trusted proxies). Never sent or trusted from the browser.
   */
  clientIp: string | null
  /** Optional, best-effort reverse-DNS name. Informational only, never security relevant. */
  clientHostname: string | null
  userAgent: string | null
  requestId: string | null
  source: AuditSource
  metadata: AuditMetadata
}

export type AuditSource = 'web' | 'api' | 'system'

export interface AuditQuery {
  from?: string
  to?: string
  actorUserId?: string
  category?: AuditCategory
  action?: string
  projectId?: string
  result?: AuditResult
  clientIp?: string
  clientHostname?: string
  /** Free text: actor, action, resource, IP address and hostname. */
  q?: string
  page: number
  pageSize: number
}

export interface AuditPage {
  events: AuditEvent[]
  page: number
  pageSize: number
  total: number
}

export interface SystemStatus {
  backend: string
  version: string
  database: 'ok' | 'degraded' | 'unavailable' | 'not_configured'
  storage: 'ok' | 'degraded' | 'unavailable' | 'not_configured'
  activeSessions: number | null
  users: { active: number; disabled: number; locked: number }
  simulated: boolean
}

/** Admin endpoints. Every call is re-authorized by the Rust server (`user.manage` / `audit.read`). */
export interface AdminBackend {
  listUsers(): Promise<AdminUser[]>
  getUser(id: string): Promise<AdminUserDetail>
  createUser(input: AdminUserInput): Promise<AdminUserDetail>
  updateUser(id: string, update: AdminUserUpdate): Promise<AdminUserDetail>
  enableUser(id: string): Promise<AdminActionResult>
  disableUser(id: string): Promise<AdminActionResult>
  unlockUser(id: string): Promise<AdminActionResult>
  requestPasswordReset(id: string, mustChangePassword: boolean): Promise<AdminActionResult>
  revokeSessions(id: string): Promise<AdminActionResult>
  resetTotp(id: string): Promise<AdminActionResult>
  removePasskey(id: string, passkeyId: string): Promise<AdminActionResult>
  listAudit(query: AuditQuery): Promise<AuditPage>
  systemStatus(): Promise<SystemStatus>
}

/** Client-side mirror of server guards so the UI can explain why an action is unavailable. */
export function adminGuard(users: readonly AdminUser[], actorId: string | undefined, target: AdminUser, change: { disable?: boolean; demote?: boolean }): string | null {
  const activeAdmins = users.filter((u) => u.status === 'active' && u.roles.includes('admin'))
  const isLastAdmin = target.roles.includes('admin') && target.status === 'active' && activeAdmins.length <= 1
  if (change.disable && target.id === actorId) return 'Das eigene Konto kann nicht deaktiviert werden.'
  if (change.demote && target.id === actorId) return 'Die eigene Administratorrolle kann nicht entzogen werden.'
  if ((change.disable || change.demote) && isLastAdmin) return 'Der letzte aktive Administrator kann weder deaktiviert noch herabgestuft werden.'
  return null
}
