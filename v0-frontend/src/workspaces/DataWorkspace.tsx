import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, Columns3, Download, Lock, PencilLine, Search, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { runCommand } from '@/commands/registry'
import { Button, Checkbox, Input, Spinner, Tabs } from '@/components/ui/primitives'
import { useCan } from '@/stores/accountStore'
import { useDataStore } from '@/stores/dataStore'
import { canDeleteRows } from '@/features/library/libraryPermissions'
import { useDocumentStore } from '@/stores/documentStore'
import { useUiStore } from '@/stores/uiStore'
import type { CellValue, DataColumn, DataRow, DataViewId } from '@/types/data'
import { cn } from '@/utils/cn'
import { fmtNumber } from '@/utils/format'
import { potentialDefsOf, presetsOf } from '@/features/schematic/models/wireStyles'
import { WireStylesEditor } from './WireStylesEditor'
import { PotentialsEditor } from './PotentialsEditor'
import { SymbolEditor } from './SymbolEditor'
import { symbolVariants } from '@/features/schematic/models/symbolLibrary'

type Pane = DataViewId | 'wireStyles' | 'potentials' | 'symbols'

const PROJECT_VIEWS: { value: DataViewId; label: string }[] = [
  { value: 'devices', label: 'Betriebsmittel' },
  { value: 'terminals', label: 'Klemmen' },
  { value: 'connections', label: 'Verbindungen' },
  { value: 'cables', label: 'Kabel' },
  { value: 'plc', label: 'SPS' },
]

const ROW_H = 28

function Cell({ col, value, editing, onCommit, onCancel }: { col: DataColumn; value: CellValue; editing: boolean; onCommit: (v: CellValue) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  if (!editing) {
    const text = value == null || value === '' ? '—' : col.type === 'number' && typeof value === 'number' ? fmtNumber(value) : String(value)
    return <span className={cn('truncate', col.mono && 'font-mono', col.type === 'number' && 'ml-auto tabular-nums', (value == null || value === '') && 'text-muted')}>{text}</span>
  }
  const parse = (): CellValue => (col.type === 'number' ? (draft === '' ? null : Number(draft.replace(',', '.'))) : draft)
  if (col.type === 'select' && col.options) {
    return (
      <select autoFocus aria-label={col.label} value={draft} onChange={(e) => onCommit(e.target.value)} onBlur={onCancel} className="h-6 w-full rounded-sm border border-accent bg-app px-1 text-[12px] outline-none">
        {col.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    )
  }
  return (
    <input
      autoFocus
      aria-label={col.label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(parse())}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') onCommit(parse())
        if (e.key === 'Escape') onCancel()
        e.stopPropagation()
      }}
      className={cn('h-6 w-full rounded-sm border border-accent bg-app px-1 text-[12px] outline-none', col.mono && 'font-mono')}
    />
  )
}

export function DataWorkspace() {
  const view = useUiStore((s) => s.dataView)
  const pane = useUiStore((s) => s.dataPane)
  const doc = useDocumentStore((s) => s.document)
  const table = useDataStore((s) => s.tables[view])
  const loading = useDataStore((s) => s.loading === view)
  const { selected, anchor, search, onlyIssues, sort, filters, hidden } = useDataStore()
  const [editing, setEditing] = useState<{ row: string; key: string } | null>(null)
  const [colMenu, setColMenu] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (doc || view === 'articles') void useDataStore.getState().load(view)
  }, [view, doc])

  const canManageArticles = useCan('article.manage')
  const readOnly = view === 'articles' && !canManageArticles
  const needsProject = !doc && view !== 'articles'
  const selectPane = (v: Pane) => {
    setEditing(null)
    useDataStore.getState().setSelected([], null)
    if (v === 'wireStyles' || v === 'potentials' || v === 'symbols') useUiStore.getState().set({ dataPane: v })
    else useUiStore.getState().set({ dataPane: 'table', dataView: v })
  }
  const activePane: Pane = pane === 'table' ? view : pane
  const tableCount = (v: DataViewId) => (pane === 'table' && v === view ? table?.rows.length : undefined)

  const columns = useMemo(() => (table?.columns ?? []).filter((c) => !hidden[view]?.includes(c.key)), [table, hidden, view])
  const rows = useMemo(() => {
    if (!table) return [] as DataRow[]
    const n = search.trim().toLowerCase()
    let out = table.rows.filter((r) => {
      if (onlyIssues && !r.issue) return false
      for (const [k, f] of Object.entries(filters)) if (f && !String(r.cells[k] ?? '').toLowerCase().includes(f.toLowerCase())) return false
      return !n || Object.values(r.cells).some((v) => v != null && String(v).toLowerCase().includes(n))
    })
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1
      out = [...out].sort((a, b) => {
        const x = a.cells[sort.key]
        const y = b.cells[sort.key]
        if (x == null) return 1
        if (y == null) return -1
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'de', { numeric: true })) * dir
      })
    }
    return out
  }, [table, search, onlyIssues, sort, filters])

  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_H, overscan: 12 })
  const totalW = columns.reduce((s, c) => s + c.width, 0) + 40
  const selSet = useMemo(() => new Set(selected), [selected])

  const clickRow = (e: React.MouseEvent, id: string, index: number) => {
    const ds = useDataStore.getState()
    if (e.shiftKey && anchor) {
      const a = rows.findIndex((r) => r.id === anchor)
      const [lo, hi] = a < index ? [a, index] : [index, a]
      ds.setSelected(rows.slice(lo, hi + 1).map((r) => r.id))
    } else if (e.ctrlKey || e.metaKey) {
      ds.setSelected(selSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id], id)
    } else ds.setSelected([id], id)
  }

  return (
    <main aria-label="Datenmanager" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-stretch border-b border-line bg-panel">
        <div className="flex min-w-0 items-stretch">
          <span className="flex items-center pr-1 pl-3 text-[10.5px] font-semibold tracking-wide text-muted uppercase" title="Gilt für alle Projekte, auch ohne geöffnetes Projekt bearbeitbar">
            Bibliothek
          </span>
          <Tabs<Pane>
            label="Systemweite Daten"
            value={activePane}
            onChange={selectPane}
            tabs={[
              { value: 'articles' as const, label: 'Artikel', count: tableCount('articles') },
              { value: 'potentials' as const, label: 'Potentiale', count: potentialDefsOf(doc).length },
              { value: 'wireStyles' as const, label: 'Leiterstile', count: presetsOf(doc).length },
              { value: 'symbols' as const, label: 'Symbole', count: symbolVariants().length },
            ]}
            className="border-b-0 px-1"
          />
        </div>
        <div className="my-2 w-px bg-line" aria-hidden />
        <div className="flex min-w-0 items-stretch">
          <span className="flex items-center pr-1 pl-3 text-[10.5px] font-semibold tracking-wide text-muted uppercase" title="Daten des geöffneten Projekts">
            Projekt
          </span>
          <Tabs<Pane>
            label="Projektdaten"
            value={activePane}
            onChange={selectPane}
            tabs={PROJECT_VIEWS.map((v) => ({ ...v, count: doc ? tableCount(v.value) : undefined }))}
            className="border-b-0 px-1"
          />
        </div>
      </div>
      {pane === 'symbols' ? (
        <SymbolEditor />
      ) : pane === 'wireStyles' ? (
        <WireStylesEditor />
      ) : pane === 'potentials' ? (
        <PotentialsEditor />
      ) : needsProject ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-app p-6 text-center">
          <p className="text-[13px] font-medium text-fg">Kein Projekt geöffnet</p>
          <p className="max-w-sm text-[12px] text-muted">
            {PROJECT_VIEWS.find((v) => v.value === view)?.label} sind Projektdaten. Öffne ein Projekt, um sie anzuzeigen. Artikel, Potentiale, Leiterstile und Symbole sind auch ohne geöffnetes Projekt verfügbar; Bearbeitungsmöglichkeiten hängen von den Benutzerrechten ab.
          </p>
          <Button size="sm" onClick={() => runCommand('file.open')}>
            Projekt öffnen …
          </Button>
        </div>
      ) : (
      <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="data-search" aria-label="Tabelle durchsuchen" placeholder="Suchen…" value={search} onChange={(e) => useDataStore.getState().set({ search: e.target.value })} className="pl-7" />
        </div>
        <Checkbox id="only-issues" checked={onlyIssues} onChange={(v) => useDataStore.getState().set({ onlyIssues: v })} label="Nur mit Befunden" />
        <div className="relative">
          <Button size="sm" variant="ghost" icon={Columns3} aria-expanded={colMenu} onClick={() => setColMenu((v) => !v)}>
            Spalten
          </Button>
          {colMenu && table && (
            <div className="absolute top-full left-0 z-30 mt-1 w-52 rounded-md border border-line bg-panel p-1.5 shadow-lg">
              {table.columns.map((c) => (
                <div key={c.key} className="px-1 py-0.5">
                  <Checkbox id={`col-${c.key}`} checked={!hidden[view]?.includes(c.key)} onChange={() => useDataStore.getState().toggleColumn(view, c.key)} label={c.label} />
                </div>
              ))}
              <div className="mt-1 border-t border-line pt-1">
                <Button size="sm" variant="ghost" className="w-full" onClick={() => setColMenu(false)}>
                  Schließen
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1" />
        {selected.length > 0 && <span className="text-[11.5px] text-fg-2 tabular-nums">{selected.length} ausgewählt</span>}
        {readOnly && (
          <span className="flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted" title="Artikel bearbeiten erfordert die Berechtigung „Artikel verwalten“">
            <Lock className="size-3" aria-hidden /> Nur lesen
          </span>
        )}
        <Button size="sm" icon={PencilLine} disabled={!selected.length || readOnly} onClick={() => runCommand('data.bulkEdit')}>
          Sammeländerung
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={Trash2}
          disabled={!selected.length || !canDeleteRows(view, canManageArticles)}
          title={view === 'articles' ? (canManageArticles ? 'Artikel löschen: Backend noch nicht implementiert' : 'Artikel löschen erfordert die Berechtigung „Artikel verwalten“') : undefined}
          onClick={() => useDataStore.getState().deleteRows(view, selected)}
        >
          Löschen
        </Button>
        <Button size="sm" variant="ghost" icon={Upload} disabled={readOnly} onClick={() => runCommand('data.import')}>
          Import
        </Button>
        <Button size="sm" variant="ghost" icon={Download} onClick={() => runCommand('data.export')}>
          Export
        </Button>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto bg-app" role="grid" aria-rowcount={rows.length} aria-label={view === 'articles' ? 'Artikel' : PROJECT_VIEWS.find((v) => v.value === view)?.label}>
        <div style={{ width: totalW }} className="sticky top-0 z-10 flex h-8 border-b border-line bg-panel-2" role="row">
          <div className="flex w-10 shrink-0 items-center justify-center" role="columnheader">
            <input
              type="checkbox"
              aria-label="Alle auswählen"
              checked={rows.length > 0 && selected.length === rows.length}
              onChange={(e) => useDataStore.getState().setSelected(e.target.checked ? rows.map((r) => r.id) : [], null)}
              className="accent-[var(--accent)]"
            />
          </div>
          {columns.map((c) => {
            const active = sort?.key === c.key
            return (
              <div key={c.key} style={{ width: c.width }} className="flex shrink-0 flex-col justify-center border-l border-line px-2" role="columnheader" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button
                  type="button"
                  onClick={() => useDataStore.getState().set({ sort: active ? (sort!.dir === 'asc' ? { key: c.key, dir: 'desc' } : null) : { key: c.key, dir: 'asc' } })}
                  className="flex items-center gap-1 text-left text-[11px] font-semibold text-fg-2 hover:text-fg"
                >
                  <span className="truncate">{c.label}</span>
                  {active && (sort!.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                </button>
              </div>
            )
          })}
        </div>

        {loading && !table ? (
          <div className="flex items-center gap-2 p-4 text-[12px] text-muted">
            <Spinner /> Daten werden geladen…
          </div>
        ) : (
          <div style={{ height: virt.getTotalSize(), width: totalW }} className="relative">
            {virt.getVirtualItems().map((vi) => {
              const r = rows[vi.index]
              const sel = selSet.has(r.id)
              return (
                <div
                  key={r.id}
                  role="row"
                  aria-rowindex={vi.index + 2}
                  aria-selected={sel}
                  onClick={(e) => clickRow(e, r.id, vi.index)}
                  style={{ transform: `translateY(${vi.start}px)`, height: ROW_H }}
                  className={cn('absolute top-0 left-0 flex w-full border-b border-line text-[12px]', sel ? 'bg-accent-soft' : r.issue === 'error' ? 'bg-error-soft' : r.issue === 'warning' ? 'bg-warn-soft' : vi.index % 2 ? 'bg-panel/40' : '')}
                >
                  <div className="flex w-10 shrink-0 items-center justify-center" role="gridcell">
                    <input type="checkbox" aria-label="Zeile auswählen" checked={sel} onClick={(e) => e.stopPropagation()} onChange={() => useDataStore.getState().setSelected(sel ? selected.filter((x) => x !== r.id) : [...selected, r.id], r.id)} className="accent-[var(--accent)]" />
                  </div>
                  {columns.map((c) => {
                    const isEditing = editing?.row === r.id && editing.key === c.key
                    return (
                      <div
                        key={c.key}
                        role="gridcell"
                        style={{ width: c.width }}
                        onDoubleClick={() => c.editable && !readOnly && setEditing({ row: r.id, key: c.key })}
                        className={cn('flex shrink-0 items-center border-l border-line px-2', c.editable && !readOnly && 'cursor-text')}
                      >
                        <Cell
                          key={isEditing ? 'e' : 'v'}
                          col={c}
                          value={r.cells[c.key] ?? null}
                          editing={isEditing}
                          onCancel={() => setEditing(null)}
                          onCommit={(v) => {
                            setEditing(null)
                            if (v !== r.cells[c.key]) useDataStore.getState().updateCell(view, r.id, c.key, v)
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex h-7 shrink-0 items-center gap-3 border-t border-line bg-panel px-3 text-[11px] text-muted tabular-nums">
        <span>
          {fmtNumber(rows.length)} von {fmtNumber(table?.rows.length ?? 0)} Zeilen
        </span>
        <span>{readOnly ? 'Nur Lesezugriff auf Artikel · Shift/Ctrl für Mehrfachauswahl' : 'Doppelklick bearbeitet · Shift/Ctrl für Mehrfachauswahl'}</span>
      </div>
      </>
      )}
    </main>
  )
}
