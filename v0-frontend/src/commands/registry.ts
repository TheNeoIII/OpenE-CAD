import type { LucideIcon } from 'lucide-react'
import type { Workspace } from '@/stores/uiStore'

export interface Command {
  id: string
  label: string
  category: string
  icon?: LucideIcon
  /** First entry is displayed; all entries trigger. Format: "Ctrl+Shift+S", "Delete", "W". */
  shortcut?: string | string[]
  /** Limit the shortcut to specific workspaces. Menus/palette ignore this. */
  scope?: Workspace[]
  /** Fire even while focus is inside a text input. */
  allowInInput?: boolean
  /** Visible but disabled; reserved for a later release. */
  future?: boolean
  keywords?: string
  run: (args?: any) => void | Promise<void>
  isEnabled?: (args?: any) => boolean
  isChecked?: () => boolean
}

const registry = new Map<string, Command>()

export function registerCommands(list: Command[]) {
  for (const c of list) registry.set(c.id, c)
}

export const getCommand = (id: string) => registry.get(id)
export const allCommands = () => [...registry.values()]

export function isCommandEnabled(cmd: Command, args?: unknown) {
  if (cmd.future) return false
  return cmd.isEnabled ? cmd.isEnabled(args) : true
}

export function runCommand(id: string, args?: unknown) {
  const cmd = registry.get(id)
  if (!cmd || !isCommandEnabled(cmd, args)) return false
  void cmd.run(args)
  return true
}

export const shortcutsOf = (c: Command) => (c.shortcut ? (Array.isArray(c.shortcut) ? c.shortcut : [c.shortcut]) : [])
export const primaryShortcut = (c: Command) => shortcutsOf(c)[0]

/** Keyboard-layout independent combo string, e.g. "Ctrl+Shift+S", "Alt+1", "+", "Delete". */
export function comboFromEvent(e: KeyboardEvent) {
  let key: string
  if (e.code.startsWith('Key')) key = e.code.slice(3)
  else if (e.code.startsWith('Digit')) key = e.code.slice(5)
  else if (e.code === 'NumpadAdd' || e.key === '+') key = '+'
  else if (e.code === 'NumpadSubtract' || e.key === '-') key = '-'
  else if (e.code === 'Comma') key = ','
  else if (e.key === ' ') key = 'Space'
  else key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  const mods: string[] = []
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey && key !== '+') mods.push('Shift')
  return [...mods, key].join('+')
}

export function tooltip(id: string) {
  const c = registry.get(id)
  if (!c) return id
  const sc = primaryShortcut(c)
  return sc ? `${c.label} (${sc})` : c.label
}
