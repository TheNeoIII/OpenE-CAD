import type { CadPage, CadSymbol } from '@/types/cad'
import { symbolBounds } from './geometry'

export function symbolLabelPosition(symbol: CadSymbol) {
  const b = symbolBounds(symbol)
  const right = symbol.labelSide === 'right'
  const fallback = { x: (right ? b.x + b.w + 22 : b.x - 22) - symbol.position.x, y: 0 }
  const offset = symbol.labelSide === 'custom' ? symbol.labelOffset ?? fallback : fallback
  return { x: symbol.position.x + offset.x, y: symbol.position.y + offset.y, top: b.y + offset.y, anchor: symbol.labelSide === 'custom' ? symbol.labelAnchor ?? 'end' : right ? 'start' as const : 'end' as const }
}

const MAX_GAP = 200

/**
 * Adjacent terminals of the same strip in one row share a single device label.
 * Returns the ids of terminals that should show only their terminal number;
 * the rightmost terminal of each row carries the full BMK + function text.
 */
export function terminalLabelGroups(page: CadPage): { numberOnly: Set<string>; grouped: Set<string> } {
  const numberOnly = new Set<string>()
  const grouped = new Set<string>()
  const rows = new Map<string, CadPage['symbols']>()
  for (const s of page.symbols) {
    if (s.kind !== 'terminal' || !s.deviceId || s.labelSide === 'custom' || s.labelRotation === 90 || (s.rotation !== 0 && s.rotation !== 180)) continue
    const key = `${s.deviceId}@${s.position.y}@${s.labelSide ?? 'left'}`
    rows.set(key, [...(rows.get(key) ?? []), s])
  }
  for (const row of rows.values()) {
    const sorted = [...row].sort((a, b) => a.position.x - b.position.x)
    const left = (sorted[0].labelSide ?? 'left') === 'left'
    let run: typeof sorted = [sorted[0]]
    const flush = () => {
      if (run.length > 1) {
        const head = left ? run[0] : run[run.length - 1]
        for (const t of run) { grouped.add(t.id); if (t !== head) numberOnly.add(t.id) }
      }
    }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].position.x - sorted[i - 1].position.x <= MAX_GAP) run.push(sorted[i])
      else { flush(); run = [sorted[i]] }
    }
    flush()
  }
  return { numberOnly, grouped }
}
