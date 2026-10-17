import type { WirePreset } from '@/types/cad'
import { LINE_DASH, WEIGHT_FACTOR, WIRE_STROKE } from '../models/wireStyles'

export function WireSwatch({ preset, className }: { preset: Pick<WirePreset, 'color' | 'lineStyle' | 'weight'>; className?: string }) {
  const dash = LINE_DASH[preset.lineStyle]
  return (
    <svg viewBox="0 0 48 8" className={className ?? 'h-2 w-10 shrink-0'} aria-hidden>
      <line
        x1="1"
        y1="4"
        x2="47"
        y2="4"
        stroke={preset.color === 'auto' ? 'var(--w-main)' : WIRE_STROKE[preset.color]}
        strokeWidth={2.2 * WEIGHT_FACTOR[preset.weight]}
        strokeDasharray={dash ? dash.split(' ').map((n) => Number(n) / 4).join(' ') : undefined}
        strokeLinecap="butt"
      />
    </svg>
  )
}
