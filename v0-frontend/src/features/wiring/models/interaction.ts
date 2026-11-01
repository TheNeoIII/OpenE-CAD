import type { CadTool } from '@/stores/toolStore'

/** Object type a drawing tool creates; only edit hits intercept creation. */
export const TOOL_OBJECT_TYPE: Partial<Record<CadTool, string>> = {
  connection: 'connection',
  rect: 'rectangle',
  ellipse: 'ellipse',
  block: 'diagramBlock',
  line: 'line',
  text: 'text',
}

export const toolMatchesType = (tool: CadTool, type: string | undefined) => !!type && TOOL_OBJECT_TYPE[tool] === type

/** Explicit handles/ports are safe edit targets even with ForceCreate. */
export function toolPointerIntent(o: { tool: CadTool; hitType?: string; hitKind?: 'interior' | 'boundary' | 'stroke' | 'label' | 'port' | 'handle'; forceCreate?: boolean; drafting?: boolean }): 'select' | 'create' | 'edit' {
  if (o.drafting) return 'create'
  if (o.hitKind === 'handle' || o.hitKind === 'port') return 'edit'
  if (o.forceCreate || o.hitKind === 'interior') return 'create'
  return toolMatchesType(o.tool, o.hitType) ? 'select' : 'create'
}

export type EscapeAction = 'cancelEdit' | 'cancelGesture' | 'cancelDraft' | 'exitTool' | 'clearSelection' | 'none'

/**
 * Escape is a ladder – each press undoes exactly one level:
 * inline edit → running drag → line draft → modal port tool → selection → active tool.
 * The port tool is a sub-mode of a selected block, so it exits before the selection is dropped.
 */
export function escapeAction(s: { editing: boolean; gesture: boolean; drafting: boolean; tool: CadTool; hasSelection: boolean }): EscapeAction {
  if (s.editing) return 'cancelEdit'
  if (s.gesture) return 'cancelGesture'
  if (s.drafting) return 'cancelDraft'
  if (s.tool === 'port') return 'exitTool'
  if (s.hasSelection) return 'clearSelection'
  if (s.tool !== 'select') return 'exitTool'
  return 'none'
}
