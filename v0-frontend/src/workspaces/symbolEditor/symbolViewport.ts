import { BASE_SCALE, MAX_ZOOM, MIN_ZOOM, clampZoom, fitRect, screenToWorld } from '@/features/drawing/viewport'
import type { CadViewportState, Point, Rect } from '@/types/cad'

/**
 * Symbol editor camera. Same contract as the page editors: world units
 * (1 mm = 10), `zoom` 1 = 100 % = 96 dpi (BASE_SCALE), pan in screen pixels.
 */
export type SymbolView = CadViewportState
export type ViewSize = { w: number; h: number }

export const SYMBOL_ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 6] as const
export const SYMBOL_FIT_PADDING_PX = 48
/** Tiny symbols are not blown up beyond this when fitted. */
export const SYMBOL_FIT_MAX_ZOOM = 4
/** Fit never frames less than 20 mm, so a single pin does not hit max zoom. */
export const SYMBOL_FIT_MIN_SPAN = 200

export const viewScale = (view: SymbolView) => view.zoom * BASE_SCALE

export function centerViewAt(center: Point, zoom: number, size: ViewSize): SymbolView {
  const z = clampZoom(zoom)
  const s = z * BASE_SCALE
  return { zoom: z, panX: size.w / 2 - center.x * s, panY: size.h / 2 - center.y * s }
}

/** Frames symbol bounds (shapes + pins) centered with screen padding and a sane zoom clamp. */
export function fitSymbol(bounds: Rect, size: ViewSize): SymbolView {
  const w = Math.max(bounds.w, SYMBOL_FIT_MIN_SPAN)
  const h = Math.max(bounds.h, SYMBOL_FIT_MIN_SPAN)
  const rect = { x: bounds.x + bounds.w / 2 - w / 2, y: bounds.y + bounds.h / 2 - h / 2, w, h }
  const padding = Math.min(SYMBOL_FIT_PADDING_PX, size.w / 4, size.h / 4)
  const fit = fitRect(rect, size, padding)
  if (fit.zoom <= SYMBOL_FIT_MAX_ZOOM) return fit
  return centerViewAt({ x: rect.x + w / 2, y: rect.y + h / 2 }, SYMBOL_FIT_MAX_ZOOM, size)
}

/** Zooms so the world point under `anchor` (screen px) stays under the cursor. */
export function zoomViewAt(view: SymbolView, zoom: number, anchor: Point): SymbolView {
  const z = clampZoom(zoom)
  const world = screenToWorld(view, anchor.x, anchor.y)
  const s = z * BASE_SCALE
  return { zoom: z, panX: anchor.x - world.x * s, panY: anchor.y - world.y * s }
}

export function visibleWorldRect(view: SymbolView, size: ViewSize): Rect {
  const s = viewScale(view)
  return { x: -view.panX / s, y: -view.panY / s, w: size.w / s, h: size.h / s }
}

const overlaps = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h

/** A stored view is only reused when it is finite, in zoom range and still shows part of the symbol. */
export function isViewUsable(view: SymbolView | undefined, bounds: Rect, size: ViewSize): view is SymbolView {
  if (!view || ![view.zoom, view.panX, view.panY].every(Number.isFinite)) return false
  if (view.zoom < MIN_ZOOM || view.zoom > MAX_ZOOM) return false
  return overlaps(visibleWorldRect(view, size), bounds)
}

/** Per-symbol view sessions, keyed by document + symbol variant. Never shared across symbols. */
const sessions = new Map<string, SymbolView>()

export const saveSymbolView = (key: string, view: SymbolView) => void sessions.set(key, view)
export const symbolViewSession = (key: string) => sessions.get(key)
export const clearSymbolViewSessions = () => sessions.clear()

/** Restores the symbol's own session if usable, otherwise fits the symbol (first open, new, duplicate, import). */
export function resolveSymbolView(key: string, bounds: Rect, size: ViewSize): SymbolView {
  const saved = sessions.get(key)
  const view = isViewUsable(saved, bounds, size) ? saved : fitSymbol(bounds, size)
  sessions.set(key, view)
  return view
}
