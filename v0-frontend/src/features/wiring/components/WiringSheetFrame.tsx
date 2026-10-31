import { memo } from 'react'
import type { CadPage } from '@/types/cad'
import { pageRect } from '@/features/drawing/viewportActions'
import { GRID_ORIGIN, gridDotOpacity, gridDotRadius, visibleGridStep } from '@/features/drawing/grid'

/** Outer border inset in world units (0.1 mm). */
export const WIRING_FRAME_MARGIN = 100

/**
 * Simple paper + outer border for wiring pages. The configurable title block
 * for wiring diagrams follows in W8; the schematic SheetFrame stays untouched.
 *
 * Grid dots sit exactly on GRID_ORIGIN + k * step (the snap lattice); the
 * pattern tile is offset by half a step so dots are centred, never clipped.
 */
export const WiringSheetFrame = memo(function WiringSheetFrame({ page, grid, showGrid, s = 1 }: { page: Pick<CadPage, 'id' | 'format' | 'customSize'>; grid: number; showGrid: boolean; s?: number }) {
  const { w, h } = pageRect(page)
  const m = Math.min(WIRING_FRAME_MARGIN, w / 10, h / 10)
  const step = visibleGridStep(grid, s)
  const patternId = `wiring-grid-${page.id}-${step}`
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={w} height={h} fill="var(--sheet-paper, white)" />
      {showGrid && grid > 0 && (
        <>
          <defs>
            <pattern id={patternId} data-grid-step={step} width={step} height={step} patternUnits="userSpaceOnUse" x={GRID_ORIGIN.x - step / 2} y={GRID_ORIGIN.y - step / 2}>
              <circle cx={step / 2} cy={step / 2} r={gridDotRadius(s, step)} fill="var(--sheet-grid, #94a3b8)" fillOpacity={gridDotOpacity(step, s)} />
            </pattern>
          </defs>
          <rect data-grid="" x={m} y={m} width={w - m * 2} height={h - m * 2} fill={`url(#${patternId})`} />
        </>
      )}
      <rect x={m} y={m} width={w - m * 2} height={h - m * 2} fill="none" stroke="var(--sheet-ink)" strokeWidth={5} />
    </g>
  )
})
