import type { SymbolKind, SymbolShape } from '@/types/cad'
import { customSymbolOf, isCustomKind, symbolDef, symbolShapes } from '../models/symbolLibrary'
import { arrowHead, shapeRotationPivot } from '../models/shapeTransform'

/** Renders editor shapes; shared by placed symbols and the symbol editor canvas. */
export function ShapeList({ shapes, hitArea = false, hitWidth = 24, strokeScale = 1 }: { shapes: SymbolShape[]; hitArea?: boolean; hitWidth?: number; strokeScale?: number }) {
  return (
    <g>
      {shapes.map((s, i) => {
        const style = { stroke: hitArea ? 'transparent' : s.color, strokeWidth: hitArea ? Math.max(hitWidth, s.strokeWidth ?? 7) : s.strokeWidth != null ? s.strokeWidth * strokeScale : undefined }
        // Unfilled outlines must only be hit on their stroke, otherwise they swallow clicks on shapes inside them.
        const areaFill = (filled: boolean) => (hitArea ? (filled ? 'transparent' : 'none') : undefined)
        if (s.t === 'line') {
          if (!s.arrow) return <line key={i} {...style} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeDasharray={s.dashed ? s.dash ?? '16 12' : undefined} />
          const a = { x: s.x1, y: s.y1 }
          const b = { x: s.x2, y: s.y2 }
          const sw = s.strokeWidth ?? 7
          const endHead = s.arrow !== 'start' ? arrowHead(a, b, sw) : null
          const startHead = s.arrow !== 'end' ? arrowHead(b, a, sw) : null
          const p1 = startHead?.base ?? a
          const p2 = endHead?.base ?? b
          const headFill = hitArea ? 'transparent' : s.color ?? 'currentColor'
          return (
            <g key={i}>
              <line {...style} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} strokeDasharray={s.dashed ? s.dash ?? '16 12' : undefined} />
              {endHead && <polygon points={endHead.points} fill={headFill} stroke={hitArea ? 'transparent' : 'none'} />}
              {startHead && <polygon points={startHead.points} fill={headFill} stroke={hitArea ? 'transparent' : 'none'} />}
            </g>
          )
        }
        const rot = s.rot ? ` rotate(${s.rot} ${shapeRotationPivot(s).x} ${shapeRotationPivot(s).y})` : ''
        if (s.t === 'path') {
          const local = s.rot ? ` rotate(${s.rot} ${s.w / 2} ${s.h / 2})` : ''
          const scale = s.sx || s.sy ? ` scale(${s.sx ?? 1} ${s.sy ?? 1})` : ''
          // Compensate the path's own scale so its stroke stays in world units (non-scaling-stroke would pin it to screen pixels).
          const k = Math.sqrt(Math.abs((s.sx ?? 1) * (s.sy ?? 1))) || 1
          const pathStroke = style.strokeWidth != null ? style.strokeWidth / k : 7 / k
          return <path key={i} {...style} strokeWidth={pathStroke} d={s.d} transform={`translate(${s.x} ${s.y})${local}${scale}`} fill={hitArea ? areaFill(!!s.fillColor) : s.fillColor ?? undefined} />
        }
        if (s.t === 'rect') return <rect key={i} {...style} transform={rot || undefined} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} stroke={hitArea ? 'transparent' : s.noStroke ? 'none' : s.color} fill={hitArea ? areaFill(!!s.filled) : s.filled ? s.fillColor ?? 'currentColor' : 'none'} />
        if (s.t === 'circle') return <circle key={i} {...style} cx={s.cx} cy={s.cy} r={s.r} fill={hitArea ? areaFill(!!s.filled) : s.filled ? s.fillColor ?? 'currentColor' : 'none'} />
        return (
          <text key={i} {...style} transform={rot || undefined} x={s.x} y={s.y} fontSize={s.size} fontWeight={s.weight} textAnchor={s.anchor ?? 'start'} fill={hitArea ? 'transparent' : s.color ?? 'currentColor'} stroke={hitArea ? 'transparent' : 'none'} fontFamily={s.font === 'inherit' ? undefined : 'ui-monospace, monospace'}>
            {s.text}
          </text>
        )
      })}
    </g>
  )
}

/** Symbol body in local world units (0.1 mm). Stroke/fill inherit from the parent group. */
export function SymbolBody({ kind, poles, ways, strokeScale = 1 }: { kind: SymbolKind; poles: 1 | 3; ways?: number; strokeScale?: number }) {
  if (isCustomKind(kind) && !customSymbolOf(kind)) return <path d="M-50 -50 H50 V50 H-50 Z M-50 -50 L50 50 M50 -50 L-50 50" strokeDasharray="10 8" />
  return <ShapeList shapes={symbolShapes(kind, poles, ways)} strokeScale={strokeScale} />
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
