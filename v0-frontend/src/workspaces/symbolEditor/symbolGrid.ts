import { mmToWorldUnits } from '@/utils/units'

/** Symbol geometry uses document units (1 mm = 10), so the grid never depends on zoom or viewport size. */
export const symbolGridStep = (gridMm: number) => mmToWorldUnits(gridMm)

export const snapToSymbolGrid = (value: number, gridMm: number) => {
  const step = symbolGridStep(gridMm)
  return Math.round(value / step) * step
}
