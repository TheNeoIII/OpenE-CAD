import { CornerDownLeft, FileText, Search, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { allCommands, isCommandEnabled, primaryShortcut, type Command } from '@/commands/registry'
import { findObject, objectBounds } from '@/features/schematic/models/geometry'
import { centerOn } from '@/features/schematic/viewport'
import { useDocumentStore } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'

interface Entry {
  id: string
  group: string
  label: string
  hint?: string
  shortcut?: string
  disabled?: boolean
  icon?: Command['icon']
  run: () => void
}

function score(text: string, q: string) {
  const t = text.toLowerCase()
  if (!q) return 1
  if (t.startsWith(q)) return 3
  if (t.includes(q)) return 2
  let i = 0
  for (const ch of t) if (ch === q[i]) i++
  return i === q.length ? 1 : 0
}

function openDevice(deviceId: string) {
  const { document, setActivePage } = useDocumentStore.getState()
  const page = document?.pages.find((p) => p.symbols.some((s) => s.deviceId === deviceId))
  if (!page) return
  const sym = page.symbols.find((s) => s.deviceId === deviceId)!
  setActivePage(page.id)
  useUiStore.getState().setWorkspace('schematic')
  useSelectionStore.getState().set([sym.id])
  requestAnimationFrame(() => {
    const o = findObject(page, sym.id)
    if (o) centerOn(objectBounds(o))
  })
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen)
  if (!open) return null
  return <PaletteInner />
}

function PaletteInner() {
  const close = () => useUiStore.getState().set({ paletteOpen: false })
  const doc = useDocumentStore((s) => s.document)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const entries = useMemo<Entry[]>(() => {
    const query = q.trim().toLowerCase()
    const out: (Entry & { s: number })[] = []
    for (const c of allCommands()) {
      const s = Math.max(score(c.label, query), score(`${c.category} ${c.keywords ?? ''}`, query) - 1)
      if (s > 0) out.push({ id: c.id, group: 'Befehle', label: c.label, hint: c.category, shortcut: primaryShortcut(c), disabled: !isCommandEnabled(c), icon: c.icon, run: () => void c.run(), s })
    }
    if (doc && query) {
      for (const d of doc.devices) {
        const s = Math.max(score(d.bmk, query) + 1, score(d.function, query))
        if (s > 0) out.push({ id: `dev-${d.id}`, group: 'Betriebsmittel', label: d.bmk, hint: d.function, icon: Zap, run: () => openDevice(d.id), s })
      }
      for (const p of doc.pages) {
        const s = Math.max(score(p.number, query) + 1, score(p.title, query))
        if (s > 0)
          out.push({
            id: `pg-${p.id}`,
            group: 'Seiten',
            label: `${p.number}  ${p.title}`,
            hint: p.functionGroup,
            icon: FileText,
            run: () => {
              useDocumentStore.getState().setActivePage(p.id)
              useUiStore.getState().setWorkspace('schematic')
            },
            s,
          })
      }
    }
    const groups = ['Betriebsmittel', 'Seiten', 'Befehle']
    return out.sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group) || b.s - a.s || Number(!!a.disabled) - Number(!!b.disabled)).slice(0, 60)
  }, [q, doc])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const runEntry = (e?: Entry) => {
    if (!e || e.disabled) return
    close()
    e.run()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(entries.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      runEntry(entries[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  let lastGroup = ''
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/35 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Befehlspalette" className="flex h-fit max-h-[60vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-2xl shadow-black/30">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="size-4 text-muted" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Befehl, Betriebsmittel (-K1) oder Seite (2.1) suchen …"
            aria-label="Suchen"
            aria-controls="palette-list"
            aria-activedescendant={entries[active] ? `pal-${entries[active].id}` : undefined}
            className="h-10 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
          />
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
          {entries.length === 0 && <div className="px-3 py-6 text-center text-[12px] text-muted">Keine Treffer</div>}
          {entries.map((e, i) => {
            const header = e.group !== lastGroup
            lastGroup = e.group
            const Icon = e.icon
            return (
              <div key={e.id}>
                {header && <div className="px-3 pt-2 pb-1 text-[10.5px] font-semibold tracking-wide text-muted uppercase">{e.group}</div>}
                <div
                  id={`pal-${e.id}`}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={e.disabled}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => runEntry(e)}
                  className={cn('mx-1 flex h-8 cursor-default items-center gap-2.5 rounded-sm px-2 text-[12.5px]', i === active && 'bg-accent-soft', e.disabled && 'opacity-45')}
                >
                  <span className="flex w-4 justify-center text-fg-2">{Icon && <Icon className="size-3.5" aria-hidden />}</span>
                  <span className={cn('truncate text-fg', e.group === 'Betriebsmittel' && 'font-mono')}>{e.label}</span>
                  {e.hint && <span className="truncate text-[11.5px] text-muted">{e.hint}</span>}
                  <span className="ml-auto flex items-center gap-2">
                    {e.shortcut && <span className="font-mono text-[10.5px] text-muted">{e.shortcut}</span>}
                    {i === active && !e.disabled && <CornerDownLeft className="size-3 text-muted" aria-hidden />}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
