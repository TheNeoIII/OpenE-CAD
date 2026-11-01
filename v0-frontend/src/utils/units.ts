import { UNITS_PER_MM } from '@/types/cad'

/** Document units: 1 mm = 10 world units in every editor (schematic, wiring, symbol). */
export const mmToWorldUnits = (mm: number) => Math.round(mm * UNITS_PER_MM * 1000) / 1000
export const worldUnitsToMm = (units: number) => units / UNITS_PER_MM

/** German-style mm label without trailing zeros: 25 → "2,5 mm". */
export function formatMm(units: number): string {
  const mm = Math.round(worldUnitsToMm(units) * 100) / 100
  return `${String(mm).replace('.', ',')} mm`
}

/** Accepts "2,5", "2.5", "2,5 mm"; returns null for anything that is not a positive finite number. */
export function parseMmInput(raw: string): number | null {
  const text = raw.trim().replace(/\s*mm$/i, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(text)) return null
  const mm = Number(text)
  return Number.isFinite(mm) && mm > 0 ? mm : null
}
