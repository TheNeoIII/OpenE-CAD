import { create } from 'zustand'
import { backend } from '@/backend'
import type { ValidationResult } from '@/types/project'
import { useDocumentStore } from './documentStore'

interface ValidationState {
  results: ValidationResult[]
  running: boolean
  lastRun: string | null
  cursor: number
  run: () => Promise<ValidationResult[]>
  setCursor: (i: number) => void
}

export const useValidationStore = create<ValidationState>((set) => ({
  results: [],
  running: false,
  lastRun: null,
  cursor: -1,
  run: async () => {
    const doc = useDocumentStore.getState().document
    if (!doc) {
      set({ results: [] })
      return []
    }
    set({ running: true })
    const results = await backend.validateProject(doc)
    set({ results, running: false, lastRun: new Date().toISOString() })
    return results
  },
  setCursor: (cursor) => set({ cursor }),
}))

/** Live check: re-validate shortly after every document change. */
export function startValidationWatcher() {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => void useValidationStore.getState().run(), 250)
  }
  schedule()
  return useDocumentStore.subscribe((s, prev) => {
    if (s.document !== prev.document) schedule()
  })
}

export function issuesForTarget(results: ValidationResult[], ids: string[]) {
  return results.filter((r) => ids.includes(r.target.id))
}
