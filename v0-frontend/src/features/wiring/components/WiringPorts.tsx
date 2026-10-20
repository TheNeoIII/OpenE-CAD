import type { CadPage } from '@/types/cad'
import { portOwnerBounds, portWorldPosition } from '../models/ports'

export function WiringPorts({ page, s = 1 }: { page: CadPage; s?: number }) {
  if (page.kind !== 'wiring') return null
  return <g>{(page.diagramBlocks ?? []).flatMap((owner) => (owner.ports ?? []).map((port) => {
    const point = portWorldPosition(portOwnerBounds(owner), port)
    const left = port.edge === 'left'
    const right = port.edge === 'right'
    const top = port.edge === 'top'
    return <g key={port.id} data-id={owner.id} data-port-id={port.id} style={{ cursor: 'move' }}>
      <circle cx={point.x} cy={point.y} r={10 / s} fill="transparent" />
      <circle cx={point.x} cy={point.y} r={4 / s} stroke="var(--sheet-ink)" strokeWidth={1.5 / s} fill="var(--sheet-paper, white)" pointerEvents="none" />
      {port.label && <text x={point.x + (left ? -10 : right ? 10 : 0) / s} y={point.y + (top ? -10 / s : left || right ? 0 : 10 / s + 24)} fontSize={24} textAnchor={left ? 'end' : right ? 'start' : 'middle'} dominantBaseline={left || right ? 'middle' : undefined} fill="var(--sheet-ink)" pointerEvents="none">{port.label}</text>}
    </g>
  }))}</g>
}
