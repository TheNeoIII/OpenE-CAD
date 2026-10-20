import type { CadPage } from '@/types/cad'
import { PORT_LABEL_SIZE, portLabelLayout, portOwnerBounds, portWorldPosition } from '../models/ports'

export function WiringPorts({ page, s = 1, editing }: { page: CadPage; s?: number; editing?: { id: string; portId: string } }) {
  if (page.kind !== 'wiring') return null
  return <g>{(page.diagramBlocks ?? []).flatMap((owner) => (owner.ports ?? []).map((port) => {
    const point = portWorldPosition(portOwnerBounds(owner), port)
    const l = portLabelLayout(point, port, s)
    const hidden = editing?.id === owner.id && editing.portId === port.id
    return <g key={port.id} data-id={owner.id} data-port-id={port.id} style={{ cursor: 'move' }}>
      <circle cx={point.x} cy={point.y} r={10 / s} fill="transparent" />
      <circle cx={point.x} cy={point.y} r={4 / s} stroke="var(--sheet-ink)" strokeWidth={1.5 / s} fill="var(--sheet-paper, white)" pointerEvents="none" />
      {port.label && !hidden && <text data-edit="portLabel" data-label-side={l.side} x={l.x} y={l.y} fontSize={PORT_LABEL_SIZE} textAnchor={l.anchor} dominantBaseline={l.baseline} fill="var(--sheet-ink)">{port.label}</text>}
    </g>
  }))}</g>
}
