import type { AuditCategory, AuditEvent, AuditMetadata, AuditPage, AuditQuery, AuditResult } from '../admin'

export interface AuditActor {
  id: string
  displayName: string
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

/** Development-only in-memory audit trail. Provides no tamper resistance or retention guarantees. */
export class MockAuditLog {
  private events: AuditEvent[] = []
  private seq = 0

  record(actor: AuditActor | null, input: AuditInput, at = new Date().toISOString()) {
    const metadata: AuditMetadata = {}
    for (const [key, value] of Object.entries(input.metadata ?? {})) if (!FORBIDDEN_METADATA_KEYS.test(key)) metadata[key] = value
    this.events.unshift({
      id: `ae-${(++this.seq).toString().padStart(5, '0')}`,
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
      metadata,
    })
  }

  query(q: AuditQuery): AuditPage {
    const text = q.q?.trim().toLowerCase()
    const filtered = this.events.filter((e) =>
      (!q.from || e.timestamp >= q.from) &&
      (!q.to || e.timestamp <= q.to) &&
      (!q.actorUserId || e.actorUserId === q.actorUserId) &&
      (!q.category || e.category === q.category) &&
      (!q.action || e.action === q.action) &&
      (!q.projectId || e.projectId === q.projectId) &&
      (!q.result || e.result === q.result) &&
      (!text || [e.actorDisplayName, e.action, e.resourceLabel, e.resourceId ?? '', ...Object.values(e.metadata).map(String)].some((v) => v.toLowerCase().includes(text))))
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100)
    const page = Math.max(q.page, 1)
    return { events: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: filtered.length }
  }
}

export function seedAudit(log: MockAuditLog) {
  const admin = { id: 'u-admin', displayName: 'M. Krüger' }
  const user = { id: 'u-user', displayName: 'S. Yilmaz' }
  const day = (d: number, h: number) => new Date(Date.UTC(2026, 9, d, h, 12)).toISOString()
  const rows: [AuditActor | null, AuditInput, string][] = [
    [admin, { category: 'users', action: 'user.created', resourceType: 'user', resourceId: 'u-user', resourceLabel: 'S. Yilmaz', metadata: { role: 'user' } }, day(10, 8)],
    [admin, { category: 'users', action: 'user.disabled', resourceType: 'user', resourceId: 'u-weber', resourceLabel: 'J. Weber' }, day(12, 9)],
    [null, { category: 'auth', action: 'login.failure', result: 'failure', resourceType: 'user', resourceId: 'u-novak', resourceLabel: 'anovak', metadata: { reason: 'invalid_credentials', attempt: 5 } }, day(17, 11)],
    [null, { category: 'auth', action: 'login.lockout', result: 'denied', resourceType: 'user', resourceId: 'u-novak', resourceLabel: 'anovak', metadata: { lockMinutes: 15 } }, day(17, 11)],
    [user, { category: 'auth', action: 'login.success', resourceType: 'user', resourceId: 'u-user', resourceLabel: 'syilmaz', metadata: { method: 'password' } }, day(18, 16)],
    [user, { category: 'project', action: 'project.saved', resourceType: 'project', resourceId: 'p-linden', resourceLabel: 'Schulzentrum Linden', projectId: 'p-linden', metadata: { stateRevision: 41 } }, day(18, 17)],
    [user, { category: 'symbol', action: 'symbol.duplicated', resourceType: 'symbol', resourceId: 'usr-relay', resourceLabel: 'Koppelrelais (Variante)', metadata: { derivedFrom: 'relay-coil' } }, day(18, 17)],
    [admin, { category: 'auth', action: 'login.success', resourceType: 'user', resourceId: 'u-admin', resourceLabel: 'mkrueger', metadata: { method: 'passkey' } }, day(19, 7)],
    [admin, { category: 'library', action: 'article.updated', resourceType: 'article', resourceId: 'A9F04206', resourceLabel: 'Leitungsschutzschalter B6', metadata: { field: 'price' } }, day(19, 7)],
  ]
  for (const [actor, input, at] of rows) log.record(actor, input, at)
}
