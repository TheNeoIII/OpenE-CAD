import { Copy, Download, Lock, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton } from '@/components/ui/primitives'
import { matchesOriginFilter, OriginFilterSelect, ownerOptions, SymbolOriginBadge, useSymbolOriginResolver, type OriginFilter } from '@/features/library/SymbolOriginBadge'
import { canDeleteSymbol, canDuplicateSymbol, canEditSymbol, canImportSystemSymbols, newSymbolProvenance, nextSymbolVersion } from '@/features/library/symbolOwnership'
import { useCurrentUser } from '@/stores/accountStore'
import { SymbolGlyph } from '@/features/schematic/components/SymbolGlyph'
import { articleVariant, customKind, symbolDef, symbolMeta, symbolOverrideOf, symbolShapes, symbolVariants, variantKey, type SymbolVariant } from '@/features/schematic/models/symbolLibrary'
import { useDocumentStore } from '@/stores/documentStore'
import { useLibraryStore } from '@/stores/libraryStore'
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



function commitCustom(_label: string, fn: (list: CustomSymbolDef[]) => CustomSymbolDef[]) {
  useLibraryStore.getState().setCustomSymbols(fn)
}
function patchCustom(id: string, label: string, p: Partial<CustomSymbolDef>) {
  commitCustom(label, (list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)))
}
function patchOverride(kind: BuiltinSymbolKind, p: SymbolOverride | null) {
  useLibraryStore.getState().setOverrides((o) => {
    const next = { ...o }
    if (p) next[kind] = { ...next[kind], ...p }
    else delete next[kind]
    return next
  })
}

function usageCount(doc: CadDocument, kind: SymbolKind) {
  let n = 0
  for (const p of doc.pages) for (const s of p.symbols) if (s.kind === kind) n++
  return n
}

function MetaForm({ value, readOnly, onPatch }: { value: { label: string; description: string; bmkPrefix: string; category: DeviceCategory; mount: MountType }; readOnly?: boolean; onPatch: (p: SymbolOverride) => void }) {
  return (
    <fieldset disabled={readOnly} className="grid grid-cols-2 gap-2 disabled:opacity-70">
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
    </fieldset>
  )
}

type Entry = SymbolVariant & { custom?: CustomSymbolDef }
type GroupName = 'Meine Symbole' | 'Andere Benutzer' | 'System'

const unsavedDrafts = new Map<string, { selected: string; pending: Partial<CustomSymbolDef> }>()

export function SymbolEditor() {
  return <SymbolEditorSession documentId="library" />
}

function SymbolEditorSession({ documentId }: { documentId: string }) {
  const doc = useDocumentStore((s) => s.document)
  const customSymbols = useLibraryStore((s) => s.customSymbols)
  const symbolOverrides = useLibraryStore((s) => s.symbolOverrides)
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
  const [exported, setExported] = useState<{ name: string; text: string; url: string } | null>(null)
  const exportTextRef = useRef<HTMLTextAreaElement>(null)

  const user = useCurrentUser()
  const resolveOrigin = useSymbolOriginResolver()
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all')
  const [importAsSystem, setImportAsSystem] = useState(false)

  const allEntries = useMemo(
    () => symbolVariants().map((v) => {
      const custom = customSymbols.find((c) => customKind(c.id) === v.kind)
      return { ...v, custom, origin: resolveOrigin(custom) }
    }),
    // symbolOverrides changes the variant labels resolved by symbolVariants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customSymbols, symbolOverrides, resolveOrigin],
  )
  const owners = useMemo(() => ownerOptions(allEntries.map((e) => e.origin)), [allEntries])
  const entries = useMemo(() => {
    const n = search.trim().toLowerCase()
    return allEntries.filter((e) => {
      if (!matchesOriginFilter(e.origin, originFilter)) return false
      if (!n) return true
      const m = symbolMeta(e.kind, e.poles)
      return `${e.label} ${m.bmkPrefix} ${m.description} ${m.category} ${e.origin.label}`.toLowerCase().includes(n)
    })
  }, [allEntries, search, originFilter])

  const variant = symbolVariants().find((v) => v.key === selected) ?? symbolVariants()[0]
  const current: Entry = { ...variant, custom: customSymbols.find((c) => customKind(c.id) === variant.kind) }
  const origin = resolveOrigin(current.custom)
  const editable = canEditSymbol(user, origin)
  const deletable = canDeleteSymbol(user, origin)
  const duplicable = canDuplicateSymbol(user)
  const def = symbolDef(current.kind)
  const used = doc ? usageCount(doc, current.kind) : 0
  const builtin = !current.custom
  const meta = symbolMeta(current.kind, current.poles)
  const editing: CustomSymbolDef = { ...(current.custom ?? { ...meta, id: current.key, shapes: symbolShapes(current.kind, current.poles), pins: def.pins({ poles: current.poles }) }), ...pending }
  const stage = (p: Partial<CustomSymbolDef>) => { if (editable) setPending((previous) => ({ ...previous, ...p })) }
  const save = () => {
    if (!pending || !editable) return
    if (current.custom) patchCustom(current.custom.id, 'Symbol gespeichert', { ...pending, ...nextSymbolVersion(user, current.custom.version) })
    else {
      const kind = current.kind as BuiltinSymbolKind
      const { label, description, bmkPrefix, category, mount, shapes, pins } = editing
      const prev = symbolOverrideOf(kind)
      const meta = def.supportsPoles
        ? { poleLabels: { ...prev?.poleLabels, [current.poles]: label }, poleMeta: { ...prev?.poleMeta, [current.poles]: { description, bmkPrefix, category, mount } } }
        : { label, description, bmkPrefix, category, mount }
      patchOverride(kind, { ...meta, geometry: { ...prev?.geometry, [current.poles]: { shapes, pins } }, ...nextSymbolVersion(user, prev?.version) })
    }
    setPending(null)
  }

  const createSymbol = (base?: Partial<CustomSymbolDef>) => {
    if (!duplicable || !abandon()) return
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
      ...newSymbolProvenance(user, 'user', base?.derivedFromSymbolId),
    }
    commitCustom('Symbol angelegt', (list) => [...list, sym])
    select(variantKey(customKind(id), 1))
  }

  const duplicate = () => {
    const pins = def.pins({ poles: current.poles })
    createSymbol({
      shapes: structuredClone(symbolShapes(current.kind, current.poles)),
      label: `${current.label} (Kopie)`,
      description: meta.description,
      bmkPrefix: meta.bmkPrefix,
      category: meta.category,
      mount: meta.mount,
      pins: pins.map((p) => ({ id: p.id, x: p.x, y: p.y })),
      derivedFromSymbolId: current.custom?.id ?? current.key,
    })
  }

  const remove = () => {
    if (!current.custom || !deletable || !abandon()) return
    setPending(null)
    if (!window.confirm(`Symbol „${current.label}“ systemweit löschen?${used ? ` Es wird ${used}× im geöffneten Projekt verwendet.` : ''} Platzierte Symbole werden in allen Projekten als „Unbekanntes Symbol“ angezeigt.`)) return
    const id = current.custom.id
    commitCustom('Symbol gelöscht', (list) => list.filter((s) => s.id !== id))
    select('breaker:1')
  }

  const exportLib = (all = false) => {
    const symbols = all ? customSymbols.map((symbol) => symbol.id === editing.id ? editing : symbol) : [editing]
    const text = JSON.stringify({ format: 'symbol-library', version: 1, symbols }, null, 2)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const name = all ? 'symbolbibliothek.json' : `${editing.label.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'symbol'}.json`
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setExported((previous) => {
      if (previous) URL.revokeObjectURL(previous.url)
      return { name, text, url }
    })
    setNotice(null)
  }

  const copyExport = async () => {
    if (!exported) return
    try {
      await navigator.clipboard.writeText(exported.text)
      setNotice('JSON in die Zwischenablage kopiert.')
    } catch {
      exportTextRef.current?.select()
      setNotice('Kopieren nicht erlaubt – Text ist markiert, bitte mit Strg+C kopieren.')
    }
  }

  const importLib = async (file: File) => {
    if (!duplicable) return
    const scope = importAsSystem && canImportSystemSymbols(user) ? 'system' : 'user'
    try {
      const data = JSON.parse(await file.text())
      const list: CustomSymbolDef[] = Array.isArray(data) ? data : data.symbols
      if (!Array.isArray(list)) throw new Error('format')
      const valid = list.filter((s) => s && typeof s.id === 'string' && typeof s.label === 'string' && Array.isArray(s.pins) && Array.isArray(s.shapes))
      commitCustom('Symbole importiert', (cur) => {
        const names = new Set([...symbolVariants().map((v) => v.label), ...cur.map((s) => s.label), editing.label].map((label) => label.trim().toLocaleLowerCase()))
        const imported = valid.map((s) => {
          const base = s.label.trim() || 'Symbol'
          let label = base
          let copy = 1
          while (names.has(label.toLocaleLowerCase())) label = `${base} (Kopie ${copy++})`
          names.add(label.toLocaleLowerCase())
          // Ownership from the file is never trusted: imports belong to the importer (or the system, for admins).
          return { ...s, id: crypto.randomUUID(), label, description: s.description ?? '', bmkPrefix: s.bmkPrefix || 'X', category: s.category ?? 'Klemme', mount: s.mount ?? 'rail', ...newSymbolProvenance(user, scope) }
        })
        return [...cur, ...imported]
      })
      setNotice(`${valid.length} Symbol(e) als ${scope === 'system' ? 'Systemsymbole' : 'eigene Symbole'} importiert${valid.length < list.length ? `, ${list.length - valid.length} ungültig übersprungen` : ''}.`)
    } catch {
      setNotice('Datei konnte nicht gelesen werden (erwartet: Symbolbibliothek als JSON).')
    }
  }

  const overridden = builtin && !!symbolOverrideOf(current.kind as BuiltinSymbolKind)

  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Symbolbibliothek" className="flex w-64 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex flex-col gap-2 border-b border-line p-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, BMK, Kategorie, Besitzer…" aria-label="Symbol suchen" className={fieldCls} />
          <OriginFilterSelect value={originFilter} onChange={setOriginFilter} owners={owners} className={fieldCls} />
          <div className="flex gap-1">
            <Button size="sm" icon={Plus} disabled={!duplicable} onClick={() => createSymbol()} className="flex-1">
              Neu
            </Button>
            <IconButton icon={Upload} label={importAsSystem ? 'Bibliothek als Systemsymbole importieren' : 'Bibliothek als eigene Symbole importieren'} size="sm" disabled={!duplicable} onClick={() => fileRef.current?.click()} />
            <IconButton icon={Download} label="Ausgewähltes Symbol exportieren (inklusive Entwurf)" size="sm" onClick={() => exportLib()} />
            <IconButton icon={Download} label="Alle eigenen Symbole exportieren" size="sm" disabled={!customSymbols.length} onClick={() => exportLib(true)} />
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
          {canImportSystemSymbols(user) && (
            <label className="flex items-center gap-2 text-[11px] text-fg-2">
              <input type="checkbox" checked={importAsSystem} onChange={(e) => setImportAsSystem(e.target.checked)} className="accent-accent" />
              Import als Systemsymbole
            </label>
          )}
          <Button size="sm" disabled={loadingArticles || !duplicable} onClick={async () => {
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
          {exported && (
            <section aria-label="Exportiertes JSON" className="flex flex-col gap-2 rounded border border-border bg-panel-2 p-2">
              <p className="text-[11px] text-muted">
                Falls kein Download erscheint (in der eingebetteten Vorschau werden Downloads blockiert), JSON kopieren oder in neuem Tab öffnen.
              </p>
              <textarea ref={exportTextRef} readOnly aria-label="Symbol-JSON" value={exported.text} className={cn(fieldCls, 'h-24 resize-y font-mono text-[10px]')} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void copyExport()}>
                  <Copy className="size-3.5" aria-hidden="true" /> Kopieren
                </Button>
                <a href={exported.url} download={exported.name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-panel">
                  <Download className="size-3.5" aria-hidden="true" /> {exported.name}
                </a>
                <button type="button" className="ml-auto text-[11px] text-muted hover:text-fg" onClick={() => { URL.revokeObjectURL(exported.url); setExported(null) }}>
                  Schließen
                </button>
              </div>
            </section>
          )}
          {notice && (
            <p role="status" className="text-[11px] text-muted">
              {notice}
            </p>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1">
          {entries.length === 0 && <li className="px-2 py-6 text-center text-[11px] text-muted">Keine Symbole für diesen Filter.</li>}
          {(['Meine Symbole', 'Andere Benutzer', 'System'] as GroupName[]).map((group) => {
            const items = entries.filter((e) => (group === 'System' ? e.origin.scope === 'system' : group === 'Meine Symbole' ? e.origin.mine : e.origin.scope !== 'system' && !e.origin.mine))
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
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{e.label}</span>
                            {group === 'Andere Benutzer' && <span className="block truncate text-[10px] text-muted">{e.origin.label}</span>}
                          </span>
                          {e.origin.scope === 'system' && e.custom && <SymbolOriginBadge origin={e.origin} />}
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
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15px] font-semibold">{editing.label}{pending ? ' · Ungespeichert' : ''}</h2>
              <SymbolOriginBadge origin={origin} />
            </div>
            <p className="text-[12px] text-muted">
              {builtin ? 'Standardsymbol' : origin.scope === 'system' ? 'Systemsymbol' : origin.mine ? 'Ihr Symbol' : `Benutzersymbol · ${origin.label}`}
              {` · Version ${(builtin ? symbolOverrideOf(current.kind as BuiltinSymbolKind)?.version : current.custom?.version) ?? 1}`}
              {doc ? ` · ${used}× im geöffneten Projekt verwendet` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {editable && (
              <>
                <Button size="sm" disabled={!pending} onClick={save}>Speichern</Button>
                <Button size="sm" disabled={!pending} onClick={() => setPending(null)}>Änderungen verwerfen</Button>
              </>
            )}
            {overridden && editable && (
              <Button size="sm" icon={RotateCcw} onClick={() => { if (abandon()) { setPending(null); patchOverride(current.kind as BuiltinSymbolKind, null) } }}>
                Zurücksetzen
              </Button>
            )}
            <Button size="sm" icon={Copy} variant={editable ? undefined : 'primary'} disabled={!duplicable} onClick={duplicate}>
              {editable ? 'Duplizieren' : 'Als eigene Variante duplizieren'}
            </Button>
            {deletable && (
              <Button size="sm" icon={Trash2} variant="danger" onClick={remove}>
                Löschen
              </Button>
            )}
          </div>
        </header>

        {!editable && (
          <div role="note" className="flex max-w-xl items-start gap-2 rounded-md border border-line bg-panel-2 px-3 py-2 text-[12px] text-fg-2">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
            <span>
              {origin.scope === 'system'
                ? 'Nur Lesen – Systemsymbole können nur von Administratoren geändert werden.'
                : origin.ownerUserId
                  ? `Nur Lesen – dieses Symbol gehört ${origin.label}.`
                  : 'Nur Lesen – dieses ältere Symbol ist keinem Besitzer zugeordnet.'}{' '}
              {duplicable ? 'Duplizieren Sie es, um eine eigene, bearbeitbare Variante zu erhalten.' : ''}
            </span>
          </div>
        )}

        <div className="max-w-xl">
          <MetaForm value={editing} readOnly={!editable} onPatch={stage} />
        </div>

        <div className={cn('contents', !editable && 'pointer-events-none select-none')} aria-disabled={!editable || undefined}>
          <ShapeCanvas
            sessionKey={`${documentId}:${selected}`}
            key={current.key}
            sym={editing}
            onPatch={(_label, patch) => stage(patch)}
          />
        </div>
      </section>
    </div>
  )
}
