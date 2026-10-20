import type { LineStyle } from '@/types/cad'

/** SVG dash arrays per line style, in world units (0.1 mm). */
export const LINE_DASH: Record<LineStyle, string | undefined> = { solid: undefined, dashed: '24 14', dashdot: '28 10 4 10' }
