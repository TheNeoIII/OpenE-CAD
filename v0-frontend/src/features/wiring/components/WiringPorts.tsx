import type { CadPage } from '@/types/cad'
import { portManagerColor } from '../models/portManager'
import { PORT_LABEL_SIZE, portLabelLayout, portOwnerBounds, portWorldPosition } from '../models/ports'

export interface PortManagerHighlight { objectId: string | null; activePortId: string | null }

export function WiringPorts({ page, s = 1, editing, cursor = 'default', selected, manager }: { page: CadPage; s?: number; editing?: { id: string; portId: string }; cursor?: 'default' | 'move' | 'crosshair'; selected?: { objectId: string | null; portIds: readonly string[] }; manager?: PortManagerHighlight }) {
  if (page.kind !== 'wiring') return null
  return <g>{(page.diagramBlocks ?? []).flatMap((owner) => (owner.ports ?? []).map((port, index) => {
    const point = portWorldPosition(portOwnerBounds(owner), port)
    const l = portLabelLayout(point, port, s)
    const hidden = editing?.id === owner.id && editing.portId === port.id
    const isSelected = selected?.objectId === owner.id && selected.portIds.includes(port.id)
    const managed = manager?.objectId === owner.id
    const managerActive = managed && manager.activePortId === port.id
    const color = managed ? portManagerColor(index) : undefined
    return <g key={port.id} data-id={owner.id} data-port-id={port.id} data-port-selected={isSelected || undefined} data-port-highlight={managerActive || undefined} style={{ cursor }}>
      <circle cx={point.x} cy={point.y} r={10 / s} fill="transparent" />
      {color && <circle cx={point.x} cy={point.y} r={(managerActive ? 12 : 7) / s} fill={color} fillOpacity={managerActive ? 0.28 : 0} stroke={color} strokeWidth={(managerActive ? 3 : 2) / s} pointerEvents="none" />}
      {isSelected && <circle cx={point.x} cy={point.y} r={8 / s} fill="var(--sheet-select)" fillOpacity={0.18} stroke="var(--sheet-select)" strokeWidth={2 / s} pointerEvents="none" />}
      <circle cx={point.x} cy={point.y} r={4 / s} stroke="var(--sheet-ink)" strokeWidth={1.5 / s} fill="var(--sheet-paper, white)" pointerEvents="none" />
      {port.label && !hidden && <text data-edit="portLabel" data-label-side={l.side} x={l.x} y={l.y} fontSize={PORT_LABEL_SIZE} textAnchor={l.anchor} dominantBaseline={l.baseline} fill="var(--sheet-ink)" stroke="var(--sheet-paper, white)" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke fill">{port.label}</text>}
    </g>
  }))}</g>
}
