import { useEffect, useState } from 'react'
import { Field, Input, Select } from '@/components/ui/primitives'
import { runCommand } from '@/commands/registry'
import type { CadDiagramBlock, CadPortDirection, CadPortEdge, CadPortLabelPlacement } from '@/types/cad'
import { uid } from '@/utils/format'
import { deletePort, updatePort, updateShape } from '../actions'

function CommitInput({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => { if (draft !== value) onCommit(draft) }
  return <Field label={label}><Input aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter') e.currentTarget.blur()
  }} /></Field>
}
const buttonClass = 'rounded border border-line px-2 py-1 text-xs hover:bg-app focus-visible:outline-2'

export function BlockProperties({ block }: { block: CadDiagramBlock }) {
  const fields = block.fields ?? []
  const updateField = (id: string, patch: Partial<typeof fields[number]>) => updateShape(block.id, { fields: fields.map((f) => f.id === id ? { ...f, ...patch } : f) }, 'Bausteinfeld geändert')
  return <>
    <section className="space-y-2 border-b border-line p-3">
      <h3 className="text-xs font-semibold">Allgemein</h3>
      <CommitInput label="Titel" value={block.title} onCommit={(title) => updateShape(block.id, { title })} />
      <CommitInput label="Beschreibung" value={block.description ?? ''} onCommit={(description) => updateShape(block.id, { description })} />
    </section>
    <section className="space-y-3 border-b border-line p-3">
      <h3 className="text-xs font-semibold">Felder</h3>
      {fields.map((field, i) => <div key={field.id} className="space-y-2 rounded border border-line p-2">
        <CommitInput label={`Feld ${i + 1} Label`} value={field.label} onCommit={(label) => updateField(field.id, { label })} />
        <CommitInput label={`Feld ${i + 1} Wert`} value={field.value} onCommit={(value) => updateField(field.id, { value })} />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={field.visible !== false} onChange={(e) => updateField(field.id, { visible: e.target.checked })} />Sichtbar</label>
          <button className={buttonClass} onClick={() => updateShape(block.id, { fields: fields.filter((f) => f.id !== field.id) }, 'Feld gelöscht')}>Feld löschen</button>
        </div>
      </div>)}
      <button className={buttonClass} onClick={() => updateShape(block.id, { fields: [...fields, { id: uid('field'), label: '', value: '', visible: true }] }, 'Feld hinzugefügt')}>Feld hinzufügen</button>
    </section>
    <section className="space-y-3 border-b border-line p-3">
      <h3 className="text-xs font-semibold">Ports</h3>
      {(block.ports ?? []).map((port, i) => <div key={port.id} className="space-y-2 rounded border border-line p-2">
        <CommitInput label={`Port ${i + 1} Label`} value={port.label ?? ''} onCommit={(label) => updatePort(block.id, port.id, { label })} />
        <Field label="Labelposition"><Select aria-label={`Port ${i + 1} Labelposition`} value={port.labelPlacement ?? 'auto'} onChange={(e) => updatePort(block.id, port.id, { labelPlacement: e.target.value as CadPortLabelPlacement })}>
          <option value="auto">Automatisch (außen)</option><option value="left">Links</option><option value="right">Rechts</option><option value="top">Oben</option><option value="bottom">Unten</option>
        </Select></Field>
        <CommitInput label={`Port ${i + 1} Typ`} value={port.portType ?? 'generic'} onCommit={(portType) => updatePort(block.id, port.id, { portType })} />
        <Field label="Richtung"><Select aria-label={`Port ${i + 1} Richtung`} value={port.direction ?? 'bidirectional'} onChange={(e) => updatePort(block.id, port.id, { direction: e.target.value as CadPortDirection })}>
          <option value="input">Eingang</option><option value="output">Ausgang</option><option value="bidirectional">Bidirektional</option><option value="passive">Passiv</option>
        </Select></Field>
        <Field label="Kante"><Select aria-label={`Port ${i + 1} Kante`} value={port.edge} onChange={(e) => updatePort(block.id, port.id, { edge: e.target.value as CadPortEdge })}>
          <option value="top">Oben</option><option value="right">Rechts</option><option value="bottom">Unten</option><option value="left">Links</option>
        </Select></Field>
        <CommitInput label={`Port ${i + 1} Position (%)`} value={String(Math.round(port.t * 10000) / 100)} onCommit={(value) => { const t = Number(value) / 100; if (Number.isFinite(t)) updatePort(block.id, port.id, { t }) }} />
        <button className={buttonClass} onClick={() => deletePort(block.id, port.id)}>Port löschen</button>
      </div>)}
      <button className={buttonClass} onClick={() => runCommand('tool.port')}>Port hinzufügen</button>
      <p className="text-xs text-muted">An eine Bausteinkante klicken. Escape beendet das Port-Werkzeug.</p>
    </section>
  </>
}
