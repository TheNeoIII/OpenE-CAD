import type { CadTool } from '@/stores/toolStore'

/** Tools of the graphic wiring editor – no conductors, symbols or electrical placement. */
export const WIRING_TOOLS: ReadonlySet<CadTool> = new Set<CadTool>(['block', 'port', 'select', 'pan', 'line', 'text', 'rect', 'ellipse'])
