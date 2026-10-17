import type { SymbolKind } from '@/types/cad'
import type { Device } from '@/types/device'

export const CHARACTERISTICS = ['B', 'C', 'D', 'K', 'Z'] as const

export type ExecutionKind = 'breaker' | 'rcd' | 'coil' | 'motor' | null

export function executionKind(kind: SymbolKind): ExecutionKind {
  if (kind === 'breaker' || kind === 'breakerN') return 'breaker'
  if (kind === 'rcd') return 'rcd'
  if (kind === 'contactor' || kind === 'coil') return 'coil'
  if (kind === 'motor') return 'motor'
  return null
}

const decimal = (n: number) => String(n).replace('.', ',')

/** Composes the execution designation shown with the symbol, e.g. "B13A" or "FI 4/40A/0,03". */
export function executionType(dev: Device | undefined, kind: SymbolKind, poles: number): string {
  if (!dev) return ''
  const current = dev.nominalCurrent ?? dev.ratedCurrent
  switch (executionKind(kind)) {
    case 'breaker':
      return dev.characteristic && current != null ? `${dev.characteristic}${decimal(current)}A` : ''
    case 'rcd': {
      if (current == null) return ''
      const residual = dev.residualCurrent != null ? `/${decimal(dev.residualCurrent / 1000)}` : ''
      return `FI ${poles + 1}/${decimal(current)}A${residual}`
    }
    case 'coil':
      return dev.coilVoltage
    case 'motor':
      return dev.ac3Power != null ? `${decimal(dev.ac3Power)} kW` : ''
    default:
      return ''
  }
}
