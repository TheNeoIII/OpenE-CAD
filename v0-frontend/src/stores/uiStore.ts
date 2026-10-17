import { create } from 'zustand'
import type { DataViewId } from '@/types/data'
import type { DocPageId } from '@/types/project'
import { uid } from '@/utils/format'

export type Workspace = 'project' | 'schematic' | 'cabinet' | 'data' | 'documentation'
export type NavigatorTab = 'pages' | 'devices' | 'terminals' | 'cables' | 'plc'
export type InspectorTab = 'properties' | 'validation'
export type DocSection = 'overview' | DocPageId | 'revisions' | 'print'

export type MenuEntry =
  | { command: string; args?: unknown; label?: string }
  | { separator: true }
  | { label: string; submenu: MenuEntry[] }

export interface ContextMenuState {
  x: number
  y: number
  items: MenuEntry[]
}

export type DialogState =
  | { type: 'newProject' }
  | { type: 'openProject' }
  | { type: 'duplicateProject'; projectId: string; title?: string }
  | { type: 'projectSettings'; projectId?: string }
  | { type: 'settings' }
  | { type: 'pageProperties'; pageId: string }
  | { type: 'functionGroups' }
  | { type: 'symbolPicker' }
  | { type: 'articlePicker'; deviceId: string }
  | { type: 'pdfExport'; mode: 'pdf' | 'print' }
  | { type: 'dataExport' }
  | { type: 'dataImport' }
  | { type: 'bulkEdit' }
  | { type: 'potential' }
  | { type: 'xref' }
  | { type: 'revision' }
  | { type: 'shortcuts' }
  | { type: 'about' }
  | { type: 'confirm'; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void }
  | { type: 'prompt'; title: string; label: string; value: string; confirmLabel?: string; onSubmit: (value: string) => void }

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'success' | 'error'
}

interface UiState {
  workspace: Workspace
  panels: { navigator: boolean; inspector: boolean }
  navigatorTab: NavigatorTab
  inspectorTab: InspectorTab
  paletteOpen: boolean
  dialog: DialogState | null
  contextMenu: ContextMenuState | null
  toasts: Toast[]
  cabinetId: string | null
  cabinetSelection: string | null
  dataView: DataViewId
  /** Data workspace shows either a generated table or the wire style preset editor. */
  dataPane: 'table' | 'wireStyles' | 'potentials' | 'symbols'
  docSection: DocSection
  projectFocusId: string | null
  /** Pages multi-selected in the navigator (for page copy/paste). */
  pageSelection: string[]
  setWorkspace: (w: Workspace) => void
  togglePanel: (p: 'navigator' | 'inspector') => void
  set: (patch: Partial<UiState>) => void
  openDialog: (d: DialogState) => void
  closeDialog: () => void
  openContextMenu: (x: number, y: number, items: MenuEntry[]) => void
  closeContextMenu: () => void
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  workspace: 'project',
  panels: { navigator: true, inspector: true },
  navigatorTab: 'pages',
  inspectorTab: 'properties',
  paletteOpen: false,
  dialog: null,
  contextMenu: null,
  toasts: [],
  cabinetId: null,
  cabinetSelection: null,
  dataView: 'devices',
  dataPane: 'table',
  docSection: 'overview',
  projectFocusId: null,
  pageSelection: [],
  setWorkspace: (workspace) => set({ workspace, contextMenu: null }),
  togglePanel: (p) => set((s) => ({ panels: { ...s.panels, [p]: !s.panels[p] } })),
  set: (patch) => set(patch),
  openDialog: (dialog) => set({ dialog, contextMenu: null, paletteOpen: false }),
  closeDialog: () => set({ dialog: null }),
  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  toast: (message, tone = 'info') => {
    const id = uid('toast')
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }))
    setTimeout(() => get().dismissToast(id), 3600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, tone?: Toast['tone']) => useUiStore.getState().toast(message, tone)
