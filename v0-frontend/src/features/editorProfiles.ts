import type { CadObject, PageKind } from '@/types/cad'
import type { CadTool } from '@/stores/toolStore'
import { SCHEMATIC_TOOLS } from './schematic/profile'
import { WIRING_TOOLS } from './wiring/profile'

const EMPTY_TOOLS: ReadonlySet<CadTool> = new Set()

/** Tool set of the editor responsible for a page kind. */
export function pageTools(kind: PageKind | undefined): ReadonlySet<CadTool> {
  return kind === 'schematic' ? SCHEMATIC_TOOLS : kind === 'wiring' ? WIRING_TOOLS : EMPTY_TOOLS
}

export const isToolAllowed = (kind: PageKind | undefined, tool: CadTool) => pageTools(kind).has(tool)

export function isObjectAllowed(kind: PageKind | undefined, object: CadObject): boolean {
  if (kind === 'schematic') return object.type !== 'diagramBlock'
  if (kind !== 'wiring') return false
  return ['diagramBlock', 'line', 'rectangle', 'ellipse', 'image'].includes(object.type) || (object.type === 'text' && object.style !== 'xref')
}
