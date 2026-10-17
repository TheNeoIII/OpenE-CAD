import { MockOpenEcadBackend } from './MockOpenEcadBackend'
import type { OpenEcadBackend } from './OpenEcadBackend'
import { TauriOpenEcadBackend } from './TauriOpenEcadBackend'

export type { OpenEcadBackend } from './OpenEcadBackend'

export const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Mock is the default. Set VITE_OPENECAD_BACKEND=tauri to talk to the Rust core. */
function createBackend(): OpenEcadBackend {
  if (import.meta.env.VITE_OPENECAD_BACKEND === 'tauri' && isTauriRuntime()) return new TauriOpenEcadBackend()
  return new MockOpenEcadBackend()
}

export const backend: OpenEcadBackend = createBackend()
