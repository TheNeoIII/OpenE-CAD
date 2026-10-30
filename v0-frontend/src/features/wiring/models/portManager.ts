import { create } from 'zustand'

/** Temporary identification colors. UI-only, never persisted to the document. */
export const PORT_MANAGER_COLORS = ['#e5484d', '#f76b15', '#e2a336', '#46a758', '#12a594', '#0090ff', '#8e4ec6', '#d6409f'] as const

export const portManagerColor = (index: number) => PORT_MANAGER_COLORS[index % PORT_MANAGER_COLORS.length]

interface PortManagerState {
  objectId: string | null
  hoverPortId: string | null
  focusPortId: string | null
  open: (objectId: string) => void
  close: () => void
  setHover: (portId: string | null) => void
  setFocus: (portId: string | null) => void
}

export const usePortManagerStore = create<PortManagerState>((set, get) => ({
  objectId: null,
  hoverPortId: null,
  focusPortId: null,
  open: (objectId) => set({ objectId, hoverPortId: null, focusPortId: null }),
  close: () => { if (get().objectId) set({ objectId: null, hoverPortId: null, focusPortId: null }) },
  setHover: (hoverPortId) => { if (get().hoverPortId !== hoverPortId) set({ hoverPortId }) },
  setFocus: (focusPortId) => { if (get().focusPortId !== focusPortId) set({ focusPortId }) },
}))
