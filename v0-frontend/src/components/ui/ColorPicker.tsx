import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Dialog } from './Dialog'
import { Button } from './primitives'

const palette = ['#ffffff', '#9ca3af', '#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#8b5a2b']
const valid = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

export function ColorPicker({ value, onChange, label, children }: { value: string; onChange: (color: string) => void; label: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const color = valid(draft) ? draft : valid(value) ? value : '#ffffff'
  const channel = (index: number) => parseInt(color.slice(1 + index * 2, 3 + index * 2), 16)
  const changeChannel = (index: number, next: number) => setDraft('#' + [0, 1, 2].map((i) => (i === index ? next : channel(i)).toString(16).padStart(2, '0')).join(''))
  const close = () => setOpen(false)
  const apply = () => { if (valid(draft)) { onChange(draft.toLowerCase()); close() } }
  return <>
    <button type="button" aria-label={label} aria-haspopup="dialog" title={label} onClick={() => { setDraft(valid(value) ? value : '#ffffff'); setOpen(true) }} className="inline-flex min-h-7 items-center justify-center rounded border border-line p-1 focus-visible:outline focus-visible:outline-accent">
      {children ?? <span className="h-5 w-10 rounded-sm border border-white/20" style={{ backgroundColor: value }} />}
    </button>
    {open && createPortal(<Dialog title={label} description="Farbton wählen oder einen exakten HEX-/RGB-Wert einstellen." width="sm" onClose={close} onSubmit={apply} footer={<><Button onClick={close}>Abbrechen</Button><Button onClick={apply} disabled={!valid(draft)}>Übernehmen</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="flex h-16 overflow-hidden rounded-md border border-line"><div className="flex flex-1 items-end p-2 text-[10px]" style={{ backgroundColor: value }}><span className="rounded bg-black/70 px-1 text-white">Bisher</span></div><div className="flex flex-1 items-end p-2 text-[10px]" style={{ backgroundColor: color }}><span className="rounded bg-black/70 px-1 text-white">Neu</span></div></div>
        <div className="grid grid-cols-6 gap-2" aria-label="Farbpalette">{palette.map((c) => <button type="button" key={c} aria-label={`Farbe ${c}`} aria-pressed={color.toLowerCase() === c} onClick={() => setDraft(c)} className="h-8 rounded border border-white/20 focus-visible:outline focus-visible:outline-accent" style={{ backgroundColor: c }} />)}</div>
        {[['Rot', '#ef4444'], ['Grün', '#22c55e'], ['Blau', '#3b82f6']].map(([name, tint], i) => <label key={name} className="flex items-center gap-3 text-xs"><span className="w-8">{name}</span><input aria-label={name} type="range" min="0" max="255" value={channel(i)} onChange={(e) => changeChannel(i, Number(e.target.value))} className="min-w-0 flex-1" style={{ accentColor: tint }} /><span className="w-7 text-right font-mono">{channel(i)}</span></label>)}
        <label className="flex items-center gap-3 text-xs">HEX<input aria-label="HEX-Farbe" value={draft} maxLength={7} onChange={(e) => setDraft(e.target.value)} aria-invalid={!valid(draft)} spellCheck={false} className="h-8 min-w-0 flex-1 rounded border border-line bg-app px-2 font-mono text-fg" /></label>
        {!valid(draft) && <p role="status" className="text-xs text-error">Bitte sechs Hexadezimalstellen eingeben, z. B. #22c55e.</p>}
      </div>
    </Dialog>, document.body)}
  </>
}
