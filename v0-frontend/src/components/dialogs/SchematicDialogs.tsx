import { Suspense, use, useMemo, useState } from 'react'
import { backend } from '@/backend'
import { Dialog } from '@/components/ui/Dialog'
import { Button, Field, Input, Segmented, Select, Spinner } from '@/components/ui/primitives'
import { addPotential, addCrossReference, assignArticle, updatePageMeta } from '@/features/schematic/actions'
import { Star } from 'lucide-react'
import { articleVariant, customKind, symbolDef, symbolMeta, symbolVariants, variantByKey, type SymbolVariant } from '@/features/schematic/models/symbolLibrary'
import { matchesOriginFilter, OriginFilterSelect, ownerOptions, SymbolOriginBadge, useSymbolOriginResolver, type OriginFilter, type ResolvedOrigin } from '@/features/library/SymbolOriginBadge'
import { useLibraryStore } from '@/stores/libraryStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { SymbolGlyph } from '@/features/schematic/components/SymbolGlyph'
import { useDocumentStore } from '@/stores/documentStore'
import { useToolStore } from '@/stores/toolStore'
import { toast, useUiStore } from '@/stores/uiStore'
import { PAGE_FORMATS, UNITS_PER_MM, type PageFormat } from '@/types/cad'
import type { Article } from '@/types/device'
import { cn } from '@/utils/cn'
import { fmtNumber } from '@/utils/format'

const close = () => useUiStore.getState().closeDialog()

export function PagePropertiesDialog({ pageId }: { pageId: string }) {
  const doc = useDocumentStore((s) => s.document)
  const page = doc?.pages.find((p) => p.id === pageId)
  const [form, setForm] = useState(() => ({ number: page?.number ?? '', title: page?.title ?? '', format: page?.format ?? 'A3L', functionGroup: page?.functionGroup ?? '', revision: page?.revision ?? '' }))
  if (!page || !doc) return null
  const dup = doc.pages.some((p) => p.id !== pageId && p.number === form.number.trim())
  const submit = () => {
    if (dup || !form.number.trim()) return
    updatePageMeta(pageId, { ...form, number: form.number.trim(), format: form.format as PageFormat })
    close()
  }
  return (
    <Dialog
      title="Seiteneigenschaften"
      description={`Seite ${page.number}`}
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={dup}>
            Übernehmen
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Seitennummer" htmlFor="pp-num" hint={dup ? <span className="text-error">Nummer ist bereits vergeben</span> : undefined}>
          <Input id="pp-num" mono data-autofocus value={form.number} onChange={(e) => {
            const number = e.target.value
            const group = doc.functionGroups.find((g, i) => (g.no ?? i) === Number(number.split('.')[0]))
            setForm({ ...form, number, functionGroup: group?.id ?? form.functionGroup })
          }} aria-invalid={dup} />
        </Field>
        <Field label="Format" htmlFor="pp-fmt">
          <Select id="pp-fmt" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as PageFormat })}>
            {Object.entries(PAGE_FORMATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seitentitel" htmlFor="pp-title" className="col-span-2">
          <Input id="pp-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Funktionsgruppe" htmlFor="pp-fg">
          <Select id="pp-fg" value={form.functionGroup} onChange={(e) => {
            const group = doc.functionGroups.find(g => g.id === e.target.value)!
            const no = group.no ?? doc.functionGroups.indexOf(group)
            const next = Math.max(0, ...doc.pages.filter(p => p.functionGroup === group.id && p.id !== pageId).map(p => Number(p.number.split('.')[1]) || 0)) + 1
            setForm({ ...form, functionGroup: group.id, number: `${no}.${next}` })
          }}>
            {doc.functionGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Revision" htmlFor="pp-rev">
          <Input id="pp-rev" mono value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  )
}

type PickEntry = { id: string; variant: SymbolVariant; title: string; sub: string; article?: Article; origin?: ResolvedOrigin; haystack: string }

const variantEntry = (v: SymbolVariant, origin: ResolvedOrigin, prefix = ''): PickEntry => {
  const meta = symbolMeta(v.kind, v.poles)
  const sub = `-${meta.bmkPrefix} · ${meta.category}`
  return { id: prefix + v.key, variant: v, title: v.label, sub, origin, haystack: `${v.label} ${meta.description} ${meta.bmkPrefix} ${meta.category} ${origin.label} ${origin.mine ? 'mein meine' : ''}` }
}

const allArticles = () => loadArticles('')

function startPick(e: PickEntry) {
  useToolStore.getState().startPlace(e.variant.kind, e.variant.poles, e.article ?? null)
  useUiStore.getState().setWorkspace('schematic')
  close()
  toast(`${e.title}: in den Plan klicken. Esc bricht ab.`)
}

export function SymbolPickerDialog() {
  return (
    <Suspense
      fallback={
        <Dialog title="Symbol einfügen" width="lg">
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        </Dialog>
      }
    >
      <SymbolPickerBody articles={use(allArticles())} />
    </Suspense>
  )
}

function SymbolPickerBody({ articles }: { articles: Article[] }) {
  const [q, setQ] = useState('')
  const [poles, setPoles] = useState<'all' | '1' | '3'>('all')
  const [active, setActive] = useState(0)
  const favorites = useSettingsStore((s) => s.favoriteSymbols)
  const toggleFavorite = useSettingsStore((s) => s.toggleFavorite)
  const customSymbols = useLibraryStore((s) => s.customSymbols)
  const symbolOverrides = useLibraryStore((s) => s.symbolOverrides)
  const resolveOrigin = useSymbolOriginResolver()
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all')

  const originOf = useMemo(() => {
    const byKind = new Map(customSymbols.map((c) => [customKind(c.id), c]))
    return (v: SymbolVariant) => resolveOrigin(byKind.get(v.kind))
  }, [customSymbols, resolveOrigin])
  const owners = useMemo(() => ownerOptions(symbolVariants().map(originOf)), [originOf])

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const poleOk = (v: SymbolVariant) => poles === 'all' || v.group === poles
    const match = (e: PickEntry) => !needle || e.haystack.toLowerCase().includes(needle)
    const originOk = (e: PickEntry) => !e.origin || matchesOriginFilter(e.origin, originFilter)

    const symbols = symbolVariants().filter(poleOk).map((v) => variantEntry(v, originOf(v))).filter((e) => originOk(e) && match(e))
    // Article devices are not owned symbols; the owner filter only narrows the symbol sections.
    const devices = originFilter !== 'all' ? [] : articles
      .map((a): PickEntry | null => {
        const v = articleVariant(a)
        if (!v || !poleOk(v)) return null
        const sub = `${a.manufacturer} ${a.articleNo} · -${symbolDef(v.kind).bmkPrefix}`
        return { id: `art:${a.id}`, variant: v, article: a, title: a.description, sub, haystack: `${a.description} ${sub} ${a.category}` }
      })
      .filter((e): e is PickEntry => !!e && match(e))
    const favs = needle
      ? []
      : favorites
          .map((k) => variantByKey(k))
          .filter((v): v is SymbolVariant => !!v && poleOk(v))
          .map((v) => variantEntry(v, originOf(v), 'fav:'))
          .filter(originOk)

    return [
      { title: 'Favoriten', entries: favs },
      { title: 'Symbole', entries: symbols },
      { title: 'Geräte aus Artikelliste', entries: devices },
    ].filter((s) => s.entries.length > 0)
    // symbolOverrides changes labels/metadata resolved by symbolVariants()/symbolMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, poles, favorites, articles, originOf, originFilter, symbolOverrides])

  const flat = sections.flatMap((s) => s.entries)
  const current = flat[Math.min(active, flat.length - 1)]

  return (
    <Dialog
      title="Symbol einfügen"
      description="Symbol oder Gerät wählen, dann im Plan platzieren. Stern markiert Favoriten – die ersten sechs erscheinen in der Werkzeugleiste."
      width="lg"
      onSubmit={() => current && startPick(current)}
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-muted">Enter platziert · Pfeiltasten wählen</span>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!current}>
            Platzieren
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <Input
          data-autofocus
          value={q}
          onChange={(e) => (setQ(e.target.value), setActive(0))}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') (e.preventDefault(), setActive((a) => Math.min(flat.length - 1, a + 1)))
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') (e.preventDefault(), setActive((a) => Math.max(0, a - 1)))
          }}
          placeholder="Suchen: Name, BMK, Kategorie, Besitzer, Artikelnummer …"
          aria-label="Symbole filtern"
        />
        <OriginFilterSelect
          value={originFilter}
          onChange={(v) => (setOriginFilter(v), setActive(0))}
          owners={owners}
          className="h-8 max-w-44 shrink-0 rounded-md border border-line bg-app px-2 text-[12px] text-fg outline-none focus:border-accent"
        />
        <Segmented
          label="Polzahl"
          value={poles}
          onChange={(v) => (setPoles(v), setActive(0))}
          options={[
            { value: 'all', label: 'Alle' },
            { value: '1', label: '1-polig' },
            { value: '3', label: '3-polig' },
          ]}
        />
      </div>
      <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
        {sections.length === 0 && <p className="py-8 text-center text-[12px] text-muted">Keine Treffer.</p>}
        {sections.map((s) => (
          <section key={s.title}>
            <h3 className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
              {s.title} <span className="font-normal">({s.entries.length})</span>
            </h3>
            <div className="grid grid-cols-3 gap-2" role="listbox" aria-label={s.title}>
              {s.entries.map((e) => {
                const i = flat.indexOf(e)
                const isFav = favorites.includes(e.variant.key)
                return (
                  <div
                    key={e.id}
                    role="option"
                    aria-selected={e === current}
                    onMouseMove={() => setActive(i)}
                    className={cn('group relative flex items-center rounded-md border', e === current ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong')}
                  >
                    <button type="button" onClick={() => startPick(e)} className="flex min-w-0 flex-1 items-center gap-3 p-2 pr-8 text-left">
                      <SymbolGlyph kind={e.variant.kind} poles={e.variant.poles} className="size-11 shrink-0 rounded-sm bg-app text-fg" />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-fg">{e.title}</span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          {e.origin && <SymbolOriginBadge origin={e.origin} />}
                          <span className="truncate text-[11px] text-muted">{e.sub}</span>
                        </span>
                      </span>
                    </button>
                    {!e.article && (
                      <button
                        type="button"
                        aria-label={isFav ? `${e.title} aus Favoriten entfernen` : `${e.title} zu Favoriten hinzufügen`}
                        aria-pressed={isFav}
                        title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                        onClick={() => toggleFavorite(e.variant.key)}
                        className={cn('absolute top-1.5 right-1.5 rounded p-0.5', isFav ? 'text-xref' : 'text-muted opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100')}
                      >
                        <Star className="size-3.5" fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  )
}

const articleCache = new Map<string, Promise<Article[]>>()
const loadArticles = (q: string) => {
  if (!articleCache.has(q)) articleCache.set(q, backend.listArticles(q))
  return articleCache.get(q)!
}

function ArticleRows({ query, category, onPick, current }: { query: string; category: string; onPick: (a: Article) => void; current: string | null }) {
  const all = use(loadArticles(query))
  const list = all.filter((a) => !category || a.category === category)
  if (!list.length) return <div className="py-8 text-center text-[12px] text-muted">Keine Artikel gefunden</div>
  return (
    <table className="w-full text-[12px]">
      <thead className="sticky top-0 bg-panel text-left text-[11px] text-muted">
        <tr className="border-b border-line">
          <th className="px-3 py-1.5 font-medium">Hersteller</th>
          <th className="px-2 py-1.5 font-medium">Artikelnummer</th>
          <th className="px-2 py-1.5 font-medium">Beschreibung</th>
          <th className="px-2 py-1.5 text-right font-medium">In [A]</th>
          <th className="px-2 py-1.5 text-right font-medium">TE</th>
          <th className="px-3 py-1.5" />
        </tr>
      </thead>
      <tbody>
        {list.map((a) => (
          <tr key={a.id} className={cn('border-b border-line/60 hover:bg-hover', current === a.id && 'bg-accent-soft')}>
            <td className="px-3 py-1.5 text-fg">{a.manufacturer}</td>
            <td className="px-2 py-1.5 font-mono text-fg-2">{a.articleNo}</td>
            <td className="max-w-56 truncate px-2 py-1.5 text-fg-2">{a.description}</td>
            <td className="px-2 py-1.5 text-right font-mono text-fg-2">{fmtNumber(a.ratedCurrent)}</td>
            <td className="px-2 py-1.5 text-right font-mono text-fg-2">{a.widthTE}</td>
            <td className="px-3 py-1">
              <Button size="sm" variant={current === a.id ? 'default' : 'primary'} onClick={() => onPick(a)}>
                {current === a.id ? 'Zugeordnet' : 'Zuordnen'}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ArticlePickerDialog({ deviceId }: { deviceId: string }) {
  const device = useDocumentStore((s) => s.document?.devices.find((d) => d.id === deviceId))
  const [q, setQ] = useState('')
  const [category, setCategory] = useState(device?.category ?? '')
  const deferred = useMemo(() => q.trim(), [q])
  if (!device) return null
  return (
    <Dialog title={`Artikel zuordnen: ${device.bmk}`} description={device.function} width="xl" bodyClassName="p-0 flex flex-col" footer={<Button onClick={close}>Schließen</Button>}>
      <div className="flex gap-2 border-b border-line p-3">
        <Input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hersteller, Artikelnummer, Typ …" aria-label="Artikel suchen" />
        <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="w-44" aria-label="Kategorie">
          <option value="">Alle Kategorien</option>
          {['Schutzgerät', 'Schütz', 'Relais', 'Befehlsgerät', 'Meldegerät', 'Klemme', 'Motor', 'Leuchte'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>
      <div className="max-h-[50vh] min-h-48 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted">
              <Spinner /> Artikel werden geladen
            </div>
          }
        >
          <ArticleRows
            query={deferred}
            category={category}
            current={device.articleId}
            onPick={(a) => {
              assignArticle(deviceId, a)
              toast(`${a.manufacturer} ${a.articleNo} zugeordnet`, 'success')
              close()
            }}
          />
        </Suspense>
      </div>
    </Dialog>
  )
}

const POTENTIALS = ['L1', 'L2', 'L3', 'N', 'PE', 'L+', 'M', '24V DC', '0V']

export function PotentialDialog() {
  const [name, setName] = useState('L1')
  const [y, setY] = useState('40')
  const submit = () => {
    const v = Number(y.replace(',', '.'))
    if (!Number.isFinite(v)) return
    addPotential(name, Math.round(v * UNITS_PER_MM))
    close()
  }
  return (
    <Dialog
      title="Potential einfügen"
      description="Horizontale Sammelschiene über die Seitenbreite."
      width="sm"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary">
            Einfügen
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Potential" htmlFor="pot-name">
          <Select id="pot-name" data-autofocus value={name} onChange={(e) => setName(e.target.value)}>
            {POTENTIALS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Y-Position [mm]" htmlFor="pot-y">
          <Input id="pot-y" mono inputMode="decimal" value={y} onChange={(e) => setY(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

export function XrefDialog() {
  const doc = useDocumentStore((s) => s.document)
  const activeId = useDocumentStore((s) => s.activePageId)
  const [target, setTarget] = useState(doc?.pages.find((p) => p.id !== activeId && p.kind === 'schematic')?.number ?? '')
  const [column, setColumn] = useState('1')
  const [end, setEnd] = useState<'start' | 'end'>('end')
  if (!doc) return null
  const submit = () => {
  const targetPage = doc.pages.find((p) => p.number === target)
  if (!targetPage || targetPage.id === activeId) return
  addCrossReference(targetPage.id, column, end)
    close()
  }
  return (
    <Dialog
      title="Querverweis einfügen"
      description="Verweis auf eine andere Seite und Spalte, z. B. /3.1.4"
      width="sm"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary">
            Einfügen
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="An markiertem Linienende" className="col-span-2">
    <Segmented label="Linienende" value={end} onChange={setEnd} options={[{ value: 'start', label: 'Anfang' }, { value: 'end', label: 'Ende' }]} />
  </Field>
  <p className="col-span-2 text-xs text-muted">Im Zielblatt entsteht ein frei verschiebbares Gegenstück bei 40/40 mm. Leiter am markierten Anschlusspunkt anklemmen. Beschriftung im Eigenschaftenfenster bearbeiten.</p>
  <Field label="Zielseite" htmlFor="xr-page">
          <Select id="xr-page" data-autofocus value={target} onChange={(e) => setTarget(e.target.value)}>
  {doc.pages.filter((p) => p.id !== activeId && p.kind === 'schematic').map((p) => (
  <option key={p.id} value={p.number}>
                {p.number} {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Spalte" htmlFor="xr-col">
          <Select id="xr-col" value={column} onChange={(e) => setColumn(e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}
