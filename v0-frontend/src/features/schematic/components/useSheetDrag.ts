import { useRef, useState } from 'react'
import { useDocumentStore } from '@/stores/documentStore'
import { moveSheet } from '@/utils/pageOrganization'

export interface SheetDrag {
  pageId: string
  number: string
  title: string
  x: number
  y: number
  offsetX: number
  offsetY: number
  width: number
  group: string | null
  beforeId?: string
}

const THRESHOLD = 6
const EDGE = 28

/**
 * Pointer-driven sheet reordering for the page navigator. Drop targets are found
 * via `data-page-group` sections and `data-page-row` rows inside `listRef`.
 */
export function useSheetDrag(listRef: React.RefObject<HTMLElement | null>) {
  const [drag, setDrag] = useState<SheetDrag | null>(null)
  const suppressClick = useRef(false)

  const begin = (e: React.PointerEvent<HTMLElement>, pageId: string, number: string, title: string) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return
    const rect = e.currentTarget.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    let current: SheetDrag | null = null

    const locate = (x: number, y: number): Pick<SheetDrag, 'group' | 'beforeId'> => {
      const section = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-page-group]')
      if (!section || !listRef.current?.contains(section)) return { group: current?.group ?? null, beforeId: current?.beforeId }
      const rows = [...section.querySelectorAll<HTMLElement>('[data-page-row]')].filter((r) => r.dataset.pageRow !== pageId)
      const before = rows.find((r) => {
        const b = r.getBoundingClientRect()
        return b.top + b.height / 2 > y
      })
      return { group: section.dataset.pageGroup ?? null, beforeId: before?.dataset.pageRow }
    }

    const autoScroll = (y: number) => {
      const el = listRef.current
      if (!el) return
      const b = el.getBoundingClientRect()
      if (y < b.top + EDGE) el.scrollTop -= 12
      else if (y > b.bottom - EDGE) el.scrollTop += 12
    }

    const move = (ev: PointerEvent) => {
      if (!current && Math.hypot(ev.clientX - startX, ev.clientY - startY) < THRESHOLD) return
      if (!current) {
        suppressClick.current = true
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
      }
      autoScroll(ev.clientY)
      current = {
        pageId,
        number,
        title,
        x: ev.clientX,
        y: ev.clientY,
        offsetX: startX - rect.left,
        offsetY: startY - rect.top,
        width: rect.width,
        ...locate(ev.clientX, ev.clientY),
      }
      setDrag(current)
    }

    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      const target = current
      current = null
      setDrag(null)
      if (commit && target?.group) {
        const group = target.group
        useDocumentStore.getState().commit('Blatt verschoben', (doc) => moveSheet(doc, pageId, group, target.beforeId))
      }
      setTimeout(() => (suppressClick.current = false), 0)
    }
    const onUp = () => finish(true)
    const onCancel = () => finish(false)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') finish(false)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey)
  }

  return { drag, begin, suppressClick }
}
