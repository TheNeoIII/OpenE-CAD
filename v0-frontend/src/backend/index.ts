import { HttpOpenEcadBackend } from './HttpOpenEcadBackend'
import type { OpenEcadBackend } from './OpenEcadBackend'

export type { OpenEcadBackend } from './OpenEcadBackend'

export const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// Desktop is deferred: no Tauri module is imported by the web entrypoint.
async function createBackend(): Promise<OpenEcadBackend> {
  if (import.meta.env.DEV && import.meta.env.VITE_OPENECAD_BACKEND !== 'http') {
    const { MockOpenEcadBackend } = await import('./MockOpenEcadBackend')
    return new MockOpenEcadBackend()
  }
  return new HttpOpenEcadBackend(import.meta.env.VITE_OPENECAD_API_BASE || '/api')
}

export const backend = await createBackend()
