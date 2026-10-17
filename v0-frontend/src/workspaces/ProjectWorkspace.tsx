import { Archive, ArchiveRestore, Copy, FolderOpen, FolderPlus, Pencil, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { runCommand } from '@/commands/registry'
import { Badge, Button, Empty, Input, Segmented, Spinner } from '@/components/ui/primitives'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import type { Project } from '@/types/project'
import { cn } from '@/utils/cn'
import { fmtDate, fmtDateTime } from '@/utils/format'

type Filter = 'active' | 'archived' | 'all'

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'error' | 'warn' }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-line bg-app px-3 py-2">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={cn('font-mono text-[18px] font-semibold tabular-nums', tone === 'error' && value ? 'text-error' : tone === 'warn' && value ? 'text-warn' : 'text-fg')}>{value}</span>
    </div>
  )
}

function Details({ project }: { project: Project }) {
  const opening = useProjectStore((s) => s.opening)
  const isCurrent = useProjectStore((s) => s.openIds.includes(project.id))
  const ui = useUiStore.getState()
  const archived = project.status === 'archived'
  return (
    <section aria-label="Projektdetails" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex flex-wrap items-start gap-3 border-b border-line px-6 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[18px] font-semibold text-fg text-balance">{project.name}</h1>
            {archived && <Badge>Archiviert</Badge>}
            {isCurrent && <Badge tone="accent">Geöffnet</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
            <span className="font-mono">{project.number}</span>
            <span>{project.customer}</span>
            <span>{project.location}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" icon={Pencil} onClick={() => ui.openDialog({ type: 'projectSettings', projectId: project.id })}>
            Bearbeiten
          </Button>
          <Button variant="ghost" icon={Copy} onClick={() => ui.openDialog({ type: 'duplicateProject', projectId: project.id, title: project.name })}>
            Duplizieren
          </Button>
          <Button variant="ghost" icon={archived ? ArchiveRestore : Archive} onClick={() => void useProjectStore.getState().archive(project.id, !archived)}>
            {archived ? 'Wiederherstellen' : 'Archivieren'}
          </Button>
          <Button
            variant="ghost"
            icon={Trash2}
            onClick={() =>
              ui.openDialog({
                type: 'confirm',
                title: 'Projekt löschen',
                message: `„${project.name}“ wird endgültig gelöscht. Dieser Schritt kann nicht rückgängig gemacht werden.`,
                confirmLabel: 'Löschen',
                danger: true,
                onConfirm: () => void useProjectStore.getState().remove(project.id),
              })
            }
          >
            Löschen
          </Button>
          {isCurrent && (
            <Button variant="ghost" icon={X} onClick={() => useProjectStore.getState().requestClose(project.id)}>
              Schließen
            </Button>
          )}
          <Button variant="primary" icon={FolderOpen} disabled={opening === project.id} onClick={() => void useProjectStore.getState().openProject(project.id)}>
            {opening === project.id ? <Spinner /> : null}
            {isCurrent ? 'Zum Plan' : 'Öffnen'}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 px-6 py-4 md:grid-cols-5">
        <Stat label="Seiten" value={project.stats.pages} />
        <Stat label="Betriebsmittel" value={project.stats.devices} />
        <Stat label="Klemmen" value={project.stats.terminals} />
        <Stat label="Fehler" value={project.stats.errors} tone="error" />
        <Stat label="Warnungen" value={project.stats.warnings} tone="warn" />
      </div>

      <div className="grid gap-6 px-6 pb-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Projektdaten</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-[12px]">
            <dt className="text-muted">Beschreibung</dt>
            <dd className="text-fg-2">{project.description || '—'}</dd>
            <dt className="text-muted">Bearbeiter</dt>
            <dd>{project.author}</dd>
            <dt className="text-muted">Norm</dt>
            <dd>{project.standard}</dd>
            <dt className="text-muted">Vorlage</dt>
            <dd>{project.template}</dd>
            <dt className="text-muted">Revision</dt>
            <dd className="font-mono">{project.revision}</dd>
            <dt className="text-muted">Angelegt</dt>
            <dd>{fmtDate(project.createdAt)}</dd>
            <dt className="text-muted">Geändert</dt>
            <dd>{fmtDateTime(project.updatedAt)}</dd>
          </dl>
        </div>
        <div>
          <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Letzte Änderungen</h2>
          {project.recentEdits.length ? (
            <ol className="flex flex-col">
              {project.recentEdits.map((e, i) => (
                <li key={i} className="flex gap-3 border-b border-line py-1.5 text-[12px] last:border-0">
                  <span className="w-28 shrink-0 font-mono text-[11px] text-muted">{fmtDateTime(e.at)}</span>
                  <span className="min-w-0 flex-1 text-fg-2">{e.text}</span>
                  <span className="shrink-0 text-muted">{e.user}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12px] text-muted">Keine Änderungen protokolliert.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export function ProjectWorkspace() {
  const projects = useProjectStore((s) => s.projects)
  const loading = useProjectStore((s) => s.listLoading)
  const openIds = useProjectStore((s) => s.openIds)
  const focusId = useUiStore((s) => s.projectFocusId)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('active')

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return projects
      .filter((p) => filter === 'all' || p.status === filter)
      .filter((p) => !n || [p.name, p.number, p.customer, p.location].some((s) => s.toLowerCase().includes(n)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [projects, q, filter])

  const focused = projects.find((p) => p.id === focusId) ?? list[0]

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <aside aria-label="Projektliste" className="flex w-80 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex flex-col gap-2 border-b border-line p-3">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-[13px] font-semibold">Projekte</h2>
            <Button size="sm" variant="primary" icon={FolderPlus} onClick={() => runCommand('file.new')}>
              Neu
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input aria-label="Projekte suchen" placeholder="Name, Nummer, Kunde…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-7" />
          </div>
          <Segmented<Filter>
            label="Status"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Aktiv' },
              { value: 'archived', label: 'Archiv' },
              { value: 'all', label: 'Alle' },
            ]}
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {loading && (
            <li className="flex items-center gap-2 p-3 text-[12px] text-muted">
              <Spinner /> Projekte werden geladen…
            </li>
          )}
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => useUiStore.getState().set({ projectFocusId: p.id })}
                onDoubleClick={() => void useProjectStore.getState().openProject(p.id)}
                aria-current={focused?.id === p.id ? 'true' : undefined}
                className={cn('flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left hover:bg-hover', focused?.id === p.id && 'bg-accent-soft hover:bg-accent-soft')}
              >
                <span className="flex items-center gap-2">
                  <span className="truncate text-[12.5px] font-medium text-fg">{p.name}</span>
                  {openIds.includes(p.id) && <FolderOpen className="size-3 shrink-0 text-accent" aria-label="Geöffnet" />}
                  {p.stats.errors > 0 && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-error" aria-label={`${p.stats.errors} Fehler`} />}
                </span>
                <span className="flex gap-2 text-[11px] text-muted">
                  <span className="font-mono">{p.number}</span>
                  <span className="truncate">{p.customer}</span>
                  <span className="ml-auto shrink-0">{fmtDate(p.updatedAt)}</span>
                </span>
              </button>
            </li>
          ))}
          {!loading && !list.length && <Empty icon={Search} title="Keine Projekte gefunden" />}
        </ul>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col bg-app">{focused ? <Details project={focused} /> : <Empty icon={FolderPlus} title="Kein Projekt">Neues Projekt anlegen, um zu beginnen.</Empty>}</main>
    </div>
  )
}
