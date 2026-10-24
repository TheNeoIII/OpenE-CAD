import type { Point } from '@/types/cad'

/** Snap-type specific cursor marker. `unit` = world units per screen pixel (clamped). */
export function SnapIndicator({ snap, unit }: { snap: { point: Point; kind: string }; unit: number }) {
  const { x, y } = snap.point
  const r = 9 * unit
  const sw = 2 * unit
  const common = { fill: 'none', strokeWidth: sw, pointerEvents: 'none' as const }
  switch (snap.kind) {
    case 'pin':
      return <circle cx={x} cy={y} r={r * 1.5} stroke="var(--ok)" {...common} />
    case 'port':
      return (
        <g pointerEvents="none">
          <circle cx={x} cy={y} r={r * 1.3} stroke="var(--ok)" fill="none" strokeWidth={sw} />
          <path d={`M${x - r * 1.8} ${y} H${x + r * 1.8} M${x} ${y - r * 1.8} V${y + r * 1.8}`} stroke="var(--ok)" strokeWidth={sw * 0.75} />
        </g>
      )
    case 'endpoint':
      return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} stroke="var(--ok)" {...common} />
    case 'junction':
      return (
        <g pointerEvents="none">
          <circle cx={x} cy={y} r={r * 1.4} stroke="var(--ok)" fill="none" strokeWidth={sw} />
          <circle cx={x} cy={y} r={r * 0.5} fill="var(--ok)" />
        </g>
      )
    case 'segment':
      return <path d={`M${x - r * 1.3} ${y} H${x + r * 1.3} M${x} ${y} V${y + r * 1.3}`} stroke="var(--accent)" {...common} strokeWidth={sw * 1.3} />
    case 'grid':
      return <path d={`M${x - r * 0.7} ${y} H${x + r * 0.7} M${x} ${y - r * 0.7} V${y + r * 0.7}`} stroke="var(--sheet-select)" {...common} />
    default:
      return <circle cx={x} cy={y} r={r * 0.4} fill="var(--warn)" pointerEvents="none" />
  }
}
