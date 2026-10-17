import type { SymbolKind, SymbolShape } from '@/types/cad'
import { customSymbolOf, isCustomKind, symbolDef, symbolShapes } from '../models/symbolLibrary'

/** Renders editor shapes; shared by placed symbols and the symbol editor canvas. */
export function ShapeList({ shapes }: { shapes: SymbolShape[] }) {
  return (
    <g>
      {shapes.map((s, i) => {
        if (s.t === 'line') return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeDasharray={s.dashed ? s.dash ?? '16 12' : undefined} />
        if (s.t === 'path') return <path key={i} d={s.d} transform={`translate(${s.x} ${s.y})`} />
        if (s.t === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} stroke={s.noStroke ? 'none' : undefined} fill={s.filled ? 'currentColor' : 'none'} />
        if (s.t === 'circle') return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.filled ? 'currentColor' : 'none'} />
        return (
          <text key={i} x={s.x} y={s.y} fontSize={s.size} fontWeight={s.weight} textAnchor={s.anchor ?? 'start'} fill="currentColor" stroke="none" fontFamily={s.font === 'inherit' ? undefined : 'ui-monospace, monospace'}>
            {s.text}
          </text>
        )
      })}
    </g>
  )
}

/** Symbol body in local world units (0.1 mm). Stroke/fill inherit from the parent group. */
export function SymbolBody({ kind, poles }: { kind: SymbolKind; poles: 1 | 3 }) {
  if (isCustomKind(kind) && !customSymbolOf(kind)) return <path d="M-50 -50 H50 V50 H-50 Z M-50 -50 L50 50 M50 -50 L-50 50" strokeDasharray="10 8" />
  return <ShapeList shapes={symbolShapes(kind, poles)} />
}

export function SymbolGlyph({ kind, poles, className }: { kind: SymbolKind; poles: 1 | 3; className?: string }) {
  const b = symbolDef(kind).bbox({ poles })
  const pad = 30
  return (
    <svg viewBox={`${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`} className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        <SymbolBody kind={kind} poles={poles} />
      </g>
    </svg>
  )
}
