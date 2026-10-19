import { FileText, ListTree, Plus, Search } from 'lucide-react'
import { groupNo, sortedGroups, sortedPages } from '@/utils/pages'
import { Fragment, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSheetDrag, type SheetDrag } from './useSheetDrag'
import { pageContextMenu } from '@/commands/menus'
import { runCommand, tooltip } from '@/commands/registry'
import { IconButton, Input, Tabs } from '@/components/ui/primitives'
import { useDocumentStore } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUiStore, type NavigatorTab } from '@/stores/uiStore'
import { useValidationStore } from '@/stores/validationStore'
import type { CadDocument } from '@/types/cad'
import { cn } from '@/utils/cn'
import { QuickStart } from './QuickStart'

function focusObject(pageId: string, objectId: string) {
  useDocumentStore.getState().setActivePage(pageId)
  useSelectionStore.getState().set([objectId])
  requestAnimationFrame(() => runCommand('view.fitSelection'))
}

function findDeviceSymbol(doc: CadDocument, deviceId: string) {
  for (const p of doc.pages) {
    const s = p.symbols.find((x) => x.deviceId === deviceId)
    if (s) return { pageId: p.id, symbolId: s.id }
  }
  return null
}

/** Plain click opens a page; Ctrl/Cmd toggles and Shift extends a multi-selection for page copy. */
function selectPage(doc: CadDocument, pageId: string, e: React.MouseEvent) {
  const ui = useUiStore.getState()
  const docStore = useDocumentStore.getState()
  if (e.ctrlKey || e.metaKey) {
    const base = ui.pageSelection.length ? ui.pageSelection : docStore.activePageId ? [docStore.activePageId] : []
    ui.set({ pageSelection: base.includes(pageId) ? base.filter((x) => x !== pageId) : [...base, pageId] })
    useSelectionStore.getState().clear()
    return
  }
  if (e.shiftKey && docStore.activePageId) {
    const order = sortedPages(doc).map((p) => p.id)
    const a = order.indexOf(docStore.activePageId)
    const b = order.indexOf(pageId)
    ui.set({ pageSelection: order.slice(Math.min(a, b), Math.max(a, b) + 1) })
    useSelectionStore.getState().clear()
    return
  }
  ui.set({ pageSelection: [] })
  docStore.setActivePage(pageId)
}

function DropPlaceholder() {
  return (
    <li aria-hidden className="sheet-drop-slot my-0.5 flex h-7 items-center gap-2 rounded-md border border-dashed border-accent bg-accent-soft/60 px-2 text-[11px] text-accent">
      <span className="h-0.5 w-3 rounded-full bg-accent" />
      Hier einfügen
    </li>
  )
}

function SheetGhost({ drag }: { drag: SheetDrag }) {
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[100]"
      style={{ transform: `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px)`, width: drag.width }}
    >
      <div className="sheet-ghost flex h-7 items-center gap-2 rounded-md border border-accent bg-panel-2 px-2 text-[12px] text-fg shadow-xl">
        <FileText className="size-3.5 shrink-0 text-accent" />
        <span className="w-6 shrink-0 font-mono text-[11px] text-muted">{drag.number}</span>
        <span className="truncate">{drag.title}</span>
      </div>
    </div>,
    document.body,
  )
}

function Row({ active, onClick, onContextMenu, onPointerDown, children, issue, pageId, dragging }: { pageId?: string; dragging?: boolean; active?: boolean; onClick?: (e: React.MouseEvent) => void; onContextMenu?: (e: React.MouseEvent) => void; onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void; children: React.ReactNode; issue?: 'error' | 'warning' }) {
  return (
    <li data-page-row={pageId} className={cn(dragging && 'hidden')}>
      <button
        type="button"
        style={pageId ? { touchAction: 'none' } : undefined}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onContextMenu={onContextMenu}
        aria-current={active ? 'true' : undefined}
        className={cn('flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] hover:bg-hover', pageId && 'cursor-grab active:cursor-grabbing', active ? 'bg-accent-soft text-fg' : 'text-fg-2')}
      >
        {children}
        {issue && <span className={cn('ml-auto size-1.5 shrink-0 rounded-full', issue === 'error' ? 'bg-error' : 'bg-warn')} aria-label={issue === 'error' ? 'Fehler' : 'Warnung'} />}
      </button>
    </li>
  )
}

export function Navigator() {
  const doc = useDocumentStore((s) => s.document)
  const activePageId = useDocumentStore((s) => s.activePageId)
  const tab = useUiStore((s) => s.navigatorTab)
  const selected = useSelectionStore((s) => s.ids)
  const pageSel = useUiStore((s) => s.pageSelection)
  const results = useValidationStore((s) => s.results)
  const [q, setQ] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const { drag, begin, suppressClick } = useSheetDrag(listRef)

  const issueBy = useMemo(() => {
    const m = new Map<string, 'error' | 'warning'>()
    for (const r of results) {
      if (r.severity === 'info') continue
      for (const key of [r.target.id, r.target.pageId]) {
        if (!key) continue
        if (m.get(key) !== 'error') m.set(key, r.severity)
      }
    }
    return m
  }, [results])

  if (!doc) return null
  const needle = q.trim().toLowerCase()
  const match = (...s: (string | undefined)[]) => !needle || s.some((x) => x?.toLowerCase().includes(needle))

  const terminals = doc.pages.flatMap((p) => p.symbols.filter((s) => s.kind === 'terminal').map((s) => ({ page: p, sym: s, dev: doc.devices.find((d) => d.id === s.deviceId) })))

  return (
    <aside aria-label="Projektnavigator" className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <Tabs<NavigatorTab>
        label="Navigator"
        value={tab}
        onChange={(v) => useUiStore.getState().set({ navigatorTab: v })}
        className="px-1"
        tabs={[
          { value: 'pages', label: 'Seiten', count: doc.pages.length },
          { value: 'devices', label: 'BM', count: doc.devices.length },
          { value: 'terminals', label: 'Klemmen' },
          { value: 'cables', label: 'Kabel' },
          { value: 'plc', label: 'SPS' },
        ]}
      />
      <div className="flex items-center gap-1 border-b border-line p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <Input aria-label="Navigator filtern" placeholder="Filtern…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-7" />
        </div>
        {tab === 'pages' && <IconButton icon={ListTree} label="Funktionsgruppen verwalten" onClick={() => useUiStore.getState().openDialog({ type: 'functionGroups' })} />}
        {tab === 'pages' && <IconButton icon={Plus} label={tooltip('page.new')} onClick={() => runCommand('page.new')} />}
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {drag && <SheetGhost drag={drag} />}
        {tab === 'pages' &&
          sortedGroups(doc).map((g) => {
            const pages = sortedPages(doc).filter((p) => p.functionGroup === g.id && match(p.number, p.title))
            if (!pages.length && needle) return null
            const slotHere = drag?.group === g.id
            return (
              <section key={g.id} data-page-group={g.id} className={cn('mb-2 rounded-md transition-colors', slotHere && 'bg-hover/40')}>
                <h3 className="px-2 py-1 font-mono text-[10.5px] text-muted">
                  {groupNo(doc, g.id)} · {g.id} <span className="font-sans">{g.label}</span>
                </h3>
                <ul className="min-h-2">
                  {pages.map((p) => (
                    <Fragment key={p.id}>
                    {slotHere && drag.beforeId === p.id && <DropPlaceholder />}
                    <Row
                      pageId={p.id}
                      dragging={drag?.pageId === p.id}
                      active={p.id === activePageId || pageSel.includes(p.id)}
                      issue={issueBy.get(p.id)}
                      onPointerDown={(e) => begin(e, p.id, p.number, p.title)}
                      onClick={(e) => {
                        if (suppressClick.current) return
                        selectPage(doc, p.id, e)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        useUiStore.getState().openContextMenu(e.clientX, e.clientY, pageContextMenu(p.id))
                      }}
                    >
                      <FileText className="size-3.5 shrink-0 text-muted" aria-hidden />
                      <span className="w-6 shrink-0 font-mono text-[11px] text-muted">{p.number}</span>
                      <span className="truncate">{p.title}</span>
                      {p.kind === 'wiring' && <span className="ml-auto text-[10px] text-accent" title="Verkabelungsschema">W</span>}
                    </Row>
                    </Fragment>
                  ))}
                  {slotHere && !drag.beforeId && <DropPlaceholder />}
                </ul>
              </section>
            )
          })}

        {tab === 'devices' && (
          <ul>
            {doc.devices
              .filter((d) => match(d.bmk, d.function, d.articleNo))
              .map((d) => {
                const loc = findDeviceSymbol(doc, d.id)
                const symSelected = loc && selected.includes(loc.symbolId)
                return (
                  <Row key={d.id} active={!!symSelected} issue={issueBy.get(d.id) ?? (loc ? issueBy.get(loc.symbolId) : undefined)} onClick={() => loc && focusObject(loc.pageId, loc.symbolId)}>
                    <span className="w-12 shrink-0 font-mono text-[11.5px] font-medium text-fg">{d.bmk}</span>
                    <span className="truncate text-muted">{d.function || d.category}</span>
                  </Row>
                )
              })}
          </ul>
        )}

        {tab === 'terminals' && (
          <ul>
            {terminals
              .filter((t) => match(t.dev?.bmk, t.sym.terminalNo))
              .map((t) => (
                <Row key={t.sym.id} active={selected.includes(t.sym.id)} issue={issueBy.get(t.sym.id)} onClick={() => focusObject(t.page.id, t.sym.id)}>
                  <span className="w-12 shrink-0 font-mono text-[11.5px] text-fg">{t.dev?.bmk ?? '—'}</span>
                  <span className="font-mono text-[11.5px]">:{t.sym.terminalNo ?? '?'}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-muted">/{t.page.number}</span>
                </Row>
              ))}
          </ul>
        )}

        {tab === 'cables' && (
          <ul>
            {doc.cables
              .filter((c) => match(c.bmk, c.type, c.from, c.to))
              .map((c) => (
                <Row key={c.id}>
                  <span className="w-12 shrink-0 font-mono text-[11.5px] text-fg">{c.bmk}</span>
                  <span className="truncate text-muted">
                    {c.type} {c.cores}
                  </span>
                </Row>
              ))}
          </ul>
        )}

        {tab === 'plc' && (
          <ul>
            {doc.plc
              .filter((p) => match(p.address, p.symbol, p.deviceBmk))
              .map((p) => (
                <Row key={p.id}>
                  <span className="w-14 shrink-0 font-mono text-[11.5px] text-fg">{p.address}</span>
                  <span className="truncate">{p.symbol}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-muted">{p.deviceBmk}</span>
                </Row>
              ))}
          </ul>
        )}
      </div>
      {tab === 'pages' && <QuickStart />}
    </aside>
  )
}
