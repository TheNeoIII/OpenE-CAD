import type { SymbolKind } from '@/types/cad'
import type { Device } from '@/types/device'

export const CHARACTERISTICS = ['B', 'C', 'D', 'K', 'Z'] as const
export const FUSE_CLASSES = ['gG', 'aM', 'gR'] as const
export const RCD_TYPES = ['', 'A', 'F', 'B', 'G', 'XG', 'S'] as const

export type ExecutionKind = 'breaker' | 'rcd' | 'rcbo' | 'fuse' | 'coil' | 'motor' | 'terminal' | null

export function executionKind(kind: SymbolKind): ExecutionKind {
  if (kind === 'breaker' || kind === 'breakerN') return 'breaker'
  if (kind === 'rcd') return 'rcd'
  if (kind === 'rcbo') return 'rcbo'
  if (kind === 'fuseD02' || kind === 'fuseD02N') return 'fuse'
  if (kind === 'contactor' || kind === 'coil') return 'coil'
  if (kind === 'motor') return 'motor'
  if (kind === 'terminal') return 'terminal'
  return null
}

const decimal = (n: number) => String(n).replace('.', ',')

/** Cross section of a terminal: manual value or derived from the article type, e.g. "WDU 2,5" → "2,5mm²". */
export function terminalCrossSection(dev: Device | undefined): string {
  if (!dev) return ''
  const manual = dev.crossSection?.trim()
  if (manual) return /mm/.test(manual) ? manual : `${manual}mm²`
  const m = dev.articleId ? /(\d+(?:[.,]\d+)?)\s*(?:mm²|mm2)?\s*$/i.exec(dev.type || dev.articleNo) : null
  return m ? `${m[1].replace('.', ',')}mm²` : ''
}

/** Composes the execution designation shown with the symbol; lines are separated by "\n", e.g. "LSS\nC13A/10kA". */
export function executionType(dev: Device | undefined, kind: SymbolKind, poles: number): string {
  if (!dev) return ''
  const current = dev.nominalCurrent ?? dev.ratedCurrent
  const kA = dev.breakingCapacity != null ? `${decimal(dev.breakingCapacity)}kA` : ''
  const residual = dev.residualCurrent != null ? `${decimal(dev.residualCurrent / 1000)}${dev.rcdType ? `-${dev.rcdType}` : ''}` : ''
  switch (executionKind(kind)) {
    case 'breaker': {
      if (!dev.characteristic || current == null) return ''
      return `LSS\n${dev.characteristic}${decimal(current)}A${kA ? `/${kA}` : ''}`
    }
    case 'rcd':
      if (current == null) return ''
      return `FI\n${poles + 1}/${decimal(current)}A${residual ? `/${residual}` : ''}`
    case 'rcbo': {
      if (current == null) return ''
      const rating = `${dev.characteristic ?? ''}${decimal(current)}A${residual ? `/${residual}` : ''}`
      return ['FI-LS', rating, kA].filter(Boolean).join('\n')
    }
    case 'fuse':
      return current != null ? `${decimal(current)}A ${dev.characteristic || 'gG'}\nD02` : 'D02'
    case 'coil':
      return dev.coilVoltage
    case 'motor':
      return dev.ac3Power != null ? `${decimal(dev.ac3Power)} kW` : ''
    case 'terminal':
      return terminalCrossSection(dev)
    default:
      return ''
  }
}

/** Manufacturer / article lines printed below the label once an article is assigned. */
export function makerLines(dev: Device | undefined, kind: SymbolKind): string[] {
  if (!dev?.articleId) return []
  if (kind === 'terminal') return [dev.type, dev.manufacturer].filter(Boolean)
  return [dev.manufacturer, dev.articleNo || dev.type].filter(Boolean)
}
