import { create } from 'zustand'

/** Ports selected inside the port tool. Always belong to a single owner block. */
interface PortSelectionState {
  objectId: string | null
  portIds: string[]
  select: (objectId: string, portId: string, additive?: boolean) => void
  clear: () => void
}

export const usePortSelectionStore = create<PortSelectionState>((set, get) => ({
  objectId: null,
  portIds: [],
  select: (objectId, portId, additive = false) => {
    const s = get()
    if (!additive || s.objectId !== objectId) return set({ objectId, portIds: [portId] })
    set({ portIds: s.portIds.includes(portId) ? s.portIds.filter((id) => id !== portId) : [...s.portIds, portId] })
  },
  clear: () => { if (get().objectId || get().portIds.length) set({ objectId: null, portIds: [] }) },
}))

/** Shared value across ports, or `undefined` when they differ. */
export function sharedValue<T, K extends keyof T>(items: readonly T[], key: K, fallback: T[K]): T[K] | undefined {
  const values = new Set(items.map((item) => item[key] ?? fallback))
  return values.size === 1 ? [...values][0] : undefined
}
