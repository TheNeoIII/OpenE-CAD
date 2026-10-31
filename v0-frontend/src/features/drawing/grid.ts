import type { Point } from '@/types/cad'
import { BASE_SCALE } from './viewport'

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

const SUBDIVISIONS = [1, 2, 4, 5, 10, 20, 25, 50, 100]

/**
 * Effective grid step in world units for the current scale. The on-screen dot
 * spacing stays at the configured grid as it appears at 100 % zoom: zooming in
 * subdivides the grid (integer divisors, so steps stay whole 0.1 mm units),
 * zooming out coarsens it by powers of two. Visible dots and grid snapping both
 * use this step, so every snap point is a visible dot and the grid never scales.
 */
export function visibleGridStep(grid: number, scale: number = BASE_SCALE): number {
  if (!(grid > 0) || !(scale > 0)) return grid
  const zoom = scale / BASE_SCALE
  if (zoom < 1) return grid * 2 ** Math.round(Math.log2(1 / zoom))
  let best = 1
  for (const f of SUBDIVISIONS) {
    if (grid % f !== 0) continue
    if (Math.abs(Math.log2(f / zoom)) < Math.abs(Math.log2(best / zoom))) best = f
  }
  return grid / best
}

/** World coordinates of the visible dots inside `[from, to]` along one axis. */
export function gridLinePositions(from: number, to: number, step: number, origin = 0): number[] {
  const out: number[] = []
  for (let v = Math.ceil((from - origin) / step) * step + origin; v <= to; v += step) out.push(v)
  return out
}
