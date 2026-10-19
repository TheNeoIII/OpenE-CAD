import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setProjectSymbols } from '@/features/schematic/models/symbolLibrary'
import { DEFAULT_POTENTIALS, WIRE_PRESETS } from '@/features/schematic/models/wireStyles'
import type { BuiltinSymbolKind, CadDocument, CustomSymbolDef, PotentialDef, SymbolOverride, WirePreset } from '@/types/cad'

type Overrides = Partial<Record<BuiltinSymbolKind, SymbolOverride>>

/** System-wide library shared by all projects: wire styles, potentials and symbols. */
export interface LibraryData {
  wirePresets: WirePreset[]
  potentialDefs: PotentialDef[]
  customSymbols: CustomSymbolDef[]
  symbolOverrides: Overrides
}

interface LibraryState extends LibraryData {
  setPresets: (next: WirePreset[]) => void
  setPotentialDefs: (next: PotentialDef[]) => void
  setCustomSymbols: (fn: (list: CustomSymbolDef[]) => CustomSymbolDef[]) => void
  setOverrides: (fn: (o: Overrides) => Overrides) => void
  /** Moves library data that older project files carried into the global library (existing entries win). */
  adopt: (doc: Pick<CadDocument, 'wirePresets' | 'potentialDefs' | 'customSymbols' | 'symbolOverrides'>) => void
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      wirePresets: WIRE_PRESETS,
      potentialDefs: DEFAULT_POTENTIALS,
      customSymbols: [],
      symbolOverrides: {},
      setPresets: (wirePresets) => set({ wirePresets }),
      setPotentialDefs: (potentialDefs) => set({ potentialDefs }),
      setCustomSymbols: (fn) => set((s) => ({ customSymbols: fn(s.customSymbols) })),
      setOverrides: (fn) => set((s) => ({ symbolOverrides: fn(s.symbolOverrides) })),
      adopt: (doc) => {
        const s = get()
        const patch: Partial<LibraryData> = {}
        const presetIds = new Set(s.wirePresets.map((p) => p.id))
        const newPresets = (doc.wirePresets ?? []).filter((p) => !presetIds.has(p.id))
        if (newPresets.length) patch.wirePresets = [...s.wirePresets, ...newPresets]
        const potNames = new Set(s.potentialDefs.map((d) => d.name))
        const newPots = (doc.potentialDefs ?? []).filter((d) => !potNames.has(d.name))
        if (newPots.length) patch.potentialDefs = [...s.potentialDefs, ...newPots]
        const symIds = new Set(s.customSymbols.map((c) => c.id))
        const newSyms = (doc.customSymbols ?? []).filter((c) => !symIds.has(c.id))
        if (newSyms.length) patch.customSymbols = [...s.customSymbols, ...newSyms]
        const newOverrides = Object.entries(doc.symbolOverrides ?? {}).filter(([k]) => !(k in s.symbolOverrides))
        if (newOverrides.length) patch.symbolOverrides = { ...s.symbolOverrides, ...Object.fromEntries(newOverrides) }
        if (Object.keys(patch).length) set(patch)
      },
    }),
    {
      name: 'openecad.library',
      version: 1,
      partialize: ({ wirePresets, potentialDefs, customSymbols, symbolOverrides }) => ({ wirePresets, potentialDefs, customSymbols, symbolOverrides }),
      onRehydrateStorage: () => (state) => state && setProjectSymbols(state),
    },
  ),
)

setProjectSymbols(useLibraryStore.getState())
useLibraryStore.subscribe((s, p) => {
  if (s.customSymbols !== p.customSymbols || s.symbolOverrides !== p.symbolOverrides) setProjectSymbols(s)
})

export const getLibrary = () => useLibraryStore.getState()
