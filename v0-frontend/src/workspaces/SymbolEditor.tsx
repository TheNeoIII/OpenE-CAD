import { Copy, Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton } from '@/components/ui/primitives'
import { SymbolGlyph } from '@/features/schematic/components/SymbolGlyph'
import { articleVariant, customKind, symbolDef, symbolOverrideOf, symbolShapes, symbolVariants, variantKey, type SymbolVariant } from '@/features/schematic/models/symbolLibrary'
import { useDocumentStore } from '@/stores/documentStore'
import type { BuiltinSymbolKind, CadDocument, CustomSymbolDef, SymbolKind, SymbolOverride } from '@/types/cad'
import { backend } from '@/backend'
import type { Article, DeviceCategory, MountType } from '@/types/device'
import { cn } from '@/utils/cn'
import { ShapeCanvas } from './symbolEditor/ShapeCanvas'
import { TextField, fieldCls } from './symbolEditor/fields'

const uid = () => Math.random().toString(36).slice(2, 10)

const CATEGORIES: DeviceCategory[] = ['Schutzgerät', 'Schütz', 'Relais', 'Befehlsgerät', 'Meldegerät', 'Klemme', 'Motor', 'Leuchte']
const MOUNTS: { value: MountType; label: string }[] = [
  { value: 'rail', label: 'Hutschiene' },
  { value: 'door', label: 'Tür' },
  { value: 'field', label: 'Feld' },
]



function commitCustom(label: string, fn: (list: CustomSymbolDef[]) => CustomSymbolDef[]) {
  useDocumentStore.getState().commit(label, (d) => ({ ...d, customSymbols: fn(d.customSymbols ?? []) }))
}
function patchCustom(id: string, label: string, p: Partial<CustomSymbolDef>) {
  commitCustom(label, (list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)))
}
function patchOverride(kind: BuiltinSymbolKind, p: SymbolOverride | null) {
  useDocumentStore.getState().commit(p ? 'Symbol angepasst' : 'Symbol zurückgesetzt', (d) => {
    const next = { ...(d.symbolOverrides ?? {}) }
    if (p) next[kind] = { ...next[kind], ...p }
    else delete next[kind]
    return { ...d, symbolOverrides: next }
  })
}

function usageCount(doc: CadDocument, kind: SymbolKind) {
  let n = 0
  for (const p of doc.pages) for (const s of p.symbols) if (s.kind === kind) n++
  return n
}

function MetaForm({ value, onPatch }: { value: { label: string; description: string; bmkPrefix: string; category: DeviceCategory; mount: MountType }; onPatch: (p: SymbolOverride) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <TextField label="Bezeichnung" value={value.label} onCommit={(v) => v && onPatch({ label: v })} />
      <TextField label="BMK-Präfix" value={value.bmkPrefix} mono onCommit={(v) => v && onPatch({ bmkPrefix: v.toUpperCase() })} />
      <div className="col-span-2">
        <TextField label="Beschreibung" value={value.description} onCommit={(v) => onPatch({ description: v })} />
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        Kategorie
        <select value={value.category} onChange={(e) => onPatch({ category: e.target.value as DeviceCategory })} className={fieldCls}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        Montage
        <select value={value.mount} onChange={(e) => onPatch({ mount: e.target.value as MountType })} className={fieldCls}>
          {MOUNTS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

type Entry = SymbolVariant & { custom?: CustomSymbolDef }

const unsavedDrafts = new Map<string, { selected: string; pending: Partial<CustomSymbolDef> }>()

export function SymbolEditor() {
  const id = useDocumentStore((s) => s.document?.id)
  return id ? <SymbolEditorSession key={id} documentId={id} /> : null
}

function SymbolEditorSession({ documentId }: { documentId: string }) {
  const doc = useDocumentStore((s) => s.document)
  const [selected, select] = useState(() => unsavedDrafts.get(documentId)?.selected ?? 'breaker:1')
  const [pending, setPending] = useState<Partial<CustomSymbolDef> | null>(() => unsavedDrafts.get(documentId)?.pending ?? null)
  useEffect(() => {
    if (pending) unsavedDrafts.set(documentId, { selected, pending })
    else unsavedDrafts.delete(documentId)
  }, [documentId, selected, pending])
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [articleSearch, setArticleSearch] = useState('')
  const [loadingArticles, setLoadingArticles] = useState(false)
  const abandon = () => !pending || window.confirm('Ungespeicherte Symboländerungen verwerfen?')
  const setSelected = (key: string) => { if (abandon()) { setPending(null); select(key) } }
  useEffect(() => {
    if (!pending) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending])
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = symbolVariants().map((v) => ({ ...v, custom: doc?.customSymbols?.find((c) => customKind(c.id) === v.kind) }))
    const n = search.trim().toLowerCase()
    return n ? all.filter((e) => `${e.label} ${symbolDef(e.kind).bmkPrefix}`.toLowerCase().includes(n)) : all
  }, [doc, search])

  if (!doc) return null
  const variant = symbolVariants().find((v) => v.key === selected) ?? symbolVariants()[0]
  const current: Entry = { ...variant, custom: doc.customSymbols?.find((c) => customKind(c.id) === variant.kind) }
  const def = symbolDef(current.kind)
  const used = usageCount(doc, current.kind)
  const builtin = !current.custom
  const editing: CustomSymbolDef = { ...(current.custom ?? { ...def, id: current.key, shapes: symbolShapes(current.kind, current.poles), pins: def.pins({ poles: current.poles }) }), ...pending }
  const save = () => {
    if (!pending) return
    if (current.custom) patchCustom(current.custom.id, 'Symbol gespeichert', pending)
    else {
      const kind = current.kind as BuiltinSymbolKind
      const { label, description, bmkPrefix, category, mount, shapes, pins } = editing
      patchOverride(kind, { label, description, bmkPrefix, category, mount, geometry: { ...symbolOverrideOf(kind)?.geometry, [current.poles]: { shapes, pins } } })
    }
    setPending(null)
  }

  const createSymbol = (base?: Partial<CustomSymbolDef>) => {
    if (!abandon()) return
    setPending(null)
    const id = uid()
    const sym: CustomSymbolDef = {
      id,
      label: 'Neues Symbol',
      description: '',
      bmkPrefix: 'X',
      category: 'Klemme',
      mount: 'rail',
      pins: [
        { id: '1', x: 0, y: -100 },
        { id: '2', x: 0, y: 100 },
      ],
      shapes: [
        { t: 'line', x1: 0, y1: -100, x2: 0, y2: -50 },
        { t: 'rect', x: -50, y: -50, w: 100, h: 100 },
        { t: 'line', x1: 0, y1: 50, x2: 0, y2: 100 },
      ],
      ...base,
    }
    commitCustom('Symbol angelegt', (list) => [...list, sym])
    select(variantKey(customKind(id), 1))
  }

  const duplicate = () => {
    const pins = def.pins({ poles: current.poles })
    createSymbol({
      shapes: structuredClone(symbolShapes(current.kind, current.poles)),
      label: `${current.label} (Kopie)`,
      description: def.description,
      bmkPrefix: def.bmkPrefix,
      category: def.category,
      mount: def.mount,
      pins: pins.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    })
  }

  const remove = () => {
    if (!current.custom || !abandon()) return
    setPending(null)
    if (used && !window.confirm(`Das Symbol wird ${used}× im Projekt verwendet. Trotzdem löschen? Platzierte Symbole werden als „Unbekanntes Symbol“ angezeigt.`)) return
    const id = current.custom.id
    commitCustom('Symbol gelöscht', (list) => list.filter((s) => s.id !== id))
    select('breaker:1')
  }

  const exportLib = () => {
    const blob = new Blob([JSON.stringify({ format: 'symbol-library', version: 1, symbols: doc.customSymbols ?? [] }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'symbolbibliothek.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importLib = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      const list: CustomSymbolDef[] = Array.isArray(data) ? data : data.symbols
      if (!Array.isArray(list)) throw new Error('format')
      const valid = list.filter((s) => s && typeof s.id === 'string' && typeof s.label === 'string' && Array.isArray(s.pins) && Array.isArray(s.shapes))
      commitCustom('Symbole importiert', (cur) => {
        const byId = new Map(cur.map((s) => [s.id, s]))
        for (const s of valid) byId.set(s.id, { ...s, description: s.description ?? '', bmkPrefix: s.bmkPrefix || 'X', category: s.category ?? 'Klemme', mount: s.mount ?? 'rail' })
        return [...byId.values()]
      })
      setNotice(`${valid.length} Symbol(e) importiert${valid.length < list.length ? `, ${list.length - valid.length} ungültig übersprungen` : ''}.`)
    } catch {
      setNotice('Datei konnte nicht gelesen werden (erwartet: Symbolbibliothek als JSON).')
    }
  }

  const overridden = builtin && !!symbolOverrideOf(current.kind as BuiltinSymbolKind)

  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Symbolbibliothek" className="flex w-64 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex flex-col gap-2 border-b border-line p-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Symbol suchen…" aria-label="Symbol suchen" className={fieldCls} />
          <div className="flex gap-1">
            <Button size="sm" icon={Plus} onClick={() => createSymbol()} className="flex-1">
              Neu
            </Button>
            <IconButton icon={Upload} label="Bibliothek importieren" size="sm" onClick={() => fileRef.current?.click()} />
            <IconButton icon={Download} label="Eigene Symbole exportieren" size="sm" disabled={!doc.customSymbols?.length} onClick={exportLib} />
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importLib(f)
                e.target.value = ''
              }}
            />
          </div>
          <Button size="sm" disabled={loadingArticles} onClick={async () => {
            setLoadingArticles(true)
            try { setArticles(await backend.listArticles('')) } catch { setNotice('Artikelliste konnte nicht geladen werden.') } finally { setLoadingArticles(false) }
          }}>Aus Artikelvorlage…</Button>
          {articles && <div className="flex flex-col gap-2">
            <input className={fieldCls} aria-label="Artikelvorlage suchen" placeholder="Artikel suchen…" value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)} />
            <ul className="max-h-48 overflow-y-auto">
              {articles.filter((a) => `${a.description} ${a.manufacturer} ${a.articleNo}`.toLowerCase().includes(articleSearch.toLowerCase()) && articleVariant(a)).map((a) => <li key={a.id}><button className="w-full rounded p-2 text-left text-[11px] hover:bg-panel-2" onClick={() => {
                const v = articleVariant(a)!
                const d = symbolDef(v.kind)
                createSymbol({ label: `${a.description} (${a.articleNo})`, description: `${a.manufacturer} ${a.articleNo}`, category: d.category, mount: d.mount, bmkPrefix: d.bmkPrefix, shapes: structuredClone(symbolShapes(v.kind, v.poles)), pins: structuredClone(d.pins({ poles: v.poles })) })
                setArticles(null)
              }}>{a.description}<span className="block text-muted">{a.manufacturer} · {a.articleNo}</span></button></li>)}
            </ul>
            <button className="text-[11px]" onClick={() => setArticles(null)}>Artikelauswahl schließen</button>
          </div>}
          {notice && (
            <p role="status" className="text-[11px] text-muted">
              {notice}
            </p>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1">
          {(['Projektsymbole', 'Standardsymbole'] as const).map((group) => {
            const items = entries.filter((e) => (group === 'Projektsymbole' ? !!e.custom : !e.custom))
            if (!items.length) return null
            return (
              <li key={group}>
                <h3 className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted uppercase">{group}</h3>
                <ul>
                  {items.map((e) => {
                    const d = symbolDef(e.kind)
                    return (
                      <li key={e.key}>
                        <button
                          type="button"
                          onClick={() => setSelected(e.key)}
                          aria-current={e.key === current.key}
                          className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] hover:bg-panel-2', e.key === current.key && 'bg-accent-soft text-fg')}
                        >
                          <SymbolGlyph kind={e.kind} poles={e.poles} className="size-8 shrink-0 rounded-sm bg-app text-fg" />
                          <span className="min-w-0 flex-1 truncate">{e.label}</span>
                          <span className="font-mono text-[11px] text-muted">{d.bmkPrefix}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>

      <section aria-label="Symbol bearbeiten" className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <header className="flex items-start gap-3">
          <SymbolGlyph kind={current.kind} poles={current.poles} className="size-14 shrink-0 rounded-md border border-line bg-app text-fg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold">{editing.label}{pending ? ' · Ungespeichert' : ''}</h2>
            <p className="text-[12px] text-muted">
              {builtin ? 'Standardvorlage – Grafik dieser Polvariante im Projekt editierbar' : 'Projektsymbol – frei editierbar'} · {used}× verwendet
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" disabled={!pending} onClick={save}>Speichern</Button>
            <Button size="sm" disabled={!pending} onClick={() => setPending(null)}>Änderungen verwerfen</Button>
            {overridden && (
              <Button size="sm" icon={RotateCcw} onClick={() => { if (abandon()) { setPending(null); patchOverride(current.kind as BuiltinSymbolKind, null) } }}>
                Zurücksetzen
              </Button>
            )}
            <Button size="sm" icon={Copy} onClick={duplicate}>
              Duplizieren
            </Button>
            {!builtin && (
              <Button size="sm" icon={Trash2} variant="danger" onClick={remove}>
                Löschen
              </Button>
            )}
          </div>
        </header>

        <div className="max-w-xl">
          <MetaForm value={editing} onPatch={(p) => setPending((previous) => ({ ...previous, ...p }))} />
        </div>

              <ShapeCanvas
                sessionKey={`${documentId}:${selected}`}
          key={current.key}
          sym={editing}
          onPatch={(_label, patch) => setPending((previous) => ({ ...previous, ...patch }))}
        />
      </section>
    </div>
  )
}
