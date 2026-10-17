import { findObject, objectBounds } from '@/features/schematic/models/geometry'
import { centerOn } from '@/features/schematic/viewport'
import { useDocumentStore } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUiStore } from '@/stores/uiStore'
import { useValidationStore } from '@/stores/validationStore'
import type { ValidationResult } from '@/types/project'

/** Jump to the place a finding refers to: page + selection + centered viewport, or the cabinet row. */
export function goToResult(r: ValidationResult) {
  const ui = useUiStore.getState()
  const docState = useDocumentStore.getState()
  const doc = docState.document
  if (!doc) return
  if (r.target.kind === 'cabinetRow' && r.target.cabinetId) {
    ui.set({ cabinetId: r.target.cabinetId, cabinetSelection: null })
    ui.setWorkspace('cabinet')
    return
  }
  let pageId = r.target.pageId
  let objectId: string | null = r.target.kind === 'page' ? null : r.target.id
  if (r.target.kind === 'device') {
    const page = doc.pages.find((p) => p.symbols.some((s) => s.deviceId === r.target.id))
    if (!page) {
      ui.set({ dataView: 'devices' })
      ui.setWorkspace('data')
      return
    }
    pageId = page.id
    objectId = page.symbols.find((s) => s.deviceId === r.target.id)!.id
  }
  if (!pageId) return
  docState.setActivePage(pageId)
  ui.setWorkspace('schematic')
  const page = doc.pages.find((p) => p.id === pageId)
  if (!page || !objectId) return useSelectionStore.getState().clear()
  useSelectionStore.getState().set([objectId])
  const obj = findObject(page, objectId)
  // Wait one frame so the viewport of the newly activated page has measured itself.
  if (obj) requestAnimationFrame(() => centerOn(objectBounds(obj)))
}

export function stepResult(dir: 1 | -1) {
  const { results, cursor, setCursor } = useValidationStore.getState()
  const list = results.filter((r) => r.severity !== 'info')
  if (!list.length) return null
  const next = (cursor + dir + list.length) % list.length
  setCursor(next)
  goToResult(list[next])
  return list[next]
}
