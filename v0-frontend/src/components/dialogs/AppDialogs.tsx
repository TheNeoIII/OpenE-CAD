import { useState } from 'react'
import { backend } from '@/backend'
import { allCommands, shortcutsOf } from '@/commands/registry'
import { Dialog } from '@/components/ui/Dialog'
import { Button, Checkbox, Field, Input, Kbd, Segmented } from '@/components/ui/primitives'
import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

const close = () => useUiStore.getState().closeDialog()

export function SettingsDialog() {
  const s = useSettingsStore()
  return (
    <Dialog title="Einstellungen" width="md" footer={<Button variant="primary" onClick={close}>Fertig</Button>}>
      <div className="flex flex-col divide-y divide-line">
        <section className="flex flex-col gap-3 pb-4">
          <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">Darstellung</h3>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-fg-2">Design</span>
            <Segmented<ThemeMode>
              label="Design"
              value={s.theme}
              onChange={(v) => s.set('theme', v)}
              options={[
                { value: 'light', label: 'Hell' },
                { value: 'dark', label: 'Dunkel' },
                { value: 'dark-canvas', label: 'Dunkel + Plan' },
              ]}
            />
          </div>
          <Checkbox checked={s.mono} onChange={() => s.toggle('mono')} label="Plan monochrom darstellen (Druckvorschau)" />
          <Checkbox checked={s.guides} onChange={() => s.toggle('guides')} label="Strompfad-Hilfslinien anzeigen" />
        </section>
        <section className="flex flex-col gap-3 py-4">
          <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">Zeichnen</h3>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-fg-2">Rasterweite</span>
            <Segmented
              label="Rasterweite"
              value={String(s.gridSize) as '25' | '50' | '100'}
              onChange={(v) => s.set('gridSize', Number(v) as 25 | 50 | 100)}
              options={[
                { value: '25', label: '2,5 mm' },
                { value: '50', label: '5 mm' },
                { value: '100', label: '10 mm' },
              ]}
            />
          </div>
          <Checkbox checked={s.showGrid} onChange={() => s.toggle('showGrid')} label="Raster anzeigen" />
          <Checkbox checked={s.snap} onChange={() => s.toggle('snap')} label="Am Raster und an Anschlüssen fangen" />
          <Checkbox checked={s.confirmDelete} onChange={() => s.toggle('confirmDelete')} label="Löschen mehrerer Objekte bestätigen" />
        </section>
        <section className="flex flex-col gap-3 py-4">
          <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">Projekt</h3>
          <Checkbox checked={s.autosave} onChange={() => s.toggle('autosave')} label="Automatisch speichern (alle 60 s)" />
        </section>
        <EditorsSection />
      </div>
    </Dialog>
  )
}

function EditorsSection() {
  const editors = useSettingsStore((s) => s.editors)
  const defaultEditor = useSettingsStore((s) => s.defaultEditor)
  const [name, setName] = useState('')
  const add = () => {
    if (useSettingsStore.getState().addEditor(name)) setName('')
  }
  return (
    <section className="flex flex-col gap-3 pt-4" aria-labelledby="set-editors">
      <div className="flex flex-col gap-0.5">
        <h3 id="set-editors" className="text-[11px] font-semibold tracking-wide text-muted uppercase">
          Bearbeiter
        </h3>
        <p className="text-[11px] text-muted">Wird bei jeder Seite als „zuletzt bearbeitet von“ hinterlegt. Im Projekt wird ein Bearbeiter aus dieser Liste zugeordnet.</p>
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="Name des Bearbeiters"
          placeholder="Name, z. B. M. Muster"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
            e.preventDefault()
            add()
          }}
        />
        <Button onClick={add} disabled={!name.trim()}>
          Hinzufügen
        </Button>
      </div>
      {editors.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-3 py-2 text-[12px] text-muted">Noch kein Bearbeiter angelegt.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
          {editors.map((e) => (
            <li key={e} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[12px]">
              <span className="truncate text-fg">{e}</span>
              <div className="flex items-center gap-2">
                {e === defaultEditor ? (
                  <span className="text-[11px] text-accent">Standard</span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => useSettingsStore.getState().set('defaultEditor', e)}>
                    Als Standard
                  </Button>
                )}
                <Button size="sm" variant="ghost" aria-label={`${e} entfernen`} onClick={() => useSettingsStore.getState().removeEditor(e)}>
                  Entfernen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ShortcutsDialog() {
  const [q, setQ] = useState('')
  const groups = new Map<string, { label: string; keys: string[] }[]>()
  for (const c of allCommands()) {
    const keys = shortcutsOf(c)
    if (!keys.length || !`${c.label} ${c.category} ${keys.join(' ')}`.toLowerCase().includes(q.toLowerCase())) continue
    const list = groups.get(c.category) ?? []
    list.push({ label: c.label, keys })
    groups.set(c.category, list)
  }
  return (
    <Dialog title="Tastenkürzel" description="Jedes Kürzel ruft einen Befehl auf, der auch im Menü und in der Befehlspalette steht." width="lg" footer={<Button onClick={close}>Schließen</Button>}>
      <Input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtern" aria-label="Kürzel filtern" className="mb-3" />
      <div className="columns-2 gap-6">
        {[...groups].map(([cat, items]) => (
          <section key={cat} className="mb-4 break-inside-avoid">
            <h3 className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{cat}</h3>
            <ul className="flex flex-col">
              {items.map((it) => (
                <li key={it.label} className="flex items-center justify-between gap-3 py-1 text-[12px]">
                  <span className="text-fg-2">{it.label}</span>
                  <span className="flex gap-1">
                    {it.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  )
}

export function AboutDialog() {
  return (
    <Dialog title="Über OpenE-CAD" width="sm" footer={<Button variant="primary" onClick={close}>OK</Button>}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px]">
        <dt className="text-muted">Version</dt>
        <dd className="font-mono text-fg">0.1.0-dev</dd>
        <dt className="text-muted">Oberfläche</dt>
        <dd className="text-fg">React 19, Vite, Zustand, SVG-Renderer</dd>
        <dt className="text-muted">Kern</dt>
        <dd className="text-fg">{backend.kind === 'mock' ? 'Mock-Backend (Entwicklung)' : 'Tauri / Rust'}</dd>
        <dt className="text-muted">Lizenz</dt>
        <dd className="text-fg">Open Source</dd>
      </dl>
    </Dialog>
  )
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm }: { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void }) {
  return (
    <Dialog
      title={title}
      width="sm"
      onSubmit={() => {
        close()
        onConfirm()
      }}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[12.5px] text-fg-2">{message}</p>
    </Dialog>
  )
}

export function PromptDialog({ title, label, value: initial, confirmLabel = 'OK', onSubmit }: { title: string; label: string; value: string; confirmLabel?: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <Dialog
      title={title}
      width="sm"
      onSubmit={() => {
        if (!value.trim()) return
        close()
        onSubmit(value.trim())
      }}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label} htmlFor="prompt-v">
        <Input id="prompt-v" data-autofocus value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
    </Dialog>
  )
}
