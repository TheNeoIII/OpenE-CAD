import type { PageKind } from '@/types/cad'
import type { CadTool } from '@/stores/toolStore'
import { SCHEMATIC_TOOLS } from './schematic/profile'
import { WIRING_TOOLS } from './wiring/profile'

/** Tool set of the editor responsible for a page kind. */
export function pageTools(kind: PageKind | undefined): ReadonlySet<CadTool> {
  return kind === 'wiring' ? WIRING_TOOLS : SCHEMATIC_TOOLS
}

export const isToolAllowed = (kind: PageKind | undefined, tool: CadTool) => pageTools(kind).has(tool)
