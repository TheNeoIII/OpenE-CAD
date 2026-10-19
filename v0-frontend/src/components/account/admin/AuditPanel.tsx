import { useDeferredValue, useState } from 'react'
import useSWR from 'swr'
import { backend } from '@/backend'
import { AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_CATEGORY_LABELS, type AuditCategory, type AuditMetadata, type AuditQuery, type AuditResult, type AuditSource } from '@/backend/admin'
import { Badge, Button, Field, Input, Select, Spinner } from '@/components/ui/primitives'

const PAGE_SIZE = 25
const RESULT_TONE: Record<AuditResult, 'ok' | 'error' | 'warn'> = { success: 'ok', failure: 'error', denied: 'warn' }
const RESULT_LABEL: Record<AuditResult, string> = { success: 'Erfolg', failure: 'Fehler', denied: 'Abgelehnt' }
const SOURCE_LABEL: Record<AuditSource, string> = { web: 'Web', api: 'API', system: 'System' }

function ClientCell({ hostname, ip }: { hostname: string | null; ip: string | null }) {
  if (!hostname && !ip) return <span className="text-muted" aria-label="Keine Clientinformation">—</span>
  return <>
    {hostname && <span className="block text-fg">{hostname}</span>}
    {ip && <span className={`block font-mono tabular-nums ${hostname ? 'text-[11px] text-muted' : 'text-[11.5px] text-fg-2'}`}>{ip}</span>}
  </>
}

function AuditDetails({ metadata, userAgent, requestId, source }: { metadata: AuditMetadata; userAgent: string | null; requestId: string | null; source: AuditSource }) {
  const summary = Object.entries(metadata).map(([k, v]) => `${k}=${String(v)}`).join(' · ') || '—'
  return <details className="group">
    <summary className="cursor-pointer list-none marker:hidden"><span className="group-open:text-fg-2">{summary}</span></summary>
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-sans text-[11px]">
      <dt className="text-muted">Quelle</dt><dd className="text-fg-2">{SOURCE_LABEL[source]}</dd>
      <dt className="text-muted">Request-ID</dt><dd className="break-all font-mono text-fg-2">{requestId ?? '—'}</dd>
      <dt className="text-muted">User-Agent</dt><dd className="max-w-[28rem] break-words text-fg-2">{userAgent ?? '—'}</dd>
    </dl>
  </details>
}

export function AuditPanel() {
  const [filter, setFilter] = useState<Omit<AuditQuery, 'page' | 'pageSize'>>({})
  const [page, setPage] = useState(1)
  const q = useDeferredValue(filter.q)
  const clientIp = useDeferredValue(filter.clientIp)
  const clientHostname = useDeferredValue(filter.clientHostname)
  const query: AuditQuery = { ...filter, q, clientIp, clientHostname, page, pageSize: PAGE_SIZE }
  const { data, error, isLoading } = useSWR(['admin-audit', JSON.stringify(query)], () => backend.admin!.listAudit(query), { keepPreviousData: true })
  const { data: directory } = useSWR('user-directory', () => backend.listUserDirectory())
  const { data: projects } = useSWR('audit-projects', () => backend.listProjects())
  const update = (patch: Partial<typeof filter>) => { setFilter({ ...filter, ...patch }); setPage(1) }
  const actions = filter.category ? AUDIT_ACTIONS[filter.category] : AUDIT_CATEGORIES.flatMap((c) => AUDIT_ACTIONS[c])
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return <div className="flex h-full min-h-0 flex-col">
    <form role="search" aria-label="Audit-Log filtern" className="grid shrink-0 grid-cols-2 gap-2 border-b border-line bg-panel p-3 md:grid-cols-5 xl:grid-cols-10" onSubmit={(e) => e.preventDefault()}>
      <Field label="Von" htmlFor="af-from"><Input id="af-from" type="date" value={filter.from?.slice(0, 10) ?? ''} onChange={(e) => update({ from: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined })} /></Field>
      <Field label="Bis" htmlFor="af-to"><Input id="af-to" type="date" value={filter.to?.slice(0, 10) ?? ''} onChange={(e) => update({ to: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined })} /></Field>
      <Field label="Benutzer" htmlFor="af-user"><Select id="af-user" value={filter.actorUserId ?? ''} onChange={(e) => update({ actorUserId: e.target.value || undefined })}><option value="">Alle</option>{directory?.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}</Select></Field>
      <Field label="Kategorie" htmlFor="af-cat"><Select id="af-cat" value={filter.category ?? ''} onChange={(e) => update({ category: (e.target.value || undefined) as AuditCategory | undefined, action: undefined })}><option value="">Alle</option>{AUDIT_CATEGORIES.map((c) => <option key={c} value={c}>{AUDIT_CATEGORY_LABELS[c]}</option>)}</Select></Field>
      <Field label="Aktion" htmlFor="af-action"><Select id="af-action" value={filter.action ?? ''} onChange={(e) => update({ action: e.target.value || undefined })}><option value="">Alle</option>{actions.map((a) => <option key={a} value={a}>{a}</option>)}</Select></Field>
      <Field label="Projekt" htmlFor="af-project"><Select id="af-project" value={filter.projectId ?? ''} onChange={(e) => update({ projectId: e.target.value || undefined })}><option value="">Alle</option>{projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Ergebnis" htmlFor="af-result"><Select id="af-result" value={filter.result ?? ''} onChange={(e) => update({ result: (e.target.value || undefined) as AuditResult | undefined })}><option value="">Alle</option>{(Object.keys(RESULT_LABEL) as AuditResult[]).map((r) => <option key={r} value={r}>{RESULT_LABEL[r]}</option>)}</Select></Field>
      <Field label="IP-Adresse" htmlFor="af-ip"><Input id="af-ip" inputMode="decimal" placeholder="192.168.1." value={filter.clientIp ?? ''} onChange={(e) => update({ clientIp: e.target.value || undefined })} /></Field>
      <Field label="Hostname" htmlFor="af-host"><Input id="af-host" placeholder="PC-…" value={filter.clientHostname ?? ''} onChange={(e) => update({ clientHostname: e.target.value || undefined })} /></Field>
      <Field label="Freitext" htmlFor="af-q"><Input id="af-q" type="search" placeholder="Benutzer, IP, Ressource …" value={filter.q ?? ''} onChange={(e) => update({ q: e.target.value || undefined })} /></Field>
    </form>
    <div className="min-h-0 flex-1 overflow-auto">
      {error ? <p role="alert" className="p-4 text-[12px] text-error">{error.message}</p>
        : isLoading && !data ? <div role="status" className="flex items-center gap-2 p-4 text-[12px] text-muted"><Spinner />Audit-Ereignisse werden geladen …</div>
        : <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 bg-panel text-left text-[11px] text-muted"><tr>{['Zeitpunkt', 'Benutzer', 'Aktion', 'Ressource', 'Client', 'Ergebnis', 'Details'].map((h) => <th key={h} scope="col" className="border-b border-line px-3 py-1.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {data?.events.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Keine Ereignisse für diese Filter.</td></tr>}
            {data?.events.map((e) => <tr key={e.id} className="border-b border-line align-top">
              <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-fg-2"><time dateTime={e.timestamp}>{new Date(e.timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' })}</time></td>
              <td className="px-3 py-1.5">{e.actorDisplayName}</td>
              <td className="px-3 py-1.5"><span className="block font-mono text-[11.5px]">{e.action}</span><span className="text-[11px] text-muted">{AUDIT_CATEGORY_LABELS[e.category]}</span></td>
              <td className="px-3 py-1.5"><span className="text-fg">{e.resourceLabel}</span><span className="ml-1 text-[11px] text-muted">{e.resourceType}</span></td>
              <td className="whitespace-nowrap px-3 py-1.5" title={e.userAgent ?? undefined}><ClientCell hostname={e.clientHostname} ip={e.clientIp} /></td>
              <td className="px-3 py-1.5"><Badge tone={RESULT_TONE[e.result]}>{RESULT_LABEL[e.result]}</Badge></td>
              <td className="px-3 py-1.5 font-mono text-[11px] text-muted"><AuditDetails metadata={e.metadata} userAgent={e.userAgent} requestId={e.requestId} source={e.source} /></td>
            </tr>)}
          </tbody>
        </table>}
    </div>
    <nav aria-label="Seitennavigation Audit-Log" className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-panel px-3 py-1.5 text-[12px] text-muted">
      <span>{data ? `${data.total} Ereignisse · Seite ${page} von ${pages}` : '—'}</span>
      <div className="flex gap-1"><Button size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Zurück</Button><Button size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Weiter</Button></div>
    </nav>
  </div>
}
