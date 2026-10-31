import { useUiStore } from '@/stores/uiStore'
import { isNonTextControl, isTypingTarget } from '@/utils/format'
import { allCommands, comboFromEvent, isCommandEnabled, shortcutsOf, type Command } from './registry'

let index: Map<string, Command[]> | null = null

function buildIndex() {
  index = new Map()
  for (const c of allCommands()) {
    for (const sc of shortcutsOf(c)) {
      const list = index.get(sc) ?? []
      list.push(c)
      index.set(sc, list)
    }
  }
}

/** Single global dispatcher: every shortcut resolves to a registered command. */
export function installKeyboard() {
  buildIndex()
  const onKey = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return
    const ui = useUiStore.getState()
    const combo = comboFromEvent(e)
    // Overlays own the keyboard, except for the palette toggle.
    if ((ui.dialog || ui.paletteOpen) && combo !== 'Ctrl+K') return
    if (ui.contextMenu) return
    // Modifier shortcuts (Ctrl+Z, Ctrl+S…) must still reach the app from controls that have no text history.
  const typing = isTypingTarget(e.target) && !(isNonTextControl(e.target) && (e.ctrlKey || e.metaKey))
    const candidates = index?.get(combo)
    if (!candidates) return
    const cmd = candidates.find((c) => (!c.scope || c.scope.includes(ui.workspace)) && (!typing || c.allowInInput))
    if (!cmd) return
    e.preventDefault()
    if (isCommandEnabled(cmd)) void cmd.run()
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}
