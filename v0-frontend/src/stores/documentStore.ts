import { create } from 'zustand'
import { syncPresets } from '@/features/schematic/models/wireStyles'
import { useLibraryStore } from './libraryStore'
import { normalizePages, synchronizePage } from '@/utils/pageOrganization'
import type { CadDocument, CadPage } from '@/types/cad'
import { useHistoryStore } from './historyStore'
import { useProjectStore } from './projectStore'
import { projectEditorLabel } from './userDirectoryStore'

interface DocumentState {
  document: CadDocument | null
  activePageId: string | null
  load: (doc: CadDocument | null) => void
  replace: (doc: CadDocument) => void
  setActivePage: (id: string) => void
  /** Every geometry/data change goes through here: one history entry per call. */
  commit: (label: string, fn: (doc: CadDocument) => CadDocument) => void
}

function defaultPage(doc: CadDocument) {
  const schematic = doc.pages.filter((p) => p.kind === 'schematic')
  const richest = [...schematic].sort((a, b) => b.symbols.length - a.symbols.length)[0]
  return (richest ?? doc.pages[0])?.id ?? null
}

let propertyEdit: { before: CadDocument; label: string } | null = null

/**
 * Starts a live property edit: subsequent commits preview immediately without history entries.
 * Idempotent while a session is open.
 */
export function beginPropertyEdit() {
  const doc = useDocumentStore.getState().document
  if (!propertyEdit && doc) propertyEdit = { before: doc, label: '' }
}

/** Ends the live edit: `keep` records exactly one undo step, otherwise the original document is restored. */
export function endPropertyEdit(keep = true) {
  const session = propertyEdit
  propertyEdit = null
  if (!session) return
  const current = useDocumentStore.getState().document
  if (!current || current === session.before) return
  if (keep) useHistoryStore.getState().push(session.label || 'Eigenschaft geändert', session.before)
  else useDocumentStore.getState().replace(session.before)
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: null,
  activePageId: null,
  load: (doc) => {
    if (doc) {
      const library = useLibraryStore.getState()
      library.adopt(doc)
      const { wirePresets, potentialDefs, customSymbols, symbolOverrides, ...rest } = normalizePages(doc)
      const presets = useLibraryStore.getState().wirePresets
      doc = syncPresets(rest as CadDocument, presets, presets)
    }
    useHistoryStore.getState().clear()
    set({ document: doc, activePageId: doc ? defaultPage(doc) : null })
  },
  replace: (doc) => {
    doc = normalizePages(doc)
    const active = get().activePageId
    set({ document: doc, activePageId: doc.pages.some((p) => p.id === active) ? active : (doc.pages[0]?.id ?? null) })
  },
  setActivePage: (id) => set({ activePageId: id }),
  commit: (label, fn) => {
    const prev = get().document
    if (!prev) return
    const next = fn(prev)
    if (next === prev) return
    if (propertyEdit) {
      propertyEdit.label = label
      get().replace(next)
      useProjectStore.getState().setDirty(true)
      return
    }
    useHistoryStore.getState().push(label, prev)
    get().replace(next)
    useProjectStore.getState().setDirty(true)
  },
}))

export function useActivePage(): CadPage | null {
  return useDocumentStore((s) => s.document?.pages.find((p) => p.id === s.activePageId) ?? null)
}

export function getActivePage(): CadPage | null {
  const { document, activePageId } = useDocumentStore.getState()
  return document?.pages.find((p) => p.id === activePageId) ?? null
}

export function updatePage(doc: CadDocument, pageId: string, fn: (p: CadPage) => CadPage): CadDocument {
  const editedBy = projectEditorLabel(useProjectStore.getState().current) || undefined
  return { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? { ...synchronizePage(doc, p, fn(p)), updatedAt: new Date().toISOString(), editedBy: editedBy ?? p.editedBy } : p)) }
}
