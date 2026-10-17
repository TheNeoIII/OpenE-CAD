import { FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button, Field, Input } from '@/components/ui/primitives'
import { useProjectStore } from '@/stores/projectStore'
import { toast, useUiStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { fmtDate } from '@/utils/format'

const close = () => useUiStore.getState().closeDialog()

export function NewProjectDialog() {
  const templates = useProjectStore((s) => s.templates)
  const [form, setForm] = useState({ name: '', number: `P-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`, customer: '', location: '', templateId: templates[0]?.id ?? '' })
  const [busy, setBusy] = useState(false)
  const valid = form.name.trim().length > 1 && form.number.trim().length > 0
  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    await useProjectStore.getState().create({ ...form, name: form.name.trim() })
    close()
    toast(`Projekt „${form.name.trim()}“ angelegt`, 'success')
  }
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })
  return (
    <Dialog
      title="Neues Projekt"
      description="Projektdaten und Vorlage. Alles ist später in den Projekteigenschaften änderbar."
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!valid || busy}>
            {busy ? 'Wird angelegt …' : 'Anlegen und öffnen'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Projektname *" htmlFor="np-name" className="col-span-2">
          <Input id="np-name" data-autofocus value={form.name} onChange={f('name')} placeholder="z. B. Lüftungsanlage Halle 3" />
        </Field>
        <Field label="Projektnummer *" htmlFor="np-num">
          <Input id="np-num" mono value={form.number} onChange={f('number')} />
        </Field>
        <Field label="Kunde" htmlFor="np-cust">
          <Input id="np-cust" value={form.customer} onChange={f('customer')} />
        </Field>
        <Field label="Anlagenort" htmlFor="np-loc" className="col-span-2">
          <Input id="np-loc" value={form.location} onChange={f('location')} />
        </Field>
        <fieldset className="col-span-2 flex flex-col gap-1.5">
          <legend className="mb-1 text-[11px] font-medium text-muted">Vorlage</legend>
          {templates.map((t) => (
            <label key={t.id} className={cn('flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2', form.templateId === t.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong')}>
              <input type="radio" name="tpl" className="mt-0.5 accent-[var(--accent)]" checked={form.templateId === t.id} onChange={() => setForm({ ...form, templateId: t.id })} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-fg">{t.name}</span>
                <span className="block text-[11.5px] text-muted">{t.description}</span>
              </span>
              <span className="font-mono text-[11px] text-muted">{t.pages} S.</span>
            </label>
          ))}
        </fieldset>
      </div>
    </Dialog>
  )
}

export function OpenProjectDialog() {
  const projects = useProjectStore((s) => s.projects)
  const [q, setQ] = useState('')
  const list = projects.filter((p) => `${p.name} ${p.number} ${p.customer}`.toLowerCase().includes(q.toLowerCase()))
  const [active, setActive] = useState(0)
  const open = async (id: string) => {
    close()
    await useProjectStore.getState().openProject(id)
    useUiStore.getState().setWorkspace('schematic')
  }
  return (
    <Dialog title="Projekt öffnen" width="lg" onSubmit={() => list[active] && open(list[active].id)} footer={<Button onClick={close}>Abbrechen</Button>} bodyClassName="p-0">
      <div className="border-b border-line p-3">
        <Input
          data-autofocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(list.length - 1, a + 1)))
            if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(0, a - 1)))
          }}
          placeholder="Name, Nummer oder Kunde filtern"
          aria-label="Projekte filtern"
        />
      </div>
      <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox" aria-label="Projekte">
        {list.map((p, i) => (
          <li key={p.id} role="option" aria-selected={i === active}>
            <button type="button" onMouseMove={() => setActive(i)} onClick={() => open(p.id)} className={cn('flex w-full items-center gap-3 px-4 py-2 text-left', i === active && 'bg-accent-soft')}>
              <FolderOpen className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-fg">{p.name}</span>
                <span className="block truncate text-[11.5px] text-muted">
                  {p.customer} · {p.location}
                </span>
              </span>
              <span className="font-mono text-[11px] text-muted">{p.number}</span>
              <span className="w-20 text-right text-[11px] text-muted">{fmtDate(p.updatedAt)}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="px-4 py-6 text-center text-[12px] text-muted">Keine Projekte gefunden</li>}
      </ul>
    </Dialog>
  )
}

export function DuplicateProjectDialog({ projectId }: { projectId: string }) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId) ?? (s.current?.id === projectId ? s.current : undefined))
  const [name, setName] = useState(project ? `${project.name} (Kopie)` : '')
  const submit = async () => {
    if (!name.trim()) return
    await useProjectStore.getState().duplicate(projectId, name.trim())
    close()
    toast('Projekt dupliziert', 'success')
  }
  return (
    <Dialog
      title="Projekt duplizieren"
      description={project ? `Vorlage: ${project.name} (${project.number})` : undefined}
      width="sm"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Duplizieren
          </Button>
        </>
      }
    >
      <Field label="Name der Kopie" htmlFor="dup-name">
        <Input id="dup-name" data-autofocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
    </Dialog>
  )
}
