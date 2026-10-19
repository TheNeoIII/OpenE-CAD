import type { AuditCategory, AuditEvent, AuditMetadata, AuditPage, AuditQuery, AuditResult, AuditSource } from '../admin'

export interface AuditActor {
  id: string
  displayName: string
}

/**
 * Simulated request context. In production the Rust server derives this from the socket
 * peer / trusted proxy headers; the mock only fabricates clearly fictitious LAN values.
 */
export interface AuditClientContext {
  clientIp: string | null
  clientHostname: string | null
  userAgent: string | null
  source?: AuditSource
}

export interface AuditInput {
  category: AuditCategory
  action: string
  result?: AuditResult
  resourceType: string
  resourceId: string | null
  resourceLabel: string
  projectId?: string | null
  metadata?: AuditMetadata
}

const FORBIDDEN_METADATA_KEYS = /password|hash|secret|token|cookie|csrf|recovery|credential|privatekey|document/i

/** Mock-only client contexts (RFC 1918 addresses, fictitious hostnames). */
export const MOCK_CLIENTS = {
  office: { clientIp: '192.168.1.25', clientHostname: 'PC-BUERO', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/131.0 [mock]' },
  laptop: { clientIp: '192.168.1.42', clientHostname: null, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/17.6 [mock]' },
  external: { clientIp: '10.20.0.7', clientHostname: null, userAgent: 'curl/8.5.0 [mock]', source: 'api' },
  system: { clientIp: null, clientHostname: null, userAgent: null, source: 'system' },
} satisfies Record<string, AuditClientContext>

/** Development-only in-memory audit trail. Provides no tamper resistance or retention guarantees. */
export class MockAuditLog {
  private events: AuditEvent[] = []
  private seq = 0

  record(actor: AuditActor | null, input: AuditInput, at = new Date().toISOString(), client: AuditClientContext = MOCK_CLIENTS.office) {
    const metadata: AuditMetadata = {}
    for (const [key, value] of Object.entries(input.metadata ?? {})) if (!FORBIDDEN_METADATA_KEYS.test(key)) metadata[key] = value
    const seq = ++this.seq
    this.events.unshift({
      id: `ae-${seq.toString().padStart(5, '0')}`,
      timestamp: at,
      actorUserId: actor?.id ?? null,
      actorDisplayName: actor?.displayName ?? 'Unbekannt',
      result: input.result ?? 'success',
      category: input.category,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceLabel: input.resourceLabel,
      projectId: input.projectId ?? null,
      clientIp: client.clientIp,
      clientHostname: client.clientHostname,
      userAgent: client.userAgent,
      requestId: `mock-req-${seq.toString(16).padStart(6, '0')}`,
      source: client.source ?? 'web',
      metadata,
    })
  }

  query(q: AuditQuery): AuditPage {
    const text = q.q?.trim().toLowerCase()
    const ip = q.clientIp?.trim()
    const host = q.clientHostname?.trim().toLowerCase()
    const filtered = this.events.filter((e) =>
      (!q.from || e.timestamp >= q.from) &&
      (!q.to || e.timestamp <= q.to) &&
      (!q.actorUserId || e.actorUserId === q.actorUserId) &&
      (!q.category || e.category === q.category) &&
      (!q.action || e.action === q.action) &&
      (!q.projectId || e.projectId === q.projectId) &&
      (!q.result || e.result === q.result) &&
      (!ip || (e.clientIp ?? '').startsWith(ip)) &&
      (!host || (e.clientHostname ?? '').toLowerCase().includes(host)) &&
      (!text || [e.actorDisplayName, e.action, e.resourceLabel, e.resourceId ?? '', e.clientIp ?? '', e.clientHostname ?? '', ...Object.values(e.metadata).map(String)].some((v) => v.toLowerCase().includes(text))))
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100)
    const page = Math.max(q.page, 1)
    return { events: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: filtered.length }
  }
}

export function seedAudit(log: MockAuditLog) {
  const admin = { id: 'u-admin', displayName: 'M. Krüger' }
  const user = { id: 'u-user', displayName: 'S. Yilmaz' }
  const day = (d: number, h: number) => new Date(Date.UTC(2026, 9, d, h, 12)).toISOString()
  const { office, laptop, external, system } = MOCK_CLIENTS
  const rows: [AuditActor | null, AuditInput, string, AuditClientContext][] = [
    [admin, { category: 'users', action: 'user.created', resourceType: 'user', resourceId: 'u-user', resourceLabel: 'S. Yilmaz', metadata: { role: 'user' } }, day(10, 8), office],
    [admin, { category: 'users', action: 'user.disabled', resourceType: 'user', resourceId: 'u-weber', resourceLabel: 'J. Weber' }, day(12, 9), office],
    [null, { category: 'auth', action: 'login.failure', result: 'failure', resourceType: 'user', resourceId: 'u-novak', resourceLabel: 'anovak', metadata: { reason: 'invalid_credentials', attempt: 5 } }, day(17, 11), external],
    [null, { category: 'auth', action: 'login.lockout', result: 'denied', resourceType: 'user', resourceId: 'u-novak', resourceLabel: 'anovak', metadata: { lockMinutes: 15 } }, day(17, 11), system],
    [user, { category: 'auth', action: 'login.success', resourceType: 'user', resourceId: 'u-user', resourceLabel: 'syilmaz', metadata: { method: 'password' } }, day(18, 16), laptop],
    [user, { category: 'project', action: 'project.saved', resourceType: 'project', resourceId: 'p-linden', resourceLabel: 'Schulzentrum Linden', projectId: 'p-linden', metadata: { stateRevision: 41 } }, day(18, 17), laptop],
    [user, { category: 'symbol', action: 'symbol.duplicated', resourceType: 'symbol', resourceId: 'usr-relay', resourceLabel: 'Koppelrelais (Variante)', metadata: { derivedFrom: 'relay-coil' } }, day(18, 17), laptop],
    [admin, { category: 'auth', action: 'login.success', resourceType: 'user', resourceId: 'u-admin', resourceLabel: 'mkrueger', metadata: { method: 'passkey' } }, day(19, 7), office],
    [admin, { category: 'library', action: 'article.updated', resourceType: 'article', resourceId: 'A9F04206', resourceLabel: 'Leitungsschutzschalter B6', metadata: { field: 'price' } }, day(19, 7), office],
    [admin, { category: 'library', action: 'wireStyle.updated', resourceType: 'wireStyle', resourceId: 'ws-pe', resourceLabel: 'Schutzleiter PE', metadata: { field: 'color' } }, day(19, 8), office],
  ]
  for (const [actor, input, at, client] of rows) log.record(actor, input, at, client)
}
