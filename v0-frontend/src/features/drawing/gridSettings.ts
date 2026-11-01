import { mmToWorldUnits, parseMmInput } from '@/utils/units'
import { clampZoom } from './viewport'

/** Grid presets in mm; persisted as world units (0.5 mm = 5 units). */
export const GRID_PRESETS_MM = [0.5, 1, 2.5, 5, 10, 25] as const
export const GRID_PRESETS = GRID_PRESETS_MM.map(mmToWorldUnits)
/** 0,1 mm … 100 mm. Integers only: geometry is stored in whole world units. */
export const MIN_GRID_UNITS = 1
export const MAX_GRID_UNITS = 1000
export const DEFAULT_GRID_UNITS = 50

export function normalizeGridUnits(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const units = Math.round(value)
  return units >= MIN_GRID_UNITS && units <= MAX_GRID_UNITS ? units : null
}

/** Custom grid entry in mm → world units, or null if invalid / not representable. */
export function parseGridMm(raw: string): number | null {
  const mm = parseMmInput(raw)
  if (mm === null) return null
  const units = mm * 10
  if (Math.abs(units - Math.round(units)) > 1e-9) return null
  return normalizeGridUnits(units)
}

export interface GridSettingsSlice {
  gridSize: number
  snapGridSize: number
  snapFollowsGrid: boolean
}

/** Upgrades persisted settings from v1 (gridSize only, 25|50|100) to separate display/snap grids. */
export function migrateGridSettings(persisted: Record<string, unknown> | undefined): GridSettingsSlice {
  const gridSize = normalizeGridUnits(persisted?.gridSize) ?? DEFAULT_GRID_UNITS
  const snapFollowsGrid = typeof persisted?.snapFollowsGrid === 'boolean' ? persisted.snapFollowsGrid : true
  const snapGridSize = snapFollowsGrid ? gridSize : normalizeGridUnits(persisted?.snapGridSize) ?? gridSize
  return { gridSize, snapGridSize, snapFollowsGrid }
}

export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 8] as const

/** "100", "100 %", "62,5" → clamped zoom factor; null for invalid input. */
export function parseZoomPercent(raw: string): number | null {
  const text = raw.trim().replace(/\s*%$/, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  const percent = Number(text)
  if (!Number.isFinite(percent) || percent <= 0) return null
  return clampZoom(percent / 100)
}

export const formatZoomPercent = (zoom: number) => `${Math.round(zoom * 100)} %`
