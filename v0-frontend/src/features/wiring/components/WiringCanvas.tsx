import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { SYMBOL_CONTEXT_MENU } from '@/commands/menus'
import { useActivePage } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToolStore } from '@/stores/toolStore'
import { useUiStore } from '@/stores/uiStore'
import { useCursorStore, useViewportStore } from '@/stores/viewportStore'
import type { CadPage, Point, Rect } from '@/types/cad'
import { constrain45, normalizeRect, polylinePath, rectContains } from '@/features/drawing/geometry'
import { HANDLE_CURSORS, handlePoint, isResizeHandle, RESIZE_HANDLES, resizeRect, sameRect, type ResizeHandle } from '@/features/drawing/resize'
import { resolveGraphicSnap, type GraphicSnap } from '@/features/drawing/snap'
import { scaleOf, screenToWorld } from '@/features/drawing/viewport'
import { pageRect, panBy } from '@/features/drawing/viewportActions'
import { useViewportHost } from '@/features/drawing/useViewportHost'
import { CanvasScrollbars } from '@/features/drawing/components/CanvasScrollbars'
import { SnapIndicator } from '@/features/drawing/components/SnapIndicator'
import { addEllipse, addPolyline, addRectangle, addWiringText, moveWiringObjects, resizeShape } from '../actions'
import { findShape, graphicAnchors, graphicBounds, MIN_SHAPE_SIZE, resizeShapeOnPage, shapeBox, translateGraphics, wiringGraphics } from '../models/shapes'
import { WIRING_TOOLS } from '../profile'
import { WiringDrawing } from './WiringDrawing'

const PREVIEW = 'var(--sheet-select)'
const HANDLE_PX = 8

type Gesture =
  | { kind: 'pan'; x: number; y: number }
  | { kind: 'drag'; origin: Point; ids: string[]; dx: number; dy: number }
  | { kind: 'marquee'; a: Point; b: Point; additive: boolean }
  | { kind: 'resize'; id: string; handle: ResizeHandle; start: Rect; rect: Rect; snap: GraphicSnap | null }

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))

export function WiringCanvas() {
  const page = useActivePage()
  if (!page) return <div className="flex-1 bg-[var(--sheet-desk)]" />
  return <WiringCanvasInner page={page} />
}

function WiringCanvasInner({ page }: { page: CadPage }) {
  const ref = useRef<HTMLDivElement>(null)
  useViewportHost(ref, page.id)
  const view = useViewportStore((s) => s.byPage[page.id])
  const size = useViewportStore((s) => s.size)
  const selection = useSelectionStore((s) => s.ids)
  const rawTool = useToolStore((s) => s.tool)
  const draft = useToolStore((s) => s.wireDraft)
  const gridSize = useSettingsStore((s) => s.gridSize)
  const gridSnap = useSettingsStore((s) => s.snap)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [hover, setHover] = useState<GraphicSnap | null>(null)
  const [space, setSpace] = useState(false)
  const tool = WIRING_TOOLS.has(rawTool) ? rawTool : 'select'

  useEffect(() => {
    if (!WIRING_TOOLS.has(useToolStore.getState().tool)) useToolStore.getState().setTool('select')
  }, [rawTool])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      if (e.code === 'Space' && !e.repeat) setSpace(true)
      const t = useToolStore.getState()
      const swallow = () => (e.preventDefault(), e.stopImmediatePropagation())
      if (e.key === 'Escape') {
        setGesture((g) => (g && g.kind !== 'pan' ? (swallow(), null) : g))
        if (t.wireDraft.length) (swallow(), t.setDraft([]))
        return
      }
      if (t.tool === 'line' && t.wireDraft.length) {
        if (e.key === 'Enter') {
          swallow()
          addPolyline(t.wireDraft)
          t.setDraft([])
        } else if (e.key === 'Backspace') {
          swallow()
          t.setDraft(t.wireDraft.slice(0, -1))
        }
        return
      }
      if (t.tool === 'select' && e.key.startsWith('Arrow') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ids = useSelectionStore.getState().ids
        if (!ids.length) return
        swallow()
        const step = e.shiftKey ? 10 : useSettingsStore.getState().gridSize
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        moveWiringObjects(ids, dx, dy)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false)
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up)
    }
  }, [])

  if (!view) return <div ref={ref} className="relative flex-1 overflow-hidden bg-[var(--sheet-desk)]" />

  const s = scaleOf(view)
  const unit = 1 / Math.max(s, 0.35)
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    return screenToWorld(view, e.clientX - r.left, e.clientY - r.top)
  }

  /** Single source of truth: indicator, preview and commit all use the point returned here. */
  const resolvePoint = (w: Point, e: { altKey: boolean; shiftKey: boolean }, exclude?: string): GraphicSnap => {
    const lines = exclude ? { ...page, lines: page.lines.filter((l) => l.id !== exclude) } : page
    const snap = resolveGraphicSnap(w, { scale: s, grid: gridSize, gridSnap, disabled: e.altKey, anchors: graphicAnchors(lines, tool === 'line' ? draft : []) })
    const last = draft[draft.length - 1]
    if (tool === 'line' && last && e.shiftKey) return { ...snap, point: constrain45(last, snap.point) }
    return snap
  }

  const hitId = (t: EventTarget) => (t as Element).closest?.('[data-id]')?.getAttribute('data-id') ?? null

  const onPointerDown = (e: RPointerEvent) => {
    if (e.button === 2) return
    ref.current!.setPointerCapture(e.pointerId)
    const w = toWorld(e)
    if (e.button === 1 || tool === 'pan' || space) return setGesture({ kind: 'pan', x: e.clientX, y: e.clientY })
    if (e.button !== 0) return
    const t = useToolStore.getState()
    const p = resolvePoint(w, e).point

    if (tool === 'line') return t.setDraft([...t.wireDraft, p])
    if (tool === 'rect' || tool === 'ellipse') {
      if (!t.wireDraft.length) return t.setDraft([p])
      ;(tool === 'rect' ? addRectangle : addEllipse)(t.wireDraft[0], p)
      return t.setDraft([])
    }
    if (tool === 'text') {
      return useUiStore.getState().openDialog({ type: 'prompt', title: 'Text einfügen', label: 'Text', value: '', confirmLabel: 'Einfügen', onSubmit: (v) => addWiringText(p, v) })
    }

    const sel = useSelectionStore.getState()
    const handle = (e.target as Element).closest?.('[data-handle]')?.getAttribute('data-handle')
    const shape = sel.ids.length === 1 ? findShape(page, sel.ids[0]) : undefined
    if (shape && isResizeHandle(handle)) {
      const start = shapeBox(shape)
      return setGesture({ kind: 'resize', id: shape.id, handle, start, rect: start, snap: null })
    }
    const id = hitId(e.target)
    if (id) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) return sel.toggle(id)
      const ids = sel.ids.includes(id) ? sel.ids : [id]
      if (!sel.ids.includes(id)) sel.set(ids)
      return setGesture({ kind: 'drag', origin: w, ids, dx: 0, dy: 0 })
    }
    if (!e.shiftKey) sel.clear()
    setGesture({ kind: 'marquee', a: w, b: w, additive: e.shiftKey })
  }

  const onPointerMove = (e: RPointerEvent) => {
    const w = toWorld(e)
    const snap = resolvePoint(w, e)
    useCursorStore.getState().set(w, snap.point, false)
    setHover(tool === 'line' || tool === 'rect' || tool === 'ellipse' ? snap : null)
    if (!gesture) return
    if (gesture.kind === 'pan') {
      panBy(e.clientX - gesture.x, e.clientY - gesture.y)
      return setGesture({ ...gesture, x: e.clientX, y: e.clientY })
    }
    if (gesture.kind === 'drag') {
      const g = gridSnap && !e.altKey ? gridSize : 1
      const dx = Math.round((w.x - gesture.origin.x) / g) * g
      const dy = Math.round((w.y - gesture.origin.y) / g) * g
      if (dx !== gesture.dx || dy !== gesture.dy) setGesture({ ...gesture, dx, dy })
      return
    }
    if (gesture.kind === 'resize') {
      const rs = resolvePoint(w, e)
      const rect = resizeRect(gesture.start, gesture.handle, rs.point, MIN_SHAPE_SIZE)
      if (!sameRect(rect, gesture.rect) || gesture.snap?.kind !== rs.kind) setGesture({ ...gesture, rect, snap: rs })
      return
    }
    setGesture({ ...gesture, b: w })
  }

  const onPointerUp = () => {
    if (gesture?.kind === 'drag' && (gesture.dx || gesture.dy)) moveWiringObjects(gesture.ids, gesture.dx, gesture.dy)
    if (gesture?.kind === 'resize' && !sameRect(gesture.rect, gesture.start)) resizeShape(gesture.id, gesture.rect)
    if (gesture?.kind === 'marquee') {
      const r = normalizeRect(gesture.a, gesture.b)
      if (r.w * s > 3 || r.h * s > 3) {
        const crossing = gesture.b.x < gesture.a.x
        const hit = wiringGraphics(page)
          .filter((o) => (crossing ? intersects(r, graphicBounds(o)) : rectContains(r, graphicBounds(o))))
          .map((o) => o.id)
        const sel = useSelectionStore.getState()
        sel.set(gesture.additive ? [...new Set([...sel.ids, ...hit])] : hit)
      }
    }
    setGesture(null)
  }

  const finishLine = () => {
    const t = useToolStore.getState()
    addPolyline(t.wireDraft)
    t.setDraft([])
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    if (tool === 'line') return finishLine()
    if (hitId(e.target)) useUiStore.getState().set({ inspectorTab: 'properties', panels: { ...useUiStore.getState().panels, inspector: true } })
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const t = useToolStore.getState()
    if (t.tool === 'line' && t.wireDraft.length) return finishLine()
    if ((t.tool === 'rect' || t.tool === 'ellipse') && t.wireDraft.length) return t.setDraft([])
    const id = hitId(e.target)
    if (!id) return
    const sel = useSelectionStore.getState()
    if (!sel.ids.includes(id)) sel.set([id])
    useUiStore.getState().openContextMenu(e.clientX, e.clientY, SYMBOL_CONTEXT_MENU)
  }

  const selected = new Set(selection)
  const shownPage =
    gesture?.kind === 'drag' && (gesture.dx || gesture.dy)
      ? translateGraphics(page, gesture.ids, gesture.dx, gesture.dy)
      : gesture?.kind === 'resize'
        ? resizeShapeOnPage(page, gesture.id, gesture.rect)
        : page
  const selectedShape = tool === 'select' && selection.length === 1 ? findShape(shownPage, selection[0]) : undefined
  const linePreview = tool === 'line' && draft.length ? (hover ? [...draft, hover.point] : draft) : null
  const shapePreview = (tool === 'rect' || tool === 'ellipse') && draft.length && hover ? normalizeRect(draft[0], hover.point) : null
  const cursor = gesture?.kind === 'pan' ? 'grabbing' : tool === 'pan' || space ? 'grab' : gesture?.kind === 'resize' ? HANDLE_CURSORS[gesture.handle] : tool === 'select' ? 'default' : 'crosshair'

  return (
    <div
      ref={ref}
      className="relative flex-1 touch-none overflow-hidden bg-[var(--sheet-desk)] select-none"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setGesture(null)}
      onPointerLeave={() => (useCursorStore.getState().set(null, null, false), setHover(null))}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      role="application"
      aria-label={`Verkabelungsschema Seite ${page.number}: ${page.title}`}
    >
      <svg width={size.w} height={size.h} className="absolute inset-0 block" style={{ fontFamily: 'var(--font-sans)' }}>
        <g transform={`translate(${view.panX} ${view.panY}) scale(${s})`}>
          <WiringDrawing page={shownPage} selected={selected} s={s} />

          {selectedShape && (
            <g>
              {(() => {
                const box = shapeBox(selectedShape)
                const hs = HANDLE_PX * unit
                return (
                  <>
                    <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={PREVIEW} strokeWidth={1.2 * unit} strokeDasharray={`${6 * unit} ${4 * unit}`} pointerEvents="none" />
                    {RESIZE_HANDLES.map((h) => {
                      const p = handlePoint(box, h)
                      return (
                        <g key={h} data-handle={h} style={{ cursor: HANDLE_CURSORS[h] }}>
                          <rect x={p.x - hs} y={p.y - hs} width={hs * 2} height={hs * 2} fill="transparent" />
                          <rect x={p.x - hs / 2} y={p.y - hs / 2} width={hs} height={hs} fill="var(--sheet-paper, white)" stroke={PREVIEW} strokeWidth={1.5 * unit} />
                        </g>
                      )
                    })}
                  </>
                )
              })()}
            </g>
          )}

          {linePreview && linePreview.length > 0 && (
            <g pointerEvents="none">
              {linePreview.length > 1 && <path d={polylinePath(linePreview)} fill="none" stroke={PREVIEW} strokeWidth={2.5} strokeDasharray="10 8" strokeLinejoin="round" />}
              {draft.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4 * unit} fill={PREVIEW} />
              ))}
            </g>
          )}

          {shapePreview &&
            (tool === 'rect' ? (
              <rect x={shapePreview.x} y={shapePreview.y} width={shapePreview.w} height={shapePreview.h} fill="none" stroke={PREVIEW} strokeWidth={2.5} strokeDasharray="10 8" pointerEvents="none" />
            ) : (
              <ellipse cx={shapePreview.x + shapePreview.w / 2} cy={shapePreview.y + shapePreview.h / 2} rx={shapePreview.w / 2} ry={shapePreview.h / 2} fill="none" stroke={PREVIEW} strokeWidth={2.5} strokeDasharray="10 8" pointerEvents="none" />
            ))}

          {hover && <SnapIndicator snap={hover} unit={unit} />}
          {gesture?.kind === 'resize' && gesture.snap && <SnapIndicator snap={gesture.snap} unit={unit} />}

          {gesture?.kind === 'marquee' &&
            (() => {
              const r = normalizeRect(gesture.a, gesture.b)
              const crossing = gesture.b.x < gesture.a.x
              return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={PREVIEW} fillOpacity={0.08} stroke={PREVIEW} strokeWidth={1.5 / s} strokeDasharray={crossing ? `${6 / s} ${4 / s}` : undefined} pointerEvents="none" />
            })()}
        </g>
      </svg>
      <CanvasScrollbars view={view} size={size} sheet={pageRect(page)} />
    </div>
  )
}
