import type { Point } from '@/types/cad'

/**
 * World origin of the grid. Both the visible dots and grid snapping
 * (`snapPoint`) quantize to multiples of the grid size around this origin.
 */
export const GRID_ORIGIN: Point = { x: 0, y: 0 }

/** Dot radius in screen pixels; kept constant over zoom so dots never vanish. */
export const GRID_DOT_PX = 1.25
/** Below this on-screen spacing the visible dots are thinned (to multiples of the grid). */
export const GRID_MIN_SPACING_PX = 8

export const gridDotRadius = (scale: number) => GRID_DOT_PX / scale

/**
 * Visible dot spacing in world units. Always an integer multiple of `grid`,
 * so every rendered dot is a valid snap point.
 */
export function visibleGridStep(grid: number, scale: number): number {
  if (!(grid > 0) || !(scale > 0)) return grid
  let step = grid
  while (step * scale < GRID_MIN_SPACING_PX && step < grid * 64) step *= 2
  return step
}

/** World coordinates of the visible dots inside `[from, to]` along one axis. */
export function gridLinePositions(from: number, to: number, step: number, origin = 0): number[] {
  const out: number[] = []
  for (let v = Math.ceil((from - origin) / step) * step + origin; v <= to; v += step) out.push(v)
  return out
}
