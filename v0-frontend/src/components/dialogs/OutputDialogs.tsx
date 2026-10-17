import { FileUp } from 'lucide-react'
import { useState } from 'react'
import { backend } from '@/backend'
import { Dialog } from '@/components/ui/Dialog'
import { Button, Checkbox, Field, Input, Segmented, Select, Spinner } from '@/components/ui/primitives'
import { useDataStore } from '@/stores/dataStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useProjectStore } from '@/stores/projectStore'
import { toast, useUiStore } from '@/stores/uiStore'
import type { CellValue } from '@/types/data'
import { cn } from '@/utils/cn'
import { uid } from '@/utils/format'

const close = () => useUiStore.getState().closeDialog()

export function PdfExportDialog({ mode }: { mode: 'pdf' | 'print' }) {
  const doc = useDocumentStore((s) => s.document)
  const activeId = useDocumentStore((s) => s.activePageId)
  const [range, setRange] = useState<'all' | 'current' | 'custom'>('all')
  const [custom, setCustom] = useState('')
  const [color, setColor] = useState<'color' | 'mono'>('color')
  const [reports, setReports] = useState(true)
  const [busy, setBusy] = useState(false)
  if (!doc) return null
  const pageIds =
    range === 'all'
      ? doc.pages.map((p) => p.id)
      : range === 'current'
        ? [activeId!].filter(Boolean)
        : doc.pages.filter((p) => custom.split(/[,; ]+/).filter(Boolean).some((t) => p.number === t || p.number.startsWith(`${t}.`))).map((p) => p.id)
  const submit = async () => {
    if (!pageIds.length || busy) return
    setBusy(true)
    const { fileName } = await backend.exportDocuments(doc, { kind: 'pdf', pageIds, colorMode: color, includeReports: reports })
    setBusy(false)
    close()
    toast(mode === 'print' ? `${pageIds.length} Seiten an Drucker gesendet` : `${fileName} exportiert`, 'success')
  }
  return (
    <Dialog
      title={mode === 'print' ? 'Drucken' : 'PDF exportieren'}
      description={`${doc.pages.length} Seiten im Projekt`}
      onSubmit={submit}
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-muted tabular-nums">{pageIds.length} Seite(n) gewählt</span>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!pageIds.length || busy}>
            {busy ? <Spinner className="border-t-white" /> : null}
            {mode === 'print' ? 'Drucken' : 'Exportieren'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-[11px] font-medium text-muted">Seitenbereich</legend>
          {(
            [
              ['all', 'Alle Seiten'],
              ['current', 'Aktuelle Seite'],
              ['custom', 'Auswahl'],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-[12px] text-fg-2">
              <input type="radio" name="range" className="accent-[var(--accent)]" checked={range === v} onChange={() => setRange(v)} />
              {l}
              {v === 'custom' && (
                <Input
                  value={custom}
                  onChange={(e) => (setCustom(e.target.value), setRange('custom'))}
                  placeholder="z. B. 1, 2.1, 3"
                  className="ml-2 w-48"
                  mono
                  aria-label="Seitennummern"
                />
              )}
            </label>
          ))}
        </fieldset>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Farbe</span>
          <Segmented label="Farbmodus" value={color} onChange={setColor} options={[{ value: 'color', label: 'Farbe' }, { value: 'mono', label: 'Schwarz/Weiß' }]} />
        </div>
        <Checkbox checked={reports} onChange={setReports} label="Auswertungen anhängen (Stückliste, Klemmenplan, Kabelplan)" />
      </div>
    </Dialog>
  )
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DataExportDialog() {
  const view = useUiStore((s) => s.dataView)
  const table = useDataStore((s) => s.tables[view])
  const selected = useDataStore((s) => s.selected)
  const hidden = useDataStore((s) => s.hidden[view] ?? [])
  const [scope, setScope] = useState<'all' | 'selected'>(selected.length ? 'selected' : 'all')
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [visibleOnly, setVisibleOnly] = useState(true)
  const project = useProjectStore((s) => s.current)
  const submit = () => {
    if (!table) return
    const cols = table.columns.filter((c) => !visibleOnly || !hidden.includes(c.key))
    const sel = new Set(selected)
    const rows = table.rows.filter((r) => scope === 'all' || sel.has(r.id))
    const esc = (v: CellValue) => {
      const s = v == null ? '' : String(v)
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [cols.map((c) => esc(c.label)).join(';'), ...rows.map((r) => cols.map((c) => esc(r.cells[c.key])).join(';'))].join('\n')
    const name = `${project?.number ?? 'export'}_${view}.${format === 'csv' ? 'csv' : 'xlsx.csv'}`
    download(name, '\ufeff' + csv, 'text/csv;charset=utf-8')
    close()
    toast(`${rows.length} Zeilen exportiert`, 'success')
  }
  return (
    <Dialog
      title="Tabelle exportieren"
      description={table ? `${table.rows.length} Zeilen, ${table.columns.length} Spalten` : 'Tabelle wird geladen'}
      width="sm"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!table}>
            Exportieren
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Format</span>
          <Segmented label="Format" value={format} onChange={setFormat} options={[{ value: 'csv', label: 'CSV' }, { value: 'xlsx', label: 'Excel' }]} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Zeilen</span>
          <Segmented label="Zeilen" value={scope} onChange={setScope} options={[{ value: 'all', label: 'Alle' }, { value: 'selected', label: `Auswahl (${selected.length})` }]} />
        </div>
        <Checkbox checked={visibleOnly} onChange={setVisibleOnly} label="Nur sichtbare Spalten" />
      </div>
    </Dialog>
  )
}

export function DataImportDialog() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'update' | 'append'>('update')
  const submit = () => {
    if (!file) return
    close()
    toast(`${file.name}: Import wird vom Kern verarbeitet (Mock: keine Änderung)`)
  }
  return (
    <Dialog
      title="Tabelle importieren"
      description="CSV oder Excel. Spalten werden über die Kopfzeile zugeordnet."
      width="sm"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!file}>
            Importieren
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-6 text-center', file ? 'border-accent bg-accent-soft' : 'border-line-strong hover:bg-hover')}>
          <FileUp className="size-5 text-muted" aria-hidden />
          <span className="text-[12px] text-fg">{file ? file.name : 'Datei wählen'}</span>
          <span className="text-[11px] text-muted">.csv, .xlsx</span>
          <input type="file" accept=".csv,.xlsx" className="sr-only" data-autofocus onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Vorhandene Zeilen</span>
          <Segmented label="Importmodus" value={mode} onChange={setMode} options={[{ value: 'update', label: 'Aktualisieren' }, { value: 'append', label: 'Anhängen' }]} />
        </div>
      </div>
    </Dialog>
  )
}

export function BulkEditDialog() {
  const view = useUiStore((s) => s.dataView)
  const table = useDataStore((s) => s.tables[view])
  const selected = useDataStore((s) => s.selected)
  const editable = table?.columns.filter((c) => c.editable) ?? []
  const [key, setKey] = useState(editable[0]?.key ?? '')
  const [value, setValue] = useState('')
  const col = editable.find((c) => c.key === key)
  const submit = () => {
    if (!col || !selected.length) return
    const v: CellValue = col.type === 'number' ? (value === '' ? null : Number(value.replace(',', '.'))) : value
    useDataStore.getState().updateCells(view, selected, key, v)
    close()
    toast(`${col.label} in ${selected.length} Zeilen gesetzt`, 'success')
  }
  return (
    <Dialog
      title="Mehrfachbearbeitung"
      description={`${selected.length} Zeile(n) ausgewählt`}
      width="sm"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!selected.length || !col}>
            Übernehmen
          </Button>
        </>
      }
    >
      {!selected.length ? (
        <p className="text-[12px] text-muted">Zuerst Zeilen in der Tabelle markieren (Shift/Ctrl+Klick).</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Spalte" htmlFor="be-col">
            <Select id="be-col" data-autofocus value={key} onChange={(e) => setKey(e.target.value)}>
              {editable.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Neuer Wert" htmlFor="be-val">
            {col?.options ? (
              <Select id="be-val" value={value} onChange={(e) => setValue(e.target.value)}>
                <option value="" />
                {col.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            ) : (
              <Input id="be-val" mono={col?.type === 'number'} value={value} onChange={(e) => setValue(e.target.value)} />
            )}
          </Field>
        </div>
      )}
    </Dialog>
  )
}

export function RevisionDialog() {
  const current = useProjectStore((s) => s.current)
  const next = current ? String.fromCharCode(Math.max(65, (current.revision.charCodeAt(0) || 64) + 1)) : 'A'
  const [desc, setDesc] = useState('')
  const [author, setAuthor] = useState(current?.author ?? '')
  if (!current) return null
  const submit = () => {
    if (!desc.trim()) return
    const rev = { id: uid('rev'), index: next, date: new Date().toISOString(), author, description: desc.trim() }
    useProjectStore.getState().updateCurrent({ revision: next, revisions: [rev, ...current.revisions] })
    close()
    toast(`Revision ${next} angelegt`, 'success')
  }
  return (
    <Dialog
      title="Neue Revision"
      description={`Aktuell ${current.revision} · neu ${next}`}
      width="sm"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!desc.trim()}>
            Anlegen
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Änderungsbeschreibung" htmlFor="rv-desc">
          <Input id="rv-desc" data-autofocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="z. B. Motorschutz -F3 auf 6,3 A geändert" />
        </Field>
        <Field label="Bearbeiter" htmlFor="rv-auth">
          <Input id="rv-auth" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}
