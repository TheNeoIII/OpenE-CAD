import type { SymbolKind, SymbolShape } from '@/types/cad'
import { customSymbolOf, isCustomKind, symbolDef } from '../models/symbolLibrary'

const POLE = 100

function poleXs(poles: number) {
  return Array.from({ length: poles }, (_, i) => (i - (poles - 1) / 2) * POLE)
}

function NoContact({ x, mark }: { x: number; mark?: 'arc' | 'x' }) {
  return (
    <g>
      <path d={`M${x} -100 V-30 M${x} 30 V100 M${x} 30 L${x - 32} -38`} />
      {mark === 'arc' && <path d={`M${x - 12} -30 A12 12 0 0 1 ${x + 12} -30`} />}
      {mark === 'x' && <path d={`M${x - 10} -40 L${x + 10} -20 M${x + 10} -40 L${x - 10} -20`} />}
    </g>
  )
}

/** Renders editor shapes; shared by placed custom symbols and the symbol editor canvas. */
export function ShapeList({ shapes }: { shapes: SymbolShape[] }) {
  return (
    <g>
      {shapes.map((s, i) => {
        if (s.t === 'line') return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeDasharray={s.dashed ? '16 12' : undefined} />
        if (s.t === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.filled ? 'currentColor' : 'none'} />
        if (s.t === 'circle') return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.filled ? 'currentColor' : 'none'} />
        return (
          <text key={i} x={s.x} y={s.y} fontSize={s.size} textAnchor={s.anchor ?? 'start'} fill="currentColor" stroke="none" fontFamily="ui-monospace, monospace">
            {s.text}
          </text>
        )
      })}
    </g>
  )
}

/** Symbol body in local world units (0.1 mm). Stroke/fill inherit from the parent group. */
export function SymbolBody({ kind, poles }: { kind: SymbolKind; poles: 1 | 3 }) {
  if (isCustomKind(kind)) {
    const custom = customSymbolOf(kind)
    return custom ? <ShapeList shapes={custom.shapes} /> : <path d="M-50 -50 H50 V50 H-50 Z M-50 -50 L50 50 M50 -50 L-50 50" strokeDasharray="10 8" />
  }
  switch (kind) {
    case 'contactor':
    case 'breaker': {
      const xs = poleXs(poles)
      return (
        <g>
          {xs.map((x) => (
            <NoContact key={x} x={x} mark={kind === 'contactor' ? 'arc' : 'x'} />
          ))}
          {poles > 1 && <path d={`M${xs[0] - 16} 0 H${xs[xs.length - 1] - 16}`} strokeDasharray="14 10" />}
          {kind === 'breaker' && <path d={`M${xs[0] - 16} 0 H${xs[0] - 60} M${xs[0] - 60} -14 V14`} strokeDasharray={poles > 1 ? undefined : undefined} />}
        </g>
      )
    }
    case 'breakerN': {
      const xs = poleXs(poles + 1)
      return (
        <g>
          {xs.map((x, i) => (
            <NoContact key={x} x={x} mark={i < poles ? 'x' : undefined} />
          ))}
          <path d={`M${xs[0] - 16} 0 H${xs[xs.length - 1] - 16}`} strokeDasharray="14 10" />
          <path d={`M${xs[0] - 16} 0 H${xs[0] - 60} M${xs[0] - 60} -14 V14`} />
        </g>
      )
    }
    case 'rcd': {
      const xs = poleXs(poles + 1)
      const left = xs[0]
      const right = xs[xs.length - 1]
      const box = left - 150
      return (
        <g>
          {xs.map((x) => (
            <NoContact key={x} x={x} />
          ))}
          <path d={`M${left - 16} 0 H${right - 16}`} strokeDasharray="14 10" />
          <path d={`M${left - 16} 0 H${box + 80}`} strokeDasharray="14 10" />
          <rect x={box} y={-26} width={80} height={52} fill="none" />
          <text x={box + 40} y={11} textAnchor="middle" fontSize={30} fontWeight={600} stroke="none" fill="currentColor">
            IΔ
          </text>
          <path d={`M${box + 20} -26 V-56 H${box + 60} M${box + 20} -56 V-70`} />
          <path d={`M${box + 40} 26 V66 H${left - 30}`} strokeDasharray="14 10" />
          <rect x={left - 30} y={56} width={right - left + 60} height={20} rx={10} fill="currentColor" stroke="none" />
        </g>
      )
    }
    case 'coil':
      return (
        <g>
          <path d="M0 -100 V-40 M0 40 V100" />
          <rect x={-35} y={-40} width={70} height={80} fill="none" />
        </g>
      )
    case 'contactNO':
      return <NoContact x={0} />
    case 'contactNC':
      return (
        <g>
          <path d="M0 -100 V-30 M0 30 V100 M0 30 L28 -40 M0 -30 H34" />
        </g>
      )
    case 'terminal':
      return (
        <g>
          <path d="M0 -50 V-14 M0 14 V50" />
          <circle r={14} fill="none" />
        </g>
      )
    case 'motor':
      return (
        <g>
          <path d="M-100 -150 V-30 M0 -150 V-60 M100 -150 V-30 M200 -150 V20 H80" />
          <circle cx={0} cy={20} r={85} fill="none" />
          <text x={0} y={14} textAnchor="middle" fontSize={52} fontWeight={600} stroke="none" fill="currentColor">
            M
          </text>
          <text x={0} y={66} textAnchor="middle" fontSize={34} stroke="none" fill="currentColor">
            3~
          </text>
        </g>
      )
    case 'lamp':
      return (
        <g>
          <path d="M0 -100 V-36 M0 36 V100" />
          <circle r={36} fill="none" />
          <path d="M-25 -25 L25 25 M25 -25 L-25 25" />
        </g>
      )
    case 'pushbutton':
      return (
        <g>
          <NoContact x={0} />
          <path d="M-16 0 H-90" strokeDasharray="12 8" />
          <path d="M-90 -26 V26 M-90 -26 H-110 M-90 26 H-110" />
        </g>
      )
    case 'outlet': {
      const xs = poleXs(poles)
      const half = ((poles - 1) * POLE) / 2 + 40
      return (
        <g>
          {xs.map((x) => (
            <path key={x} d={`M${x} -100 V0`} />
          ))}
          <path d={`M${-half} 0 H${half} M${-half} 0 L0 60 L${half} 0 M${-half * 0.6} 18 L0 42 L${half * 0.6} 18`} />
        </g>
      )
    }
  }
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
