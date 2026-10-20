import type { Point, Rect } from '@/types/cad'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const RESIZE_HANDLES: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}

export const isResizeHandle = (v: unknown): v is ResizeHandle => typeof v === 'string' && (RESIZE_HANDLES as readonly string[]).includes(v)

export function handlePoint(r: Rect, h: ResizeHandle): Point {
  const x = h.includes('w') ? r.x : h.includes('e') ? r.x + r.w : r.x + r.w / 2
  const y = h.includes('n') ? r.y : h.includes('s') ? r.y + r.h : r.y + r.h / 2
  return { x, y }
}

/**
 * Moves the edges addressed by `h` to `p`; the opposite edges stay fixed.
 * Edges cannot cross – the box keeps at least `min` world units per axis.
 */
export function resizeRect(r: Rect, h: ResizeHandle, p: Point, min = 1): Rect {
  let x1 = r.x
  let y1 = r.y
  let x2 = r.x + r.w
  let y2 = r.y + r.h
  if (h.includes('w')) x1 = Math.min(p.x, x2 - min)
  if (h.includes('e')) x2 = Math.max(p.x, x1 + min)
  if (h.includes('n')) y1 = Math.min(p.y, y2 - min)
  if (h.includes('s')) y2 = Math.max(p.y, y1 + min)
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export const sameRect = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
