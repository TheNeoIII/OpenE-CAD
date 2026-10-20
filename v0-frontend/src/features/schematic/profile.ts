import type { CadTool } from '@/stores/toolStore'

/** Tools of the electrical schematic editor. Free graphic shapes belong to wiring pages. */
export const SCHEMATIC_TOOLS: ReadonlySet<CadTool> = new Set<CadTool>(['select', 'pan', 'wire', 'line', 'text', 'place'])
