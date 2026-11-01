import type { Point } from '@/types/cad'

/**
 * World origin of the grid. Both the visible dots and grid snapping
 * (`snapPoint`) quantize to multiples of the grid size around this origin.
 */
export const GRID_ORIGIN: Point = { x: 0, y: 0 }

/** Maximum dot radius in screen pixels; constant over zoom so dots never grow. */
export const GRID_DOT_PX = 1.25
/** Below this on-screen spacing dots shrink and fade instead of being thinned out. */
export const GRID_MIN_SPACING_PX = 8

/**
 * Dot radius in world units. Never larger than GRID_DOT_PX on screen and never
 * more than a quarter of the on-screen spacing, so dense grids do not merge.
 */
export function gridDotRadius(scale: number, grid = Infinity): number {
  const spacingPx = grid * scale
  return Math.min(GRID_DOT_PX, spacingPx / 4) / scale
}

/** Dot opacity: full at comfortable spacing, faded (not removed) when dense. */
export function gridDotOpacity(grid: number, scale: number): number {
  const spacingPx = grid * scale
  return Math.max(0.35, Math.min(1, spacingPx / GRID_MIN_SPACING_PX))
}

/** World coordinates of the visible dots inside `[from, to]` along one axis. */
export function gridLinePositions(from: number, to: number, step: number, origin = 0): number[] {
  const out: number[] = []
  for (let v = Math.ceil((from - origin) / step) * step + origin; v <= to; v += step) out.push(v)
  return out
}
