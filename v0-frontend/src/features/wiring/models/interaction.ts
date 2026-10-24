import type { CadTool } from '@/stores/toolStore'

/** Object type a drawing tool creates. Clicking an existing object of that type selects it instead. */
export const TOOL_OBJECT_TYPE: Partial<Record<CadTool, string>> = {
  rect: 'rectangle',
  ellipse: 'ellipse',
  block: 'diagramBlock',
  line: 'line',
  text: 'text',
}

export const toolMatchesType = (tool: CadTool, type: string | undefined) => !!type && TOOL_OBJECT_TYPE[tool] === type

/**
 * Pointer-down decision of a drawing tool.
 * - same object type under cursor → select/move it (no new object)
 * - Ctrl/Cmd held → always create (draw over an existing object)
 * - a running line draft keeps adding points
 */
export function toolPointerIntent(o: { tool: CadTool; hitType?: string; forceCreate?: boolean; drafting?: boolean }): 'select' | 'create' {
  if (o.forceCreate || o.drafting) return 'create'
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
