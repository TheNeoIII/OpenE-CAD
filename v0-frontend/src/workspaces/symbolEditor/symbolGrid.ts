import { mmToWorldUnits } from '@/utils/units'

/** Symbol geometry uses document units (1 mm = 10), so the grid never depends on zoom or viewport size. */
export const symbolGridStep = (gridMm: number) => mmToWorldUnits(gridMm)

/** Quantizes a world coordinate to a world-unit step around origin 0. */
export const snapSymbolValue = (value: number, stepUnits: number) => Math.round(value / stepUnits) * stepUnits

export const snapToSymbolGrid = (value: number, gridMm: number) => snapSymbolValue(value, symbolGridStep(gridMm))
