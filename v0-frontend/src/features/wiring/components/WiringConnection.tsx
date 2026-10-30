import type { CadConnection, CadPage } from '@/types/cad'
import { polylinePath } from '@/features/drawing/geometry'
import { LINE_DASH } from '@/features/drawing/styles'
import { connectionLabelPoint, resolveConnectionEndpoint, resolveConnectionPolyline } from '../models/connections'

export function WiringConnection({ page, connection, s = 1, selected = false, editing = false }: { page: CadPage; connection: CadConnection; s?: number; selected?: boolean; editing?: boolean }) {
  const points = resolveConnectionPolyline(page, connection)
  const unresolved = !resolveConnectionEndpoint(page, connection.start) || !resolveConnectionEndpoint(page, connection.end)
  const label = connectionLabelPoint(page, connection)
  const color = selected ? 'var(--sheet-select)' : unresolved ? '#b45309' : connection.stroke ?? 'var(--sheet-ink)'
  return <g data-id={connection.id} data-connection="true">
    <title>{unresolved ? 'Verbindung: Port nicht auflösbar' : connection.label || 'Verbindung'}</title>
    {points.length > 1 && <>
      <path d={polylinePath(points)} fill="none" stroke="transparent" strokeWidth={Math.max(16 / s, connection.strokeWidth ?? 3)} />
      <path d={polylinePath(points)} fill="none" stroke={color} strokeWidth={(connection.strokeWidth ?? 3) * (selected ? 1.5 : 1)} strokeDasharray={unresolved ? '12 8' : LINE_DASH[connection.style]} strokeLinejoin="round" />
    </>}
    {unresolved && <text x={points[0]?.x ?? 40} y={(points[0]?.y ?? 100) - 18} fontSize={24} fill={color}>Port nicht auflösbar: {connection.label || connection.id}</text>}
    {connection.label && label && !editing && <text data-edit="label" x={label.x} y={label.y} fontSize={24} textAnchor="middle" dominantBaseline="middle" fill={color} stroke="var(--sheet-paper, white)" strokeWidth={5 / s} paintOrder="stroke">{connection.label.split('\n').map((line, i) => <tspan key={i} x={label.x} dy={i === 0 ? 0 : 24 * 1.35}>{line || ' '}</tspan>)}</text>}
  </g>
}

export function ConnectionHandles({ page, connection, s }: { page: CadPage; connection: CadConnection; s: number }) {
  const points = resolveConnectionPolyline(page, connection)
  return <g data-id={connection.id} aria-label="Verbindungsbearbeitung">
    {points.slice(0, -1).map((a, index) => {
      const b = points[index + 1]
      if (a.x === b.x && a.y === b.y) return null
      return <g key={index} data-connection-segment={index} style={{ cursor: a.x === b.x ? 'ew-resize' : 'ns-resize' }}>
        <path d={polylinePath([a, b])} stroke="transparent" strokeWidth={12 / s} />
        <rect x={(a.x + b.x) / 2 - 3 / s} y={(a.y + b.y) / 2 - 3 / s} width={6 / s} height={6 / s} fill="var(--sheet-paper, white)" stroke="var(--sheet-select)" strokeWidth={1 / s} />
      </g>
    })}
    {(['start', 'end'] as const).map((end) => {
      const p = resolveConnectionEndpoint(page, connection[end])
      return p && <circle key={end} data-connection-end={end} cx={p.x} cy={p.y} r={6 / s} fill="var(--sheet-paper, white)" stroke="var(--sheet-select)" strokeWidth={2 / s} style={{ cursor: 'move' }} />
    })}
  </g>
}
