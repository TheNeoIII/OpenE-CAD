import { LayoutGrid, Plus, Undo2, Wand2 } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { Badge, Button, Empty, PanelHeader, Select } from '@/components/ui/primitives'
import { addCabinetRow, autoPlace, placeDevice, unplaceDevice } from '@/features/schematic/actions'
import { useDocumentStore } from '@/stores/documentStore'
import { useUiStore } from '@/stores/uiStore'
import type { Device } from '@/types/device'
import { cn } from '@/utils/cn'

const TE_PX = 18
const MIME = 'application/x-openecad-device'

function DeviceBlock({ device, selected, draggable = true }: { device: Device; selected: boolean; draggable?: boolean }) {
  const w = Math.max(1, device.widthTE) * TE_PX
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(MIME, device.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={(e) => {
        e.stopPropagation()
        useUiStore.getState().set({ cabinetSelection: device.id })
      }}
      title={`${device.bmk} · ${device.function || device.category} · ${device.widthTE} TE`}
      style={{ width: w }}
      className={cn(
        'flex h-[88px] shrink-0 cursor-grab flex-col items-center justify-between rounded-sm border bg-panel-2 py-1.5 text-center active:cursor-grabbing',
        selected ? 'border-accent ring-2 ring-accent-soft' : 'border-line-strong hover:border-accent',
      )}
    >
      <span className="w-full truncate px-0.5 font-mono text-[10.5px] font-semibold text-fg">{device.bmk}</span>
      <span className="h-6 w-[60%] rounded-[2px] border border-line bg-app" aria-hidden />
      <span className="w-full truncate px-0.5 font-mono text-[9.5px] text-muted">{device.widthTE}TE</span>
    </button>
  )
}

function Rail({ cabinetId, row, devices, capacity, selection }: { cabinetId: string; row: number; devices: Device[]; capacity: number; selection: string | null }) {
  const [over, setOver] = useState<number | null>(null)
  const used = devices.reduce((s, d) => s + d.widthTE, 0)
  const overfull = used > capacity

  const indexAt = (e: DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 12
    let acc = 0
    for (let i = 0; i < devices.length; i++) {
      const w = devices[i].widthTE * TE_PX
      if (x < acc + w / 2) return i
      acc += w
    }
    return devices.length
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-medium text-fg-2">Tragschiene {row + 1}</span>
        <span className={cn('font-mono tabular-nums', overfull ? 'text-error' : 'text-muted')}>
          {used} / {capacity} TE
        </span>
        {overfull && <Badge tone="error">Überbelegt</Badge>}
      </div>
      <div
        role="list"
        aria-label={`Tragschiene ${row + 1}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(MIME)) return
          e.preventDefault()
          setOver(indexAt(e))
        }}
        onDragLeave={() => setOver(null)}
        onDrop={(e) => {
          const id = e.dataTransfer.getData(MIME)
          const idx = indexAt(e)
          setOver(null)
          if (id) placeDevice(id, cabinetId, row, idx)
        }}
        style={{ width: capacity * TE_PX + 24 }}
        className={cn('relative flex items-center rounded-md border px-3 py-3', overfull ? 'border-error bg-error-soft' : 'border-line bg-app', over != null && 'border-accent')}
      >
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-5 -translate-y-1/2 rounded-[2px] border-y border-line-strong bg-panel" aria-hidden />
        <div className="relative flex items-center">
          {devices.map((d, i) => (
            <div key={d.id} role="listitem" className="relative flex">
              {over === i && <span className="absolute -left-px top-0 bottom-0 w-0.5 bg-accent" aria-hidden />}
              <DeviceBlock device={d} selected={selection === d.id} />
            </div>
          ))}
          {over === devices.length && <span className="h-[88px] w-0.5 bg-accent" aria-hidden />}
          {!devices.length && over == null && <span className="relative px-2 text-[11px] text-muted">Geräte hierher ziehen</span>}
        </div>
      </div>
    </div>
  )
}

export function CabinetWorkspace() {
  const doc = useDocumentStore((s) => s.document)
  const cabinetId = useUiStore((s) => s.cabinetId)
  const selection = useUiStore((s) => s.cabinetSelection)
  const cab = doc?.cabinets.find((c) => c.id === cabinetId) ?? doc?.cabinets[0]

  const { rows, unplaced } = useMemo(() => {
    if (!doc || !cab) return { rows: [] as Device[][], unplaced: [] as Device[] }
    const rows = Array.from({ length: cab.rows }, (_, r) =>
      doc.devices.filter((d) => d.placement?.cabinetId === cab.id && d.placement.row === r).sort((a, b) => a.placement!.order - b.placement!.order),
    )
    return { rows, unplaced: doc.devices.filter((d) => !d.placement && d.mount === 'rail') }
  }, [doc, cab])

  if (!doc) return null
  if (!cab) return <Empty icon={LayoutGrid} title="Kein Schaltschrank im Projekt" />
  const sel = doc.devices.find((d) => d.id === selection)
  const doorDevices = doc.devices.filter((d) => d.mount === 'door')

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <aside aria-label="Nicht platzierte Geräte" className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
        <PanelHeader title={`Nicht platziert · ${unplaced.length}`}>
          <Button size="sm" variant="ghost" icon={Wand2} disabled={!unplaced.length} onClick={() => autoPlace(cab.id)}>
            Auto
          </Button>
        </PanelHeader>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-2"
          onDragOver={(e) => e.dataTransfer.types.includes(MIME) && e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData(MIME)
            if (id) unplaceDevice(id)
          }}
        >
          {unplaced.length ? (
            <ul className="flex flex-col gap-1">
              {unplaced.map((d) => (
                <li key={d.id}>
                  <div
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData(MIME, d.id)}
                    onClick={() => useUiStore.getState().set({ cabinetSelection: d.id })}
                    className={cn('flex cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 text-[12px]', selection === d.id ? 'border-accent bg-accent-soft' : 'border-line bg-app hover:border-line-strong')}
                  >
                    <span className="w-10 font-mono font-medium">{d.bmk}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{d.function || d.category}</span>
                    <span className="font-mono text-[10.5px] text-muted">{d.widthTE}TE</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-2 text-[12px] text-muted">Alle Hutschienengeräte sind platziert. Geräte hierher ziehen, um sie zu entfernen.</p>
          )}
        </div>
      </aside>

      <main aria-label="Schaltschrankaufbau" className="flex min-w-0 flex-1 flex-col" onClick={() => useUiStore.getState().set({ cabinetSelection: null })}>
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-panel px-3" onClick={(e) => e.stopPropagation()}>
          <Select aria-label="Schaltschrank" value={cab.id} onChange={(e) => useUiStore.getState().set({ cabinetId: e.target.value, cabinetSelection: null })} className="w-56">
            {doc.cabinets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} – {c.description}
              </option>
            ))}
          </Select>
          <span className="text-[11.5px] text-muted">
            {cab.rows} Reihen · {cab.rowCapacityTE} TE je Reihe
          </span>
          <div className="flex-1" />
          <Button size="sm" icon={Plus} onClick={() => addCabinetRow(cab.id)}>
            Tragschiene
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[var(--sheet-desk)] p-8">
          <div className="inline-flex flex-col gap-5 rounded-lg border-2 border-line-strong bg-panel p-6 shadow-sm">
            <div className="flex items-baseline gap-2">
              <h2 className="font-mono text-[13px] font-semibold">{cab.name}</h2>
              <span className="text-[12px] text-muted">{cab.description}</span>
            </div>
            {rows.map((devs, r) => (
              <Rail key={r} cabinetId={cab.id} row={r} devices={devs} capacity={cab.rowCapacityTE} selection={selection} />
            ))}
          </div>
          {doorDevices.length > 0 && (
            <div className="mt-6 inline-flex max-w-full flex-col gap-2 rounded-lg border border-line bg-panel p-4 align-top lg:ml-6 lg:mt-0">
              <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">Tür</h3>
              <div className="flex flex-wrap gap-2">
                {doorDevices.map((d) => (
                  <button key={d.id} type="button" onClick={(e) => { e.stopPropagation(); useUiStore.getState().set({ cabinetSelection: d.id }) }} className={cn('flex size-14 flex-col items-center justify-center rounded-full border text-[10.5px]', selection === d.id ? 'border-accent ring-2 ring-accent-soft' : 'border-line-strong')}>
                    <span className="font-mono font-semibold">{d.bmk}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <aside aria-label="Geräteeigenschaften" className="flex w-72 shrink-0 flex-col border-l border-line bg-panel">
        <PanelHeader title="Gerät" />
        {sel ? (
          <div className="flex flex-col gap-3 p-3 text-[12px]">
            <div>
              <div className="font-mono text-[15px] font-semibold">{sel.bmk}</div>
              <div className="text-muted">{sel.function || sel.category}</div>
            </div>
            <dl className="grid grid-cols-[7rem_1fr] gap-x-2 gap-y-1.5">
              <dt className="text-muted">Artikel</dt>
              <dd className={cn('font-mono', !sel.articleNo && 'text-warn')}>{sel.articleNo || 'nicht zugeordnet'}</dd>
              <dt className="text-muted">Hersteller</dt>
              <dd>{sel.manufacturer || '—'}</dd>
              <dt className="text-muted">Breite</dt>
              <dd className="font-mono">{sel.widthTE} TE</dd>
              <dt className="text-muted">Abmessungen</dt>
              <dd className="font-mono">{sel.dimensions || '—'}</dd>
              <dt className="text-muted">Platzierung</dt>
              <dd>{sel.placement ? `Reihe ${sel.placement.row + 1}, Pos. ${sel.placement.order + 1}` : 'nicht platziert'}</dd>
            </dl>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => useUiStore.getState().openDialog({ type: 'articlePicker', deviceId: sel.id })}>
                Artikel…
              </Button>
              {sel.placement && (
                <Button size="sm" variant="ghost" icon={Undo2} onClick={() => unplaceDevice(sel.id)}>
                  Entfernen
                </Button>
              )}
            </div>
            <p className="text-[11.5px] text-muted text-pretty">Dasselbe Betriebsmittel wie im Stromlaufplan – Änderungen gelten überall.</p>
          </div>
        ) : (
          <Empty icon={LayoutGrid} title="Kein Gerät gewählt">
            Gerät anklicken oder aus der Liste auf eine Tragschiene ziehen.
          </Empty>
        )}
      </aside>
    </div>
  )
}
