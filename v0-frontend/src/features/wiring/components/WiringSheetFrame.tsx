import { memo } from 'react'
import type { CadPage } from '@/types/cad'
import { pageRect } from '@/features/drawing/viewportActions'

/** Outer border inset in world units (0.1 mm). */
export const WIRING_FRAME_MARGIN = 100

/**
 * Simple paper + outer border for wiring pages. The configurable title block
 * for wiring diagrams follows in W8; the schematic SheetFrame stays untouched.
 */
export const WiringSheetFrame = memo(function WiringSheetFrame({ page, grid, showGrid }: { page: Pick<CadPage, 'id' | 'format' | 'customSize'>; grid: number; showGrid: boolean }) {
  const { w, h } = pageRect(page)
  const m = Math.min(WIRING_FRAME_MARGIN, w / 10, h / 10)
  const patternId = `wiring-grid-${page.id}-${grid}`
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={w} height={h} fill="var(--sheet-paper, white)" />
      {showGrid && grid > 0 && (
        <>
          <defs>
            <pattern id={patternId} width={grid} height={grid} patternUnits="userSpaceOnUse" x={m} y={m}>
              <circle cx={0} cy={0} r={1.6} fill="var(--sheet-grid, #cbd5e1)" />
            </pattern>
          </defs>
          <rect x={m} y={m} width={w - m * 2} height={h - m * 2} fill={`url(#${patternId})`} />
        </>
      )}
      <rect x={m} y={m} width={w - m * 2} height={h - m * 2} fill="none" stroke="var(--sheet-ink)" strokeWidth={5} />
    </g>
  )
})
