import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button, Checkbox, Field, IconButton, Input, Segmented, Select } from '@/components/ui/primitives'
import { useProjectStore } from '@/stores/projectStore'
import { toast, useUiStore } from '@/stores/uiStore'
import { useUserDirectory } from '@/stores/userDirectoryStore'
import type { DocPageConfig, Party } from '@/types/project'
import { editorPatch, projectEditorSource, type ProjectEditorSource } from '@/utils/projectEditor'
import { CABINET_SPEC_FIELDS, DOC_PAGE_LABELS, NET_SPEC_FIELDS, resolveDocPages, type SpecField } from '@/utils/docPages'

const close = () => useUiStore.getState().closeDialog()

type Tab = 'general' | 'creator' | 'client' | 'spec' | 'pages'

const EMPTY_PARTY: Party = { name: '', street: '', city: '', phone: '', email: '', contact: '' }
const MAX_LOGO_BYTES = 512 * 1024

function PartyForm({ idPrefix, value, onChange }: { idPrefix: string; value: Party; onChange: (p: Party) => void }) {
  const f = (k: keyof Party) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value })
  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Bitte eine Bilddatei wählen', 'error')
    if (file.size > MAX_LOGO_BYTES) return toast('Logo ist größer als 512 KB', 'error')
    const reader = new FileReader()
    reader.onload = () => onChange({ ...value, logo: String(reader.result) })
    reader.readAsDataURL(file)
  }
  return (
    <div className="grid grid-cols-[1fr_10rem] gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Firma" htmlFor={`${idPrefix}-name`} className="col-span-2">
          <Input id={`${idPrefix}-name`} value={value.name} onChange={f('name')} placeholder="Muster GmbH" />
        </Field>
        <Field label="Straße" htmlFor={`${idPrefix}-street`} className="col-span-2">
          <Input id={`${idPrefix}-street`} value={value.street} onChange={f('street')} />
        </Field>
        <Field label="PLZ / Ort" htmlFor={`${idPrefix}-city`} className="col-span-2">
          <Input id={`${idPrefix}-city`} value={value.city} onChange={f('city')} />
        </Field>
        <Field label="Telefon" htmlFor={`${idPrefix}-phone`}>
          <Input id={`${idPrefix}-phone`} value={value.phone} onChange={f('phone')} />
        </Field>
        <Field label="E-Mail" htmlFor={`${idPrefix}-mail`}>
          <Input id={`${idPrefix}-mail`} type="email" value={value.email} onChange={f('email')} />
        </Field>
        <Field label="Ansprechpartner" htmlFor={`${idPrefix}-contact`} className="col-span-2">
          <Input id={`${idPrefix}-contact`} value={value.contact} onChange={f('contact')} />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-muted">Logo</span>
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-dashed border-line-strong bg-app">
          {value.logo ? <img src={value.logo} alt="Logo-Vorschau" className="max-h-full max-w-full object-contain p-2" /> : <span className="text-[11px] text-muted">Kein Logo</span>}
        </div>
        <label className="inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line bg-panel-2 px-2 text-[12px] text-fg-2 hover:bg-hover focus-within:ring-2 focus-within:ring-accent-soft">
          <ImagePlus className="size-3.5" aria-hidden />
          Logo wählen
          <input type="file" accept="image/*" className="sr-only" onChange={pickLogo} />
        </label>
        {value.logo && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange({ ...value, logo: undefined })}>
            Entfernen
          </Button>
        )}
      </div>
    </div>
  )
}

function SpecFields({ title, fields, values, onChange }: { title: string; fields: SpecField[]; values: Record<string, string>; onChange: (key: string, v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</legend>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {fields.map((fd) => (
          <Field key={fd.key} label={fd.label} htmlFor={`spec-${fd.key}`}>
            <Input id={`spec-${fd.key}`} value={values[fd.key] ?? ''} placeholder={fd.placeholder} onChange={(e) => onChange(fd.key, e.target.value)} />
          </Field>
        ))}
      </div>
    </fieldset>
  )
}

function PageOrder({ pages, onChange }: { pages: DocPageConfig[]; onChange: (p: DocPageConfig[]) => void }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= pages.length) return
    const next = [...pages]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-muted text-pretty">Reihenfolge und Auswahl der Dokumentationsseiten. Gilt für die Dokumentationsansicht und den PDF-Export.</p>
      <ol className="flex flex-col rounded-md border border-line">
        {pages.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-0">
            <span className="w-5 font-mono text-[11px] text-muted tabular-nums">{i + 1}</span>
            <div className="flex-1">
              <Checkbox checked={p.enabled} onChange={(v) => onChange(pages.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))} label={DOC_PAGE_LABELS[p.id]} />
            </div>
            <IconButton icon={ArrowUp} label={`${DOC_PAGE_LABELS[p.id]} nach oben`} size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
            <IconButton icon={ArrowDown} label={`${DOC_PAGE_LABELS[p.id]} nach unten`} size="sm" disabled={i === pages.length - 1} onClick={() => move(i, 1)} />
          </li>
        ))}
      </ol>
    </div>
  )
}

const CUSTOM = '__custom__'

/** Bearbeiter: an account from the directory XOR a free-text name. Metadata only, never a permission. */
function EditorPicker({ value, onChange }: { value: ProjectEditorSource; onChange: (v: ProjectEditorSource) => void }) {
  const directory = useUserDirectory()
  const assignedId = value.kind === 'user' ? value.userId : null
  const selectable = directory.filter((u) => u.status === 'active' || u.id === assignedId)
  const assignedMissing = assignedId !== null && !directory.some((u) => u.id === assignedId)
  const selectValue = value.kind === 'user' ? value.userId : value.kind === 'custom' ? CUSTOM : ''
  const pick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (v === '') onChange({ kind: 'none' })
    else if (v === CUSTOM) onChange({ kind: 'custom', name: value.kind === 'custom' ? value.name : '' })
    else onChange({ kind: 'user', userId: v })
  }
  const assigned = directory.find((u) => u.id === assignedId)
  return (
    <div className="flex flex-col gap-2">
      <Field label="Bearbeiter" htmlFor="ps-auth">
        <Select id="ps-auth" value={selectValue} onChange={pick}>
          <option value="">— keiner —</option>
          {assignedMissing && <option value={assignedId}>Unbekannter Benutzer</option>}
          {selectable.length > 0 && (
            <optgroup label="Benutzerkonten">
              {selectable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                  {u.status !== 'active' ? ' (deaktiviert)' : ''}
                </option>
              ))}
            </optgroup>
          )}
          <option value={CUSTOM}>Freier Name (ohne Konto)…</option>
        </Select>
      </Field>
      {value.kind === 'custom' && (
        <Input aria-label="Name des Bearbeiters" value={value.name} maxLength={120} placeholder="z. B. H. Schmidt (extern)" onChange={(e) => onChange({ kind: 'custom', name: e.target.value })} autoFocus />
      )}
      {assigned && assigned.status !== 'active' && <p className="text-[11px] text-warn">Konto ist deaktiviert. Die Zuordnung bleibt erhalten.</p>}
      {assignedMissing && <p className="text-[11px] text-muted">Das zugeordnete Konto ist nicht mehr vorhanden.</p>}
    </div>
  )
}

export function ProjectSettingsDialog({ projectId }: { projectId?: string }) {
  const current = useProjectStore((s) => {
    const id = projectId ?? s.current?.id
    if (!id) return null
    return s.current?.id === id ? s.current : (s.sessions[id]?.project ?? s.projects.find((p) => p.id === id) ?? null)
  })
  const [tab, setTab] = useState<Tab>('general')
  const [editor, setEditor] = useState<ProjectEditorSource>(() => (current ? projectEditorSource(current) : { kind: 'none' }))
  const [form, setForm] = useState(() => ({
    name: current?.name ?? '',
    number: current?.number ?? '',
    customer: current?.customer ?? '',
    location: current?.location ?? '',
    standard: current?.standard ?? 'IEC 81346',
    description: current?.description ?? '',
  }))
  const [creator, setCreator] = useState<Party>(() => ({ ...EMPTY_PARTY, ...current?.creator }))
  const [client, setClient] = useState<Party>(() => ({ ...EMPTY_PARTY, name: current?.customer ?? '', ...current?.client }))
  const [spec, setSpec] = useState<Record<string, string>>(() => ({ ...current?.spec }))
  const [docPages, setDocPages] = useState<DocPageConfig[]>(() => resolveDocPages(current))
  if (!current) return null
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value })
  const submit = () => {
    if (editor.kind === 'custom' && !editor.name.trim()) {
      setTab('general')
      return toast('Bitte einen Namen für den freien Bearbeiter eingeben', 'error')
    }
    void useProjectStore.getState().updateProject(current.id, { ...form, ...editorPatch(editor), author: undefined, creator, client, spec, docPages })
    close()
    toast('Projekteigenschaften übernommen', 'success')
  }
  return (
    <Dialog
      title="Projekteigenschaften"
      description="Diese Angaben erscheinen im Schriftfeld, auf dem Deckblatt und in den Spezifikationsseiten."
      width="xl"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary">
            Übernehmen
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="Bereich"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'general', label: 'Allgemein' },
            { value: 'creator', label: 'Ersteller' },
            { value: 'client', label: 'Auftraggeber' },
            { value: 'spec', label: 'Spezifikation' },
            { value: 'pages', label: 'Seiten' },
          ]}
        />
        <div className="min-h-[22rem]">
          {tab === 'general' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Projektname" htmlFor="ps-name" className="col-span-2">
                <Input id="ps-name" value={form.name} onChange={f('name')} />
              </Field>
              <Field label="Projektnummer" htmlFor="ps-num">
                <Input id="ps-num" mono value={form.number} onChange={f('number')} />
              </Field>
              <Field label="Norm / Kennzeichnung" htmlFor="ps-std">
                <Select id="ps-std" value={form.standard} onChange={f('standard')}>
                  <option>IEC 81346</option>
                  <option>IEC 81346 / DIN EN 61082</option>
                  <option>DIN EN 61346</option>
                  <option>NFPA 79</option>
                </Select>
              </Field>
              <Field label="Kunde (Kurzname)" htmlFor="ps-cust">
                <Input id="ps-cust" value={form.customer} onChange={f('customer')} />
              </Field>
              <Field label="Anlagenort" htmlFor="ps-loc">
                <Input id="ps-loc" value={form.location} onChange={f('location')} />
              </Field>
              <EditorPicker value={editor} onChange={setEditor} />
              <Field label="Revision" htmlFor="ps-rev">
                <Input id="ps-rev" mono value={current.revision} disabled />
              </Field>
              <Field label="Beschreibung" htmlFor="ps-desc" className="col-span-2">
                <textarea id="ps-desc" rows={3} value={form.description} onChange={f('description')} className="w-full resize-none rounded-md border border-line bg-app px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
              </Field>
            </div>
          )}
          {tab === 'creator' && <PartyForm idPrefix="cr" value={creator} onChange={setCreator} />}
          {tab === 'client' && <PartyForm idPrefix="cl" value={client} onChange={setClient} />}
          {tab === 'spec' && (
            <div className="flex flex-col gap-5">
              <SpecFields title="Netzdaten & Verdrahtung" fields={NET_SPEC_FIELDS} values={spec} onChange={(k, v) => setSpec({ ...spec, [k]: v })} />
              <SpecFields title="Schrankspezifikation" fields={CABINET_SPEC_FIELDS} values={spec} onChange={(k, v) => setSpec({ ...spec, [k]: v })} />
            </div>
          )}
          {tab === 'pages' && <PageOrder pages={docPages} onChange={setDocPages} />}
        </div>
      </div>
    </Dialog>
  )
}
