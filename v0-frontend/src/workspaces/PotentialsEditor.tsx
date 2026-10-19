import { Lock, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/primitives'
import { WireSwatch } from '@/features/schematic/components/WireSwatch'
import { DEFAULT_POTENTIALS, potentialRenames, potentialUsage, renamePotentials } from '@/features/schematic/models/wireStyles'
import { useDocumentStore } from '@/stores/documentStore'
import { useCan } from '@/stores/accountStore'
import { useLibraryStore } from '@/stores/libraryStore'
import type { PotentialDef } from '@/types/cad'

const fieldCls = 'h-7 w-full rounded-md border border-line bg-app px-2 text-[12px] text-fg outline-none focus:border-accent disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:opacity-100'

function TextCell({ label, value, mono, allowEmpty, onCommit }: { label: string; value: string; mono?: boolean; allowEmpty?: boolean; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    const v = draft.trim()
    if ((v || allowEmpty) && v !== value) onCommit(v)
    else setDraft(value)
  }
  return (
    <input
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(value)
      }}
      className={`${fieldCls} ${mono ? 'font-mono' : ''}`}
    />
  )
}

const COLS = 'grid grid-cols-[minmax(90px,0.7fr)_minmax(180px,1.4fr)_56px_minmax(180px,1.3fr)_72px_36px] items-center gap-2'

export function PotentialsEditor() {
  const doc = useDocumentStore((s) => s.document)
  const defs = useLibraryStore((s) => s.potentialDefs)
  const presets = useLibraryStore((s) => s.wirePresets)
  const usage = useMemo(() => (doc ? potentialUsage(doc) : new Map<string, number>()), [doc])

  const undefinedInUse = [...usage.keys()].filter((n) => !defs.some((d) => d.name === n)).sort()
  /** UX guard only; the Rust server enforces `library.manageSystem` on every system library write. */
  const readOnly = !useCan('library.manageSystem')
  const save = (label: string, next: PotentialDef[]) => {
    if (readOnly) return
    const renames = potentialRenames(defs, next)
    useLibraryStore.getState().setPotentialDefs(next)
    if (doc && renames.size) useDocumentStore.getState().commit(label, (d) => renamePotentials(d, renames))
  }
  const patch = (id: string, p: Partial<PotentialDef>) => save('Potential geändert', defs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const uniqueName = (base: string) => {
    let n = base
    for (let i = 2; defs.some((d) => d.name === n); i++) n = `${base}${i}`
    return n
  }
  const add = (name = uniqueName('P')) => save('Potential angelegt', [...defs, { id: `pot-${Date.now().toString(36)}`, name, description: '', presetId: null }])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <p className="truncate text-[12px] text-fg-2">
          Systemweite Potentiale (für alle Projekte) mit Standard-Leiterstil. Leiter mit Farbe „Automatisch (nach Potential)“ übernehmen diese Vorlage.
        </p>
        <div className="flex-1" />
        {readOnly && (
          <span className="flex shrink-0 items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted" title="Bearbeiten erfordert die Berechtigung „Systembibliothek verwalten“">
            <Lock className="size-3" aria-hidden /> Nur lesen
          </span>
        )}
        <Button size="sm" variant="ghost" icon={RotateCcw} disabled={readOnly} onClick={() => save('Potentiale zurückgesetzt', DEFAULT_POTENTIALS)}>
          Standard wiederherstellen
        </Button>
        <Button size="sm" icon={Plus} disabled={readOnly} onClick={() => add()}>
          Neues Potential
        </Button>
      </div>

      <fieldset disabled={readOnly} className="contents">
      <div className="min-h-0 flex-1 overflow-auto bg-app" role="table" aria-label="Potentialdefinitionen">
        <div className="min-w-[720px]">
          <div role="row" className={`${COLS} sticky top-0 z-10 h-8 border-b border-line bg-panel-2 px-3 text-[11px] font-semibold text-fg-2`}>
            <span role="columnheader">Potential</span>
            <span role="columnheader">Beschreibung</span>
            <span role="columnheader">Vorschau</span>
            <span role="columnheader">Standard-Leiterstil</span>
            <span role="columnheader" className="text-right">
              Verwendet
            </span>
            <span role="columnheader" className="sr-only">
              Aktionen
            </span>
          </div>
          {defs.map((d) => {
            const used = usage.get(d.name) ?? 0
            const preset = presets.find((p) => p.id === d.presetId)
            return (
              <div key={d.id} role="row" className={`${COLS} border-b border-line px-3 py-1.5 hover:bg-hover/50`}>
                <span role="cell">
                  <TextCell
                    label="Potentialname"
                    mono
                    value={d.name}
                    onCommit={(v) => {
                      if (defs.some((x) => x.id !== d.id && x.name === v)) return
                      patch(d.id, { name: v })
                    }}
                  />
                </span>
                <span role="cell">
                  <TextCell label="Beschreibung" allowEmpty value={d.description} onCommit={(v) => patch(d.id, { description: v })} />
                </span>
                <span role="cell" className="flex items-center">
                  {preset ? <WireSwatch preset={preset} className="h-3 w-12" /> : <span className="text-[11px] text-muted">—</span>}
                </span>
                <span role="cell">
                  <select aria-label={`Standard-Leiterstil für ${d.name}`} value={d.presetId ?? ''} onChange={(e) => patch(d.id, { presetId: e.target.value || null })} className={fieldCls}>
                    <option value="">Keine (Farbe nach Name)</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </span>
                <span role="cell" className="text-right font-mono text-[12px] text-fg-2 tabular-nums">
                  {used}×
                </span>
                <span role="cell" className="flex justify-end">
                  <button
                    type="button"
                    aria-label={`${d.name} löschen`}
                    title={used ? `Löschen – ${used} Objekte behalten den Namen, verlieren aber den Standardstil` : 'Löschen'}
                    onClick={() => save('Potential gelöscht', defs.filter((x) => x.id !== d.id))}
                    className="grid size-7 place-items-center rounded-md text-muted hover:bg-error-soft hover:text-error disabled:hidden"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
        {undefinedInUse.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2 text-[11px] text-warn">
            <span>Im Projekt verwendet, aber nicht definiert:</span>
            {undefinedInUse.map((n) => (
              <button key={n} type="button" onClick={() => add(n)} className="rounded border border-warn/40 px-1.5 font-mono hover:bg-warn-soft disabled:opacity-60" title={`${n} als Potential anlegen`}>
                + {n}
              </button>
            ))}
          </div>
        )}
      </div>
      </fieldset>
      <div className="flex h-7 shrink-0 items-center gap-3 border-t border-line bg-panel px-3 text-[11px] text-muted tabular-nums">
        <span>{defs.length} Potentiale</span>
        <span>{doc ? 'Verwendung bezieht sich auf das geöffnete Projekt · Umbenennen ändert dort alle Leiter und Schienen' : 'Kein Projekt geöffnet – Verwendung wird nicht gezählt'}</span>
      </div>
    </div>
  )
}
