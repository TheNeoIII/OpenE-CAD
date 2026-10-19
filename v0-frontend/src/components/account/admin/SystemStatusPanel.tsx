import useSWR from 'swr'
import { backend } from '@/backend'
import type { SystemStatus } from '@/backend/admin'
import { Badge, Spinner } from '@/components/ui/primitives'

const HEALTH: Record<SystemStatus['database'], { label: string; tone: 'ok' | 'warn' | 'error' | 'neutral' }> = {
  ok: { label: 'OK', tone: 'ok' },
  degraded: { label: 'Eingeschränkt', tone: 'warn' },
  unavailable: { label: 'Nicht erreichbar', tone: 'error' },
  not_configured: { label: 'Nicht konfiguriert', tone: 'neutral' },
}

export function SystemStatusPanel() {
  const { data, error, isLoading } = useSWR('admin-status', () => backend.admin!.systemStatus(), { refreshInterval: 30_000 })
  if (isLoading) return <div role="status" className="flex items-center gap-2 p-4 text-[12px] text-muted"><Spinner />Status wird geladen …</div>
  if (error || !data) return <p role="alert" className="p-4 text-[12px] text-error">{error?.message ?? 'Status nicht verfügbar.'}</p>
  const rows: [string, React.ReactNode][] = [
    ['Backend', data.backend],
    ['Version', <span key="v" className="font-mono">{data.version}</span>],
    ['Datenbank', <Badge key="db" tone={HEALTH[data.database].tone}>{HEALTH[data.database].label}</Badge>],
    ['Dateispeicher', <Badge key="st" tone={HEALTH[data.storage].tone}>{HEALTH[data.storage].label}</Badge>],
    ['Aktive Sitzungen', data.activeSessions ?? '—'],
    ['Konten', `${data.users.active} aktiv · ${data.users.disabled} deaktiviert · ${data.users.locked} gesperrt`],
  ]
  return <div className="max-w-2xl p-4">
    {data.simulated && <p className="mb-3 rounded-sm border border-warn/50 bg-warn-soft px-3 py-2 text-[12px] text-warn">Development-only: Diese Werte stammen aus dem Mock-Backend. Datenbank- und Speicherstatus liefert erst der Rust-Server.</p>}
    <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-[12px]">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="text-fg">{v}</dd></div>)}
    </dl>
  </div>
}
