import { Copy, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/primitives'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { WireSwatch } from '@/features/schematic/components/WireSwatch'
import { LINE_STYLE_LABELS, presetUsage, syncPresets, WIRE_COLOR_LABELS, WIRE_PRESETS, WIRE_WEIGHT_LABELS } from '@/features/schematic/models/wireStyles'
import { useDocumentStore } from '@/stores/documentStore'
import { useLibraryStore } from '@/stores/libraryStore'
import type { LineStyle, WireColor, WirePreset, WireWeight } from '@/types/cad'

const fieldCls = 'h-7 w-full rounded-md border border-line bg-app px-2 text-[12px] text-fg outline-none focus:border-accent'

function TextCell({ label, value, mono, onCommit }: { label: string; value: string; mono?: boolean; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    const v = draft.trim()
    if (v && v !== value) onCommit(v)
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

function SelectCell<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className={fieldCls}>
      {(Object.keys(options) as T[]).map((k) => (
        <option key={k} value={k}>
          {options[k]}
        </option>
      ))}
    </select>
  )
}

const COLS = 'grid grid-cols-[56px_minmax(160px,1.6fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_72px_64px] items-center gap-2'

export function WireStylesEditor() {
  const doc = useDocumentStore((s) => s.document)
  const presets = useLibraryStore((s) => s.wirePresets)
  const usage = useMemo(() => (doc ? presetUsage(doc) : new Map<string, number>()), [doc])

  const save = (label: string, next: WirePreset[]) => {
    const prev = presets
    useLibraryStore.getState().setPresets(next)
    if (doc) useDocumentStore.getState().commit(label, (d) => syncPresets(d, prev, next))
  }
  const patch = (id: string, p: Partial<WirePreset>) => save('Leiterstil geändert', presets.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const add = (base?: WirePreset) =>
    save('Leiterstil angelegt', [
      ...presets,
      { ...(base ?? { color: 'black', lineStyle: 'solid', weight: 'normal', crossSection: '1,5 mm²' }), id: `custom-${Date.now().toString(36)}`, label: base ? `${base.label} (Kopie)` : 'Neue Vorlage' } as WirePreset,
    ])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <p className="text-[12px] text-fg-2">Vorlagen für Farbe, Linienart, Stärke und Querschnitt. Systemweit für alle Projekte; zugewiesene Leitungen werden beim Öffnen eines Projekts aktualisiert.</p>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => save('Leiterstile zurückgesetzt', WIRE_PRESETS)}>
          Standard wiederherstellen
        </Button>
        <Button size="sm" icon={Plus} onClick={() => add()}>
          Neue Vorlage
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-app" role="table" aria-label="Leiterstil-Vorlagen">
        <div className="min-w-[860px]">
          <div role="row" className={`${COLS} sticky top-0 z-10 h-8 border-b border-line bg-panel-2 px-3 text-[11px] font-semibold text-fg-2`}>
            <span role="columnheader">Vorschau</span>
            <span role="columnheader">Bezeichnung</span>
            <span role="columnheader">Farbe</span>
            <span role="columnheader">Linienart</span>
            <span role="columnheader">Stärke</span>
            <span role="columnheader">Querschnitt</span>
            <span role="columnheader" className="text-right">
              Verwendet
            </span>
            <span role="columnheader" className="sr-only">
              Aktionen
            </span>
          </div>
          {presets.map((p) => {
            const used = usage.get(p.id) ?? 0
            return (
              <div key={p.id} role="row" className={`${COLS} border-b border-line px-3 py-1.5 hover:bg-hover/50`}>
                <span role="cell" className="flex items-center">
                  {p.color.startsWith('#') ? <ColorPicker label={`Farbe für ${p.label}`} value={p.color} onChange={(color) => patch(p.id, { color: color as WireColor })}><WireSwatch preset={p} className="h-3 w-10" /></ColorPicker> : <WireSwatch preset={p} className="h-3 w-12" />}
                </span>
                <span role="cell">
                  <TextCell label="Bezeichnung" value={p.label} onCommit={(v) => patch(p.id, { label: v })} />
                </span>
                <span role="cell">
                  <SelectCell<string> label="Farbe" value={p.color.startsWith('#') ? 'custom' : p.color} options={{ ...WIRE_COLOR_LABELS, custom: 'Benutzerdefiniert' }} onChange={(v) => patch(p.id, { color: v === 'custom' ? '#ffffff' : v as WireColor })} />
                </span>
                <span role="cell">
                  <SelectCell<LineStyle> label="Linienart" value={p.lineStyle} options={LINE_STYLE_LABELS} onChange={(v) => patch(p.id, { lineStyle: v })} />
                </span>
                <span role="cell">
                  <SelectCell<WireWeight> label="Stärke" value={p.weight} options={WIRE_WEIGHT_LABELS} onChange={(v) => patch(p.id, { weight: v })} />
                </span>
                <span role="cell">
                  <TextCell label="Querschnitt" mono value={p.crossSection} onCommit={(v) => patch(p.id, { crossSection: v })} />
                </span>
                <span role="cell" className="text-right font-mono text-[12px] text-fg-2 tabular-nums">
                  {used}×
                </span>
                <span role="cell" className="flex justify-end gap-0.5">
                  <button type="button" aria-label={`${p.label} duplizieren`} title="Duplizieren" onClick={() => add(p)} className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-fg">
                    <Copy className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`${p.label} löschen`}
                    title={used ? `Löschen – ${used} Objekte behalten ihren Stil, verlieren aber die Zuordnung` : 'Löschen'}
                    onClick={() => save('Leiterstil gelöscht', presets.filter((x) => x.id !== p.id))}
                    className="grid size-7 place-items-center rounded-md text-muted hover:bg-error-soft hover:text-error"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex h-7 shrink-0 items-center gap-3 border-t border-line bg-panel px-3 text-[11px] text-muted tabular-nums">
        <span>{presets.length} Vorlagen</span>
        <span>Zuweisen: Leitung oder Schiene im Stromlaufplan auswählen und im Eigenschaften-Panel eine Vorlage anklicken</span>
      </div>
    </div>
  )
}
