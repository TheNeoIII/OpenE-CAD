import type { CadDocument, CadPage } from '@/types/cad'
import { symbolDef } from '../models/symbolLibrary'
import { deviceContacts, formatRef } from '../models/xref'

const ROW = 30

/** ELCAD contact mirror below a coil/timer: every linked contact with its terminal numbers and sheet reference. */
export function ContactMirror({ doc, page, deviceId, symbolId, x, y }: { doc: CadDocument; page: CadPage; deviceId: string; symbolId: string; x: number; y: number }) {
  type Row = { kind: 'contactNO' | 'contactNC' | 'contactCO'; a: string; b: string; c: string; ref: string }
  const contacts = deviceContacts(doc, deviceId, symbolId).flatMap(({ symbol, page: p }): Row[] => {
    const pins = symbolDef(symbol.kind).pins(symbol).map((pin) => pin.id)
    const ref = formatRef(doc, p, symbol.position, page)
    if (symbol.kind === 'contactor') {
      return Array.from({ length: pins.length / 2 }, (_, i) => ({ kind: 'contactNO' as const, a: pins[i * 2], b: pins[i * 2 + 1], c: '', ref }))
    }
    if (symbol.kind === 'contactCO') return [{ kind: 'contactCO' as const, a: pins[0], b: pins[1], c: pins[2], ref }]
    return [{ kind: symbol.kind as 'contactNO' | 'contactNC', a: pins[0], b: pins[1], c: '', ref }]
  })
  if (!contacts.length) return null
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" fontFamily="var(--font-mono)" fontSize={17} fill="var(--sheet-ink-2)">
      {contacts.map((c, i) => {
        const cy = i * ROW + ROW
        return (
          <g key={i} transform={`translate(0 ${cy})`}>
            <text x={-58} y={5} textAnchor="end">{c.ref}</text>
            <text x={-40} y={-4} textAnchor="end">{c.kind === 'contactCO' ? c.b : c.a}</text>
            <g stroke="var(--sheet-ink-2)" strokeWidth={2} fill="none" strokeLinecap="round">
              {c.kind === 'contactNO' && <path d="M-34 0 H-14 L12 -12 M14 0 H34" />}
              {c.kind === 'contactNC' && <path d="M-34 0 H-14 L16 6 M12 0 V8 M12 0 H34" />}
              {c.kind === 'contactCO' && <path d="M-34 -8 H6 M-34 8 H-14 L14 -6 M14 8 H34" />}
            </g>
            <text x={40} y={-4}>{c.kind === 'contactCO' ? `${c.c} ${c.a}` : c.b}</text>
          </g>
        )
      })}
    </g>
  )
}
