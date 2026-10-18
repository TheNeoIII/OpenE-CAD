import type { SymbolKind, SymbolShape } from '@/types/cad'
import { customSymbolOf, isCustomKind, symbolDef, symbolShapes } from '../models/symbolLibrary'

/** Renders editor shapes; shared by placed symbols and the symbol editor canvas. */
export function ShapeList({ shapes, hitArea = false }: { shapes: SymbolShape[]; hitArea?: boolean }) {
  return (
    <g>
      {shapes.map((s, i) => {
        const style = { stroke: hitArea ? 'transparent' : s.color, strokeWidth: hitArea ? 24 : s.strokeWidth }
        if (s.t === 'line') return <line key={i} {...style} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeDasharray={s.dashed ? s.dash ?? '16 12' : undefined} />
        if (s.t === 'path') return <path key={i} {...style} d={s.d} transform={`translate(${s.x} ${s.y})`} fill={s.fillColor ? (hitArea ? 'transparent' : s.fillColor) : undefined} />
        if (s.t === 'rect') return <rect key={i} {...style} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} stroke={hitArea ? 'transparent' : s.noStroke ? 'none' : s.color} fill={hitArea ? 'transparent' : s.filled ? s.fillColor ?? 'currentColor' : 'none'} />
        if (s.t === 'circle') return <circle key={i} {...style} cx={s.cx} cy={s.cy} r={s.r} fill={hitArea ? 'transparent' : s.filled ? s.fillColor ?? 'currentColor' : 'none'} />
        return (
          <text key={i} {...style} x={s.x} y={s.y} fontSize={s.size} fontWeight={s.weight} textAnchor={s.anchor ?? 'start'} fill={hitArea ? 'transparent' : s.color ?? 'currentColor'} stroke="none" fontFamily={s.font === 'inherit' ? undefined : 'ui-monospace, monospace'}>
            {s.text}
          </text>
        )
      })}
    </g>
  )
}

/** Symbol body in local world units (0.1 mm). Stroke/fill inherit from the parent group. */
export function SymbolBody({ kind, poles, ways }: { kind: SymbolKind; poles: 1 | 3; ways?: number }) {
  if (isCustomKind(kind) && !customSymbolOf(kind)) return <path d="M-50 -50 H50 V50 H-50 Z M-50 -50 L50 50 M50 -50 L-50 50" strokeDasharray="10 8" />
  return <ShapeList shapes={symbolShapes(kind, poles, ways)} />
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
