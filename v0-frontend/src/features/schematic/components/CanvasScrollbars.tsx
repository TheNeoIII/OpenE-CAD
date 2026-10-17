import { useRef, type PointerEvent as RPointerEvent } from 'react'
import type { CadViewportState, Rect } from '@/types/cad'
import { panBy, scaleOf } from '../viewport'

const BAR = 12
const MIN_THUMB = 28
const MARGIN = 80

interface Axis {
  /** Visible range start/end within the scrollable extent, as fractions 0..1. */
  start: number
  end: number
  /** Screen pixels of scroll extent per pixel of track. */
  ratio: number
}

function axis(contentStart: number, contentEnd: number, viewLen: number, trackLen: number): Axis | null {
  const lo = Math.min(contentStart - MARGIN, 0)
  const hi = Math.max(contentEnd + MARGIN, viewLen)
  const total = hi - lo
  if (contentStart >= 0 && contentEnd <= viewLen) return null
  return { start: -lo / total, end: (viewLen - lo) / total, ratio: total / Math.max(trackLen, 1) }
}

/** Overlay scrollbars that reflect and control the pan position relative to the sheet. */
export function CanvasScrollbars({ view, size, sheet }: { view: CadViewportState; size: { w: number; h: number }; sheet: Rect }) {
  const s = scaleOf(view)
  const left = sheet.x * s + view.panX
  const top = sheet.y * s + view.panY
  const trackW = size.w - BAR
  const trackH = size.h - BAR
  const h = axis(left, left + sheet.w * s, size.w, trackW)
  const v = axis(top, top + sheet.h * s, size.h, trackH)
  if (!h && !v) return null
  return (
    <>
      {h && <Bar dir="h" a={h} track={trackW} />}
      {v && <Bar dir="v" a={v} track={trackH} />}
    </>
  )
}

function Bar({ dir, a, track }: { dir: 'h' | 'v'; a: Axis; track: number }) {
  const drag = useRef<number | null>(null)
  const len = Math.max(MIN_THUMB, (a.end - a.start) * track)
  const pos = Math.min(track - len, a.start * track)
  const horizontal = dir === 'h'

  const scroll = (px: number) => (horizontal ? panBy(-px * a.ratio, 0) : panBy(0, -px * a.ratio))
  const coord = (e: RPointerEvent) => (horizontal ? e.clientX : e.clientY)

  const onThumbDown = (e: RPointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = coord(e)
  }
  const onThumbMove = (e: RPointerEvent) => {
    if (drag.current == null) return
    const c = coord(e)
    scroll(c - drag.current)
    drag.current = c
  }
  const onTrackDown = (e: RPointerEvent) => {
    e.stopPropagation()
    if (e.target !== e.currentTarget) return
    const r = e.currentTarget.getBoundingClientRect()
    const click = horizontal ? e.clientX - r.left : e.clientY - r.top
    scroll(click - (pos + len / 2))
  }

  return (
    <div
      role="scrollbar"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(a.start * 100)}
      aria-controls="schematic-canvas"
      className="absolute z-10 bg-black/5 dark:bg-white/5"
      style={horizontal ? { left: 0, bottom: 0, width: track, height: BAR } : { top: 0, right: 0, height: track, width: BAR }}
      onPointerDown={onTrackDown}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div
        className="absolute rounded-full bg-[var(--sheet-ink-2)] opacity-40 transition-opacity hover:opacity-70 active:opacity-80"
        style={horizontal ? { left: pos, top: 2, width: len, height: BAR - 4 } : { top: pos, left: 2, height: len, width: BAR - 4 }}
        onPointerDown={onThumbDown}
        onPointerMove={onThumbMove}
        onPointerUp={() => (drag.current = null)}
      />
    </div>
  )
}
