import { useEffect, type RefObject } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useViewportStore } from '@/stores/viewportStore'
import { fitPage, panBy, zoomAt } from './viewportActions'

/**
 * Binds a canvas host element to the shared page viewport: size tracking,
 * per-page view restore, initial fit and wheel zoom/scroll.
 */
export function useViewportHost(ref: RefObject<HTMLElement | null>, pageId: string) {
  const size = useViewportStore((s) => s.size)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => useViewportStore.getState().setSize(Math.round(e.contentRect.width), Math.round(e.contentRect.height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  useEffect(() => {
    const vs = useViewportStore.getState()
    if (vs.last) vs.setView(pageId, vs.last)
  }, [pageId])

  useEffect(() => {
    if (size.w > 40 && size.h > 40 && !useViewportStore.getState().byPage[pageId]) fitPage()
  }, [pageId, size.w, size.h])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1
      const modifier = e.ctrlKey || e.metaKey
      const zoomMode = useSettingsStore.getState().wheelMode === 'zoom'
      if (modifier !== zoomMode) return zoomAt(Math.exp(-e.deltaY * unit * 0.004), { x: e.clientX - r.left, y: e.clientY - r.top })
      if (e.shiftKey && !e.deltaX) return panBy(-e.deltaY * unit, 0)
      panBy(-e.deltaX * unit, -e.deltaY * unit)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref])
}
