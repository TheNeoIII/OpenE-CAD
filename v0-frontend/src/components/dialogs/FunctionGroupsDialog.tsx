import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button, IconButton, Input } from '@/components/ui/primitives'
import { applyFunctionGroups, type FunctionGroupEdit } from '@/features/schematic/actions'
import { useDocumentStore } from '@/stores/documentStore'
import { toast, useUiStore } from '@/stores/uiStore'
import { groupNo, sortedGroups } from '@/utils/pages'

const close = () => useUiStore.getState().closeDialog()

interface Row {
  key: string
  origId: string | null
  id: string
  label: string
  no: string
}

export function FunctionGroupsDialog() {
  const doc = useDocumentStore((s) => s.document)
  const [rows, setRows] = useState<Row[]>(() =>
    doc ? sortedGroups(doc).map((g) => ({ key: g.id, origId: g.id, id: g.id, label: g.label, no: String(groupNo(doc, g.id)) })) : [],
  )
  if (!doc) return null

  const pageCount = (origId: string | null) => (origId ? doc.pages.filter((p) => p.functionGroup === origId).length : 0)
  const ids = rows.map((r) => r.id.trim())
  const nos = rows.map((r) => r.no.trim())
  const rowError = (r: Row) => {
    if (!r.id.trim()) return 'Kennzeichen fehlt'
    if (ids.filter((x) => x === r.id.trim()).length > 1) return 'Kennzeichen doppelt'
    if (!/^\d+$/.test(r.no.trim())) return 'Nummer ungültig'
    if (nos.filter((x) => x === r.no.trim()).length > 1) return 'Nummer doppelt'
    return null
  }
  const valid = rows.length > 0 && rows.every((r) => !rowError(r))

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))
  const add = () => {
    const maxNo = rows.reduce((m, r) => Math.max(m, parseInt(r.no, 10) || 0), 0)
    let n = rows.length + 1
    while (ids.includes(`=M${n}`)) n++
    setRows((rs) => [...rs, { key: `new-${Date.now()}`, origId: null, id: `=M${n}`, label: 'Neue Gruppe', no: String(maxNo + 1) }])
  }

  const submit = () => {
    if (!valid) return
    const entries: FunctionGroupEdit[] = rows.map((r) => ({ origId: r.origId, group: { id: r.id.trim(), label: r.label.trim(), no: parseInt(r.no, 10) } }))
    applyFunctionGroups(entries)
    close()
    toast('Funktionsgruppen gespeichert', 'success')
  }

  return (
    <Dialog
      title="Funktionsgruppen verwalten"
      description="Jede Gruppe hat eine feste Nummer. Seiten innerhalb der Gruppe werden als Gruppe.Seite nummeriert (z. B. 2.4); im Plankopf steht zusätzlich die fortlaufende Seitenzahl."
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!valid}>
            Übernehmen
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[4rem_6rem_1fr_3.5rem_1.75rem] items-center gap-2 px-1 text-[11px] font-medium text-muted">
          <span>Nr.</span>
          <span>Kennz.</span>
          <span>Bezeichnung</span>
          <span className="text-right">Seiten</span>
          <span className="sr-only">Aktion</span>
        </div>
        <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {rows.map((r) => {
            const count = pageCount(r.origId)
            const err = rowError(r)
            return (
              <li key={r.key} className="flex flex-col gap-0.5">
                <div className="grid grid-cols-[4rem_6rem_1fr_3.5rem_1.75rem] items-center gap-2">
                  <Input aria-label="Gruppennummer" inputMode="numeric" value={r.no} onChange={(e) => patch(r.key, { no: e.target.value })} className="font-mono" />
                  <Input aria-label="Kennzeichen" value={r.id} onChange={(e) => patch(r.key, { id: e.target.value })} className="font-mono" />
                  <Input aria-label="Bezeichnung" value={r.label} onChange={(e) => patch(r.key, { label: e.target.value })} />
                  <span className="text-right font-mono text-[11px] text-muted">{count}</span>
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    label={count ? 'Gruppe enthält Seiten und kann nicht gelöscht werden' : 'Gruppe löschen'}
                    disabled={count > 0 || rows.length <= 1}
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  />
                </div>
                {err && <p className="px-1 text-[11px] text-error">{err}</p>}
              </li>
            )
          })}
        </ul>
        <div>
          <Button onClick={add}>
            <Plus className="size-3.5" aria-hidden />
            Gruppe hinzufügen
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
