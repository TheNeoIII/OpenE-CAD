import type { CadViewportState, Point, Rect } from '@/types/cad'

/** Screen pixels per world unit (0.1 mm) at zoom 1, i.e. 96 dpi. */
export const BASE_SCALE = 96 / 25.4 / 10
export const MIN_ZOOM = 0.08
export const MAX_ZOOM = 8

export const scaleOf = (v: CadViewportState) => v.zoom * BASE_SCALE

export const screenToWorld = (v: CadViewportState, sx: number, sy: number): Point => {
  const s = scaleOf(v)
  return { x: (sx - v.panX) / s, y: (sy - v.panY) / s }
}

export const worldToScreen = (v: CadViewportState, p: Point): Point => {
  const s = scaleOf(v)
  return { x: p.x * s + v.panX, y: p.y * s + v.panY }
}

/** Converts a constant on-screen distance into world units at the given screen scale. */
export const screenToWorldTolerance = (px: number, scale: number) => px / scale

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export function fitRect(rect: Rect, size: { w: number; h: number }, padding = 32, mode: 'contain' | 'width' = 'contain'): CadViewportState {
  const zx = (size.w - padding * 2) / (rect.w * BASE_SCALE)
  const zy = (size.h - padding * 2) / (rect.h * BASE_SCALE)
  const zoom = clampZoom(mode === 'width' ? zx : Math.min(zx, zy))
  const s = zoom * BASE_SCALE
  return {
    zoom,
    panX: (size.w - rect.w * s) / 2 - rect.x * s,
    panY: mode === 'width' ? padding - rect.y * s : (size.h - rect.h * s) / 2 - rect.y * s,
  }
}
