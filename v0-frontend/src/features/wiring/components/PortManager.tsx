import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { GripHorizontal, Trash2, X } from 'lucide-react'
import { IconButton, Input, Select } from '@/components/ui/primitives'
import { useActivePage } from '@/stores/documentStore'
import type { CadDiagramBlock, CadPort, CadPortDirection, CadPortEdge, CadPortLabelPlacement } from '@/types/cad'
import { deletePort, updatePort } from '../actions'
import { portManagerColor, usePortManagerStore } from '../models/portManager'

const PANEL_WIDTH = 760

function CommitCell({ label, value, onCommit, className }: { label: string; value: string; onCommit: (value: string) => void; className?: string }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return <Input aria-label={label} className={className} value={draft} onChange={(e) => setDraft(e.target.value)}
    onBlur={() => { if (draft !== value) onCommit(draft) }}
    onKeyDown={(e) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      if (e.key === 'Enter') e.currentTarget.blur()
      if (e.key === 'Escape') { setDraft(value); e.stopPropagation() }
    }} />
}

function PortRow({ block, port, index }: { block: CadDiagramBlock; port: CadPort; index: number }) {
  const { hoverPortId, focusPortId, setHover } = usePortManagerStore()
  const active = hoverPortId === port.id || focusPortId === port.id
  const color = portManagerColor(index)
  const name = port.label || `Port ${index + 1}`
  return <tr data-port-row={port.id} aria-selected={focusPortId === port.id} className={active ? 'bg-hover' : undefined}
    onPointerEnter={() => setHover(port.id)} onPointerLeave={() => setHover(null)}>
    <td className="px-2 py-1"><span aria-hidden className="block size-3 rounded-full ring-2 ring-offset-1 ring-offset-panel" style={{ background: color, ['--tw-ring-color' as string]: active ? color : 'transparent' }} /></td>
    <td className="px-1 py-1"><CommitCell label={`${name} Label`} value={port.label ?? ''} onCommit={(label) => updatePort(block.id, port.id, { label })} /></td>
    <td className="px-1 py-1"><CommitCell label={`${name} Typ`} value={port.portType ?? 'generic'} onCommit={(portType) => { if (portType.trim()) updatePort(block.id, port.id, { portType: portType.trim() }) }} /></td>
    <td className="px-1 py-1"><Select aria-label={`${name} Richtung`} value={port.direction ?? 'bidirectional'} onChange={(e) => updatePort(block.id, port.id, { direction: e.target.value as CadPortDirection })}>
      <option value="input">Eingang</option><option value="output">Ausgang</option><option value="bidirectional">Bidirektional</option><option value="passive">Passiv</option>
    </Select></td>
    <td className="px-1 py-1"><Select aria-label={`${name} Kante`} value={port.edge} onChange={(e) => updatePort(block.id, port.id, { edge: e.target.value as CadPortEdge })}>
      <option value="top">Oben</option><option value="right">Rechts</option><option value="bottom">Unten</option><option value="left">Links</option>
    </Select></td>
    <td className="px-1 py-1"><CommitCell label={`${name} Position (%)`} className="font-mono" value={String(Math.round(port.t * 10000) / 100)} onCommit={(value) => {
      const t = Number(value.replace(',', '.')) / 100
      if (Number.isFinite(t)) updatePort(block.id, port.id, { t: Math.min(1, Math.max(0, t)) })
    }} /></td>
    <td className="px-1 py-1"><Select aria-label={`${name} Labelposition`} value={port.labelPlacement ?? 'auto'} onChange={(e) => updatePort(block.id, port.id, { labelPlacement: e.target.value as CadPortLabelPlacement })}>
      <option value="auto">Automatisch (außen)</option><option value="left">Links</option><option value="right">Rechts</option><option value="top">Oben</option><option value="bottom">Unten</option>
    </Select></td>
    <td className="px-1 py-1"><IconButton icon={Trash2} size="sm" label={`${name} löschen`} onClick={() => deletePort(block.id, port.id)} /></td>
  </tr>
}

/** Non-modal, draggable port table for one diagram block. */
export function PortManager() {
  const page = useActivePage()
  const { objectId, close, setFocus, setHover } = usePortManagerStore()
  const block = objectId ? (page?.diagramBlocks ?? []).find((b) => b.id === objectId) : undefined
  const [pos, setPos] = useState(() => ({ x: Math.max(16, window.innerWidth - PANEL_WIDTH - 320), y: 96 }))
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null)

  useEffect(() => { if (objectId && !block) close() }, [objectId, block, close])
  useEffect(() => () => usePortManagerStore.getState().close(), [page?.id])

  if (!block) return null
  const ports = block.ports ?? []

  const onHeaderDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    drag.current = { id: e.pointerId, dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onHeaderMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    setPos({ x: Math.min(window.innerWidth - 120, Math.max(0, e.clientX - d.dx)), y: Math.min(window.innerHeight - 40, Math.max(0, e.clientY - d.dy)) })
  }
  const onHeaderUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return createPortal(
    <section role="dialog" aria-modal="false" aria-label={`Ports von ${block.title || 'Baustein'}`}
      className="fixed z-[90] flex max-h-[70vh] flex-col overflow-hidden rounded-lg border border-line bg-panel text-fg shadow-2xl shadow-black/50"
      style={{ left: pos.x, top: pos.y, width: `min(${PANEL_WIDTH}px, calc(100vw - 32px))` }}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) close() }}
      onFocusCapture={(e) => setFocus((e.target as HTMLElement).closest('tr')?.getAttribute('data-port-row') ?? null)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(null) }}
      onPointerLeave={() => setHover(null)}>
      <div className="flex cursor-move touch-none items-center gap-2 border-b border-line bg-panel-2 px-3 py-2 select-none"
        onPointerDown={onHeaderDown} onPointerMove={onHeaderMove} onPointerUp={onHeaderUp} onPointerCancel={onHeaderUp}>
        <GripHorizontal aria-hidden className="size-4 text-muted" />
        <h2 className="min-w-0 flex-1 truncate text-[12px] font-semibold">{`Ports – ${block.title || 'Baustein'}`}<span className="ml-2 font-normal text-muted">{`${ports.length}`}</span></h2>
        <IconButton icon={X} size="sm" label="Port-Manager schließen" onClick={close} />
      </div>
      {ports.length === 0
        ? <p className="p-4 text-[12px] text-muted">Dieser Baustein hat noch keine Ports. Mit dem Port-Werkzeug an eine Kante klicken.</p>
        : <div className="min-h-0 overflow-auto">
          <table className="w-full border-collapse text-left text-[11.5px]">
            <thead className="sticky top-0 bg-panel text-muted">
              <tr>
                <th scope="col" className="w-8 px-2 py-1.5 font-medium"><span className="sr-only">Farbe</span></th>
                <th scope="col" className="px-1 py-1.5 font-medium">Label</th>
                <th scope="col" className="w-24 px-1 py-1.5 font-medium">Typ</th>
                <th scope="col" className="w-28 px-1 py-1.5 font-medium">Richtung</th>
                <th scope="col" className="w-24 px-1 py-1.5 font-medium">Kante</th>
                <th scope="col" className="w-20 px-1 py-1.5 font-medium">Position %</th>
                <th scope="col" className="w-36 px-1 py-1.5 font-medium">Labelposition</th>
                <th scope="col" className="w-8 px-1 py-1.5"><span className="sr-only">Löschen</span></th>
              </tr>
            </thead>
            <tbody>{ports.map((port, i) => <PortRow key={port.id} block={block} port={port} index={i} />)}</tbody>
          </table>
        </div>}
      <p className="border-t border-line px-3 py-1.5 text-[11px] text-muted">Farben dienen nur der Zuordnung am Canvas und werden nicht gespeichert.</p>
    </section>,
    document.body,
  )
}
