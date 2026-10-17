import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { CANVAS_CONTEXT_MENU, CONDUCTOR_CONTEXT_MENU, SYMBOL_CONTEXT_MENU, xrefContextMenu } from '@/commands/menus'
import { findObject } from '../models/geometry'
import { useActivePage, useDocumentStore } from '@/stores/documentStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToolStore } from '@/stores/toolStore'
import { useUiStore } from '@/stores/uiStore'
import { useValidationStore } from '@/stores/validationStore'
import { useCursorStore, useViewportStore } from '@/stores/viewportStore'
import type { CadPage, Point, Rect } from '@/types/cad'
import { pageSequence } from '@/utils/pages'
import { executionType } from '../models/execution'
import { addLine, addSymbol, addText, addWire, moveJunction, moveObjects, moveWireSegment, relocateJunction, resizeRails } from '../actions'
import { detachJunction, junctionHost, movePage, moveSegmentPage, railEndLimits, relocateJunctionPage, routeModeAfter, routeModeForSnap } from '../models/wireEdit'
import { CanvasScrollbars } from './CanvasScrollbars'
import { terminalLabelGroups } from '../models/labels'
import { normalizeRect, objectBounds, pageObjects, rectContains, routeOrthogonal, samePoint, simplifyPolyline, snapPoint, symbolBounds, symbolPins, TEXT_LINE } from '../models/geometry'
import { ELECTRICAL_SNAP_KINDS, resolveSnap, type SnapResult } from '../models/snap'
import { symbolDef } from '../models/symbolLibrary'
import { LINE_DASH, WEIGHT_FACTOR, WIRE_STROKE, styleResolver } from '../models/wireStyles'
import { fitPage, pageRect, panBy, scaleOf, screenToWorld, zoomAt } from '../viewport'
import { SheetFrame, XREF_H, XREF_TIP, XREF_W, xrefTip } from './SheetFrame'
import { SheetReport } from './SheetReport'
import { SymbolBody } from './SymbolGlyph'
import { SymbolLabel } from './SymbolLabel'

const STROKE = 3.5

type Resolve = ReturnType<typeof styleResolver>

/** Translucent orange off-page arrow tag; `side` is the rail end it sits on, the tip points into the rail. */
function XrefTag({ tip, y, text, side, interactive = false, selected = false }: { tip: number; y: number; text: string; side: 'left' | 'right'; interactive?: boolean; selected?: boolean }) {
  const dir = side === 'left' ? 1 : -1
  const base = tip - dir * XREF_TIP
  const back = base - dir * XREF_W
  const h = XREF_H / 2
  const d = `M${back} ${y - h} L${base} ${y - h} L${tip} ${y} L${base} ${y + h} L${back} ${y + h} Z`
  return (
    <g pointerEvents={interactive ? 'all' : 'none'}>
      <path d={d} fill={selected ? 'var(--sheet-select)' : 'var(--w-xref)'} fillOpacity={selected ? 0.22 : 0.14} stroke={selected ? 'var(--sheet-select)' : 'var(--w-xref)'} strokeOpacity={selected ? 1 : 0.6} strokeWidth={selected ? 3 : 2} strokeLinejoin="round" />
      <text x={(back + base) / 2} y={y + 8} textAnchor="middle" fontSize={21} fontWeight={600} fill="var(--w-xref-ink)" fontFamily="var(--font-mono)">
        {text}
      </text>
    </g>
  )
}


/** Constrains `to` to the nearest 45° direction from `from` (Shift while drawing graphical lines). */
function constrain45(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const step = Math.PI / 4
  const a = Math.round(Math.atan2(dy, dx) / step) * step
  const len = Math.hypot(dx, dy)
  return { x: Math.round(from.x + Math.cos(a) * len), y: Math.round(from.y + Math.sin(a) * len) }
}

const polyD = (pts: Point[]) => 'M' + pts.map((p) => `${p.x} ${p.y}`).join(' L')

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

type Gesture =
  | { kind: 'pan'; x: number; y: number }
  | { kind: 'drag'; origin: Point; ids: string[]; dx: number; dy: number; moved: boolean }
  | { kind: 'marquee'; a: Point; b: Point; additive: boolean }
  | { kind: 'segment'; wireId: string; index: number; horizontal: boolean; origin: Point; delta: number }
  | { kind: 'junction'; at: Point; snapPage: CadPage; snap: SnapResult | null }
  | { kind: 'railEnd'; railId: string; ids: string[]; end: 'x1' | 'x2'; x: number; start: number; min: number; max: number }

/** Snap-type specific cursor marker. `unit` = world units per screen pixel (clamped). */
function SnapIndicator({ snap, unit }: { snap: SnapResult; unit: number }) {
  const { x, y } = snap.point
  const r = 9 * unit
  const sw = 2 * unit
  const common = { fill: 'none', strokeWidth: sw, pointerEvents: 'none' as const }
  switch (snap.kind) {
    case 'pin':
      return <circle cx={x} cy={y} r={r * 1.5} stroke="var(--ok)" {...common} />
    case 'endpoint':
      return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} stroke="var(--ok)" {...common} />
    case 'junction':
      return (
        <g pointerEvents="none">
          <circle cx={x} cy={y} r={r * 1.4} stroke="var(--ok)" fill="none" strokeWidth={sw} />
          <circle cx={x} cy={y} r={r * 0.5} fill="var(--ok)" />
        </g>
      )
    case 'segment':
      return <path d={`M${x - r * 1.3} ${y} H${x + r * 1.3} M${x} ${y} V${y + r * 1.3}`} stroke="var(--accent)" {...common} strokeWidth={sw * 1.3} />
    case 'grid':
      return <path d={`M${x - r * 0.7} ${y} H${x + r * 0.7} M${x} ${y - r * 0.7} V${y + r * 0.7}`} stroke="var(--sheet-select)" {...common} />
    default:
      return <circle cx={x} cy={y} r={r * 0.4} fill="var(--warn)" pointerEvents="none" />
  }
}

export function SchematicCanvas() {
  const page = useActivePage()
  if (!page) return <div className="flex-1 bg-[var(--sheet-desk)]" />
  return <CanvasInner page={page} />
}

function CanvasInner({ page }: { page: CadPage }) {
  const ref = useRef<HTMLDivElement>(null)
  const doc = useDocumentStore((s) => s.document)
  const view = useViewportStore((s) => s.byPage[page.id])
  const size = useViewportStore((s) => s.size)
  const selection = useSelectionStore((s) => s.ids)
  const segment = useSelectionStore((s) => s.segment)
  const { tool, placeKind, placePoles, wireDraft, routeMode } = useToolStore()
  const settings = useSettingsStore()
  const results = useValidationStore((s) => s.results)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [hover, setHover] = useState<SnapResult | null>(null)
  const [shift, setShift] = useState(false)
  const [space, setSpace] = useState(false)
  const lastWorld = useRef<Point | null>(null)
  /** Latest rendered wire preview, so Enter commits exactly what is on screen. */
  const previewRef = useRef<Point[] | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => useViewportStore.getState().setSize(Math.round(e.contentRect.width), Math.round(e.contentRect.height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const vs = useViewportStore.getState()
    if (vs.last) vs.setView(page.id, vs.last)
  }, [page.id])

  useEffect(() => {
    if (size.w > 40 && size.h > 40 && !useViewportStore.getState().byPage[page.id]) fitPage()
  }, [page.id, size.w, size.h])

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
  }, [])

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      if (e.code === 'Space' && !e.repeat) setSpace(true)
      if (e.key === 'Shift') setShift(true)
      const t = useToolStore.getState()
      const drawing = (t.tool === 'wire' || t.tool === 'line') && t.wireDraft.length > 0
      const swallow = () => (e.preventDefault(), e.stopImmediatePropagation())
      if (t.tool === 'wire' && (e.key === 'Tab' || (e.key.toLowerCase() === 'r' && drawing && !e.ctrlKey && !e.metaKey))) {
        swallow()
        t.toggleRouteMode()
        return
      }
      if (!drawing && t.tool === 'select' && e.key.startsWith('Arrow') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const sel = useSelectionStore.getState()
        if (!sel.ids.length) return
        swallow()
        const step = e.shiftKey ? 10 : useSettingsStore.getState().gridSize
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const seg = sel.segment
        const page = useDocumentStore.getState().document?.pages.find((p) => p.id === useDocumentStore.getState().activePageId)
        const w = seg && sel.ids.length === 1 && sel.ids[0] === seg.wireId ? page?.wires.find((x) => x.id === seg.wireId) : undefined
        if (seg && w && w.points[seg.index + 1]) {
          const horizontal = w.points[seg.index].y === w.points[seg.index + 1].y
          const delta = horizontal ? dy : dx
          if (!delta) return
          const index = moveWireSegment(seg.wireId, seg.index, delta)
          useSelectionStore.getState().setSegment({ wireId: seg.wireId, index })
          return
        }
      const junction = sel.ids.length === 1 ? page?.junctions.find((j) => j.id === sel.ids[0]) : undefined
      if (page && junction) {
        const host = junctionHost(page, junction.position)
        const delta = host ? (host.axis === 'h' ? dx : dy) : 0
        if (delta) moveJunction(junction.position, delta)
        return
      }
      moveObjects(sel.ids.filter((id) => !page?.junctions.some((j) => j.id === id)), dx, dy)
      return
    }
    if (!drawing) return
      if (e.key === 'Escape') {
        swallow()
        t.setDraft([])
      } else if (t.tool === 'wire' && e.key === 'Enter') {
        swallow()
        commitWire(previewRef.current ?? t.wireDraft, null)
      } else if (t.tool === 'wire' && e.key === 'Backspace') {
        swallow()
        t.setDraft(t.wireDraft.slice(0, -1))
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false)
      if (e.key === 'Shift') setShift(false)
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const devices = useMemo(() => new Map(doc?.devices.map((d) => [d.id, d]) ?? []), [doc?.devices])
  const issues = useMemo(() => {
    const ids = new Set(pageObjects(page).map((o) => o.id))
    const m = new Map<string, 'error' | 'warning' | 'info'>()
    for (const r of results) {
      const id = r.target.id
      const symId = ids.has(id) ? id : page.symbols.find((s) => s.deviceId === id)?.id
      if (!symId) continue
      const cur = m.get(symId)
      if (cur !== 'error') m.set(symId, r.severity === 'error' ? 'error' : cur === 'warning' ? 'warning' : r.severity)
    }
    return m
  }, [results, page])

  if (!view) return <div ref={ref} className="relative flex-1 overflow-hidden bg-[var(--sheet-desk)]" />

  const s = scaleOf(view)
  const local = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const p = local(e)
    return screenToWorld(view, p.x, p.y)
  }
  /** Single source of truth for snapping: preview, indicator and commit all use this. */
  const snapOn = (pg: CadPage, w: Point, alt: boolean, electrical: boolean): SnapResult =>
    resolveSnap(pg, w, {
      scale: s,
      grid: settings.gridSize,
      gridSnap: settings.snap,
      disabled: alt,
      electrical,
      symbolName: (id) => {
        const sym = pg.symbols.find((x) => x.id === id)
        const dev = sym?.deviceId ? devices.get(sym.deviceId) : undefined
        return dev?.bmk ?? (sym ? `-${symbolDef(sym.kind).bmkPrefix}?` : '?')
      },
    })
  const snapAt = (w: Point, alt: boolean): SnapResult => snapOn(page, w, alt, tool === 'wire' || tool === 'place')

  function commitWire(points: Point[], end: SnapResult | null) {
    const t = useToolStore.getState()
    const pts = simplifyPolyline(points)
    if (pts.length >= 2) {
      const r = addWire(pts, t.wireStart, end)
      if (r && r.junctions > 0) useUiStore.getState().toast?.(`${r.junctions} Verbindungspunkt${r.junctions > 1 ? 'e' : ''} gesetzt`)
    }
    t.setDraft([])
  }

  const hitId = (t: EventTarget) => (t as Element).closest?.('[data-id]')?.getAttribute('data-id') ?? null

  const onPointerDown = (e: RPointerEvent) => {
    if (e.button === 2) return
    ref.current!.setPointerCapture(e.pointerId)
    const w = toWorld(e)
    if (e.button === 1 || tool === 'pan' || space) return setGesture({ kind: 'pan', x: e.clientX, y: e.clientY })
    if (e.button !== 0) return
    const snap = snapAt(w, e.altKey)
    const p = snap.point
    if (tool === 'wire') {
      const t = useToolStore.getState()
      if (!t.wireDraft.length) {
        const mode = routeModeForSnap(page, snap)
        if (mode) t.setRouteMode(mode)
        return t.setDraft([p], snap)
      }
      const last = t.wireDraft[t.wireDraft.length - 1]
      if (samePoint(last, p)) return
      const next = [...t.wireDraft, ...routeOrthogonal(last, p, t.routeMode)]
      if (ELECTRICAL_SNAP_KINDS.has(snap.kind)) commitWire(next, snap)
      else {
        const mode = routeModeAfter(simplifyPolyline(next))
        if (mode) t.setRouteMode(mode)
        t.setDraft(next)
      }
      return
    }
    if (tool === 'line') {
      const t = useToolStore.getState()
      if (!t.wireDraft.length) return t.setDraft([p], snap)
      const end = e.shiftKey ? constrain45(t.wireDraft[0], p) : p
      addLine(t.wireDraft[0], end)
      return t.setDraft([])
    }
    if (tool === 'place') return void addSymbol(placeKind, placePoles, settings.snap ? snapPoint(w, settings.gridSize) : p)
    if (tool === 'text') {
      return useUiStore.getState().openDialog({ type: 'prompt', title: 'Text einfügen', label: 'Text', value: '', confirmLabel: 'Einfügen', onSubmit: (v) => addText(p, v) })
    }
    const id = hitId(e.target)
    const sel = useSelectionStore.getState()
    const railEnd = (e.target as Element).closest?.('[data-rail-end]')?.getAttribute('data-rail-end')
    const rail = id && (railEnd === 'x1' || railEnd === 'x2') ? page.potentials.find((r) => r.id === id) : undefined
    if (rail && (railEnd === 'x1' || railEnd === 'x2')) {
      const rails = sel.ids.includes(rail.id) ? page.potentials.filter((r) => sel.ids.includes(r.id)) : [rail]
      const limits = rails.map((r) => ({ r, lim: railEndLimits(page, r.id, railEnd, pageRect(page.format).w)! }))
      const minDelta = Math.max(...limits.map(({ r, lim }) => lim.min - r[railEnd]))
      const maxDelta = Math.min(...limits.map(({ r, lim }) => lim.max - r[railEnd]))
      if (minDelta <= maxDelta) return setGesture({ kind: 'railEnd', railId: rail.id, ids: rails.map((r) => r.id), end: railEnd, x: rail[railEnd], start: rail[railEnd], min: rail[railEnd] + minDelta, max: rail[railEnd] + maxDelta })
    }
    const junction = id ? page.junctions.find((j) => j.id === id) : undefined
    if (junction) {
      sel.set([junction.id])
      return setGesture({ kind: 'junction', at: junction.position, snapPage: detachJunction(page, junction.position).page, snap: null })
    }
    if (id) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) return sel.toggle(id)
      const segAttr = (e.target as Element).closest?.('[data-seg]')?.getAttribute('data-seg')
      const wire = segAttr != null ? page.wires.find((x) => x.id === id) : undefined
      const groupMove = sel.ids.length > 1 && sel.ids.includes(id)
      if (wire && !groupMove && !e.altKey) {
        const index = Number(segAttr)
        const a = wire.points[index]
        const b = wire.points[index + 1]
        if (a && b) {
          sel.set([id])
          sel.setSegment({ wireId: id, index })
          return setGesture({ kind: 'segment', wireId: id, index, horizontal: a.y === b.y, origin: w, delta: 0 })
        }
      }
      const ids = sel.ids.includes(id) ? sel.ids : [id]
      if (!sel.ids.includes(id)) sel.set(ids)
      return setGesture({ kind: 'drag', origin: p, ids, dx: 0, dy: 0, moved: false })
    }
    if (!e.shiftKey) sel.clear()
    setGesture({ kind: 'marquee', a: w, b: w, additive: e.shiftKey })
  }

  const onPointerMove = (e: RPointerEvent) => {
    const w = toWorld(e)
    lastWorld.current = w
    const snapped = snapAt(w, e.altKey)
    useCursorStore.getState().set(w, snapped.point, snapped.kind === 'pin', snapped)
    if (tool === 'wire' || tool === 'place' || tool === 'line') setHover(snapped)
    if (shift !== e.shiftKey) setShift(e.shiftKey)
    if (!gesture) return
    if (gesture.kind === 'pan') {
      panBy(e.clientX - gesture.x, e.clientY - gesture.y)
      return setGesture({ ...gesture, x: e.clientX, y: e.clientY })
    }
    if (gesture.kind === 'drag') {
      const g = settings.snap ? settings.gridSize : 1
      const dx = Math.round((w.x - gesture.origin.x) / g) * g
      const dy = Math.round((w.y - gesture.origin.y) / g) * g
      if (dx !== gesture.dx || dy !== gesture.dy) setGesture({ ...gesture, dx, dy, moved: true })
      return
    }
    if (gesture.kind === 'junction') {
      const snap = snapOn(gesture.snapPage, w, e.altKey, true)
      const prev = gesture.snap
      if (!prev || !samePoint(prev.point, snap.point) || prev.kind !== snap.kind) setGesture({ ...gesture, snap })
      return
    }
    if (gesture.kind === 'railEnd') {
      const g = settings.snap ? settings.gridSize : 1
      const x = Math.min(gesture.max, Math.max(gesture.min, Math.round(w.x / g) * g))
      if (x !== gesture.x) setGesture({ ...gesture, x })
      return
    }
    if (gesture.kind === 'segment') {
      const g = settings.snap ? settings.gridSize : 1
      const raw = gesture.horizontal ? w.y - gesture.origin.y : w.x - gesture.origin.x
      const delta = Math.round(raw / g) * g
      if (delta !== gesture.delta) setGesture({ ...gesture, delta })
      return
    }
    setGesture({ ...gesture, b: w })
  }

  const onPointerUp = () => {
    if (gesture?.kind === 'drag' && gesture.moved && (gesture.dx || gesture.dy)) moveObjects(gesture.ids, gesture.dx, gesture.dy)
    if (gesture?.kind === 'junction' && gesture.snap && !samePoint(gesture.snap.point, gesture.at)) {
      const target = gesture.snap.point
      relocateJunction(gesture.at, gesture.snap)
      const st = useDocumentStore.getState()
      const moved = st.document?.pages.find((p) => p.id === st.activePageId)?.junctions.find((j) => samePoint(j.position, target))
      const sel = useSelectionStore.getState()
      if (moved) sel.set([moved.id])
      else sel.clear()
    }
    if (gesture?.kind === 'railEnd' && gesture.x !== gesture.start) resizeRails(gesture.ids, gesture.end, gesture.x - gesture.start)
    if (gesture?.kind === 'segment' && gesture.delta) {
      const index = moveWireSegment(gesture.wireId, gesture.index, gesture.delta)
      useSelectionStore.getState().setSegment({ wireId: gesture.wireId, index })
    }
    if (gesture?.kind === 'marquee') {
      const r = normalizeRect(gesture.a, gesture.b)
      if (r.w * s > 3 || r.h * s > 3) {
        const crossing = gesture.b.x < gesture.a.x
        const hit = pageObjects(page)
          .filter((o) => o.type !== 'junction')
          .filter((o) => (crossing ? intersects(r, objectBounds(o)) : rectContains(r, objectBounds(o))))
          .map((o) => o.id)
        const sel = useSelectionStore.getState()
        sel.set(gesture.additive ? [...sel.ids, ...hit] : hit)
      }
    }
    setGesture(null)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    if (tool === 'wire') return commitWire(useToolStore.getState().wireDraft, null)
    const id = hitId(e.target)
    if (id) useUiStore.getState().set({ inspectorTab: 'properties', panels: { ...useUiStore.getState().panels, inspector: true } })
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const t = useToolStore.getState()
    if (t.tool === 'wire' && t.wireDraft.length) return commitWire(t.wireDraft, null)
    if (t.tool === 'line' && t.wireDraft.length) return t.setDraft([])
    const id = hitId(e.target)
    const sel = useSelectionStore.getState()
    if (id && !sel.ids.includes(id)) sel.set([id])
    const obj = id && page ? findObject(page, id) : null
    const items = !id ? CANVAS_CONTEXT_MENU
      : obj?.type === 'text' && obj.style === 'xref' ? xrefContextMenu(id)
        : obj?.type === 'wire' || obj?.type === 'line' || obj?.type === 'potential' ? CONDUCTOR_CONTEXT_MENU
          : SYMBOL_CONTEXT_MENU
    useUiStore.getState().openContextMenu(e.clientX, e.clientY, items)
  }

  const selected = new Set(selection)
  const drag = gesture?.kind === 'drag' && (gesture.dx || gesture.dy) ? gesture : null
  const segDrag = gesture?.kind === 'segment' && gesture.delta ? gesture : null
  const junctionDrag = gesture?.kind === 'junction' && gesture.snap ? gesture : null
  const railDrag = gesture?.kind === 'railEnd' && gesture.x !== gesture.start ? gesture : null
  const basePage = railDrag ? { ...page, potentials: page.potentials.map((r) => (railDrag.ids.includes(r.id) ? { ...r, [railDrag.end]: r[railDrag.end] + railDrag.x - railDrag.start } : r)) } : page
  const shownPage = drag
    ? movePage(basePage, drag.ids, drag.dx, drag.dy)
    : segDrag
      ? moveSegmentPage(basePage, segDrag.wireId, segDrag.index, segDrag.delta).page
      : junctionDrag
        ? relocateJunctionPage(basePage, junctionDrag.at, junctionDrag.snap)
        : basePage
  const activeSeg = segDrag ? null : segment
  const draftPreview = tool === 'wire' && wireDraft.length && hover ? [...wireDraft, ...routeOrthogonal(wireDraft[wireDraft.length - 1], hover.point, routeMode)] : null
  previewRef.current = draftPreview
  const linePreview = tool === 'line' && wireDraft.length && hover ? [wireDraft[0], shift ? constrain45(wireDraft[0], hover.point) : hover.point] : null
  const hs = 1 / Math.max(s, 0.35)
  const cursor = gesture?.kind === 'pan' ? 'grabbing' : tool === 'pan' || space ? 'grab' : tool === 'select' ? 'default' : 'crosshair'

  return (
    <div
      ref={ref}
      className="relative flex-1 touch-none overflow-hidden bg-[var(--sheet-desk)] select-none"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => (useCursorStore.getState().set(null, null, false), setHover(null))}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      role="application"
      aria-label={`Stromlaufplan Seite ${page.number}: ${page.title}`}
    >
      <svg width={size.w} height={size.h} className="absolute inset-0 block" style={{ fontFamily: 'var(--font-sans)' }}>
        <g transform={`translate(${view.panX} ${view.panY}) scale(${s})`}>
          <SheetDrawing page={shownPage} selected={selected} issues={issues} s={s} tool={tool} space={space} segDrag={segDrag} activeSeg={activeSeg} junctionDrag={junctionDrag} />

          {draftPreview && (
            <g pointerEvents="none">
              <path d={polyD(draftPreview)} fill="none" stroke="var(--sheet-select)" strokeWidth={STROKE} strokeDasharray="14 8" strokeLinejoin="round" />
              {wireDraft.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={7} fill="var(--sheet-select)" />
              ))}
            </g>
          )}

          {linePreview && (
            <g pointerEvents="none">
              <path d={polyD(linePreview)} fill="none" stroke="var(--sheet-select)" strokeWidth={STROKE * 0.7} strokeDasharray="10 8" />
              <circle cx={linePreview[0].x} cy={linePreview[0].y} r={6} fill="var(--sheet-select)" />
            </g>
          )}

          {tool === 'place' && hover && (
            <g transform={`translate(${hover.point.x} ${hover.point.y})`} fill="none" stroke="var(--sheet-select)" color="var(--sheet-select)" strokeWidth={STROKE} opacity={0.65} pointerEvents="none">
              <SymbolBody kind={placeKind} poles={symbolDef(placeKind).supportsPoles ? placePoles : 1} />
            </g>
          )}

          {(tool === 'wire' || tool === 'line') && hover && <SnapIndicator snap={hover} unit={hs} />}
          {junctionDrag?.snap && <SnapIndicator snap={junctionDrag.snap} unit={hs} />}

          {gesture?.kind === 'marquee' &&
            (() => {
              const r = normalizeRect(gesture.a, gesture.b)
              const crossing = gesture.b.x < gesture.a.x
              return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--sheet-select)" fillOpacity={0.08} stroke="var(--sheet-select)" strokeWidth={1.5 / s} strokeDasharray={crossing ? `${6 / s} ${4 / s}` : undefined} pointerEvents="none" />
            })()}
        </g>
      </svg>
      {view && <CanvasScrollbars view={view} size={size} sheet={pageRect(page.format)} />}
    </div>
  )
}

export function SheetDrawing({ page, selected = new Set<string>(), issues = new Map<string, string>(), s = 1, tool = '', space = true, segDrag = null, activeSeg = null, junctionDrag = null, clean = false }: { page: CadPage; selected?: Set<string>; issues?: Map<string, string>; s?: number; tool?: string; space?: boolean; segDrag?: { wireId: string } | null; activeSeg?: { wireId: string; index: number } | null; junctionDrag?: unknown; clean?: boolean }) {
 const doc = useDocumentStore(state => state.document)
 const project = useProjectStore(state => state.current)
 const settings = useSettingsStore()
 const devices = new Map(doc?.devices.map(d => [d.id, d]))
 const shownPage = page
 const numberOnly = terminalLabelGroups(page)
 const offset = (_id: string): string | undefined => undefined
 const selColor = 'var(--sheet-select)'
 const ink = 'var(--sheet-ink)'
  const hitW = 10 / s
  const resolve: Resolve = useMemo(() => styleResolver(doc), [doc?.potentialDefs, doc?.wirePresets])
  const strokeOf = (st: ReturnType<Resolve>) => (settings.mono ? ink : WIRE_STROKE[st.color])
 return <>
          <g style={{ filter: 'drop-shadow(0 2px 10px rgb(0 0 0 / 0.18))' }}>
            <SheetFrame page={page} project={project} pageIndex={doc ? pageSequence(doc, page.id) : 1} pageCount={doc?.pages.length ?? 1} grid={settings.gridSize} showGrid={!clean && settings.showGrid} guides={!clean && settings.guides} />
          {doc && <SheetReport page={page} doc={doc} project={project} />}
          </g>

          {shownPage.potentials.map((p) => {
            const sel = selected.has(p.id)
            const st = resolve(p, p.name)
            const col = strokeOf(st)
            const label = p.label?.trim() || p.name
            const tipL = p.xrefLeft ? xrefTip('left', p.x1, page.format) : p.x1
            const tipR = p.xrefRight ? xrefTip('right', p.x2, page.format) : p.x2
            return (
              <g key={p.id} data-id={p.id} transform={offset(p.id)}>
                <path d={`M${p.x1} ${p.y} H${p.x2}`} stroke="transparent" strokeWidth={hitW * 2} />
                <path d={`M${p.x1} ${p.y} H${p.x2}`} stroke={sel ? selColor : col} strokeWidth={(sel ? STROKE * 1.8 : STROKE * 1.3) * WEIGHT_FACTOR[st.weight]} strokeDasharray={LINE_DASH[st.lineStyle]} />
                <text x={Math.max(p.x1, tipL) + 10} y={p.y - 10} fontSize={24} fontWeight={500} fill={sel ? selColor : col}>
                  {label}
                </text>
                <text x={Math.min(p.x2, tipR) - 10} y={p.y - 10} textAnchor="end" fontSize={24} fontWeight={500} fill={sel ? selColor : col}>
                  {label}
                </text>
                {p.xrefLeft && <XrefTag tip={tipL} y={p.y} text={p.xrefLeft} side="left" />}
                {p.xrefRight && <XrefTag tip={tipR} y={p.y} text={p.xrefRight} side="right" />}
                {sel && !clean &&
                  (['x1', 'x2'] as const).map((end) => {
                    const hsz = 9 / Math.max(s, 0.35)
                    return (
                      <g key={end} data-rail-end={end} style={{ cursor: 'ew-resize' }}>
                        <rect x={p[end] - hsz * 2} y={p.y - hsz * 2} width={hsz * 4} height={hsz * 4} fill="transparent" />
                        <rect x={p[end] - hsz} y={p.y - hsz} width={hsz * 2} height={hsz * 2} fill="var(--sheet-paper, white)" stroke={selColor} strokeWidth={hsz * 0.35} />
                      </g>
                    )
                  })}
              </g>
            )
          })}

          {shownPage.lines.map((l) => {
            const sel = selected.has(l.id)
            const d = polyD(l.points)
            return (
              <g key={l.id} data-id={l.id} transform={offset(l.id)}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={hitW * 2} />
                <path d={d} fill="none" stroke={sel ? selColor : 'var(--sheet-ink-2)'} strokeWidth={sel ? STROKE * 1.4 : STROKE * 0.7} strokeDasharray={LINE_DASH[l.style]} strokeLinecap="round" />
              </g>
            )
          })}

          {shownPage.wires.map((w) => {
            const sel = selected.has(w.id)
            const d = 'M' + w.points.map((p) => `${p.x} ${p.y}`).join(' L')
            const segIdx = segDrag && segDrag.wireId === w.id ? null : activeSeg?.wireId === w.id ? activeSeg.index : null
            const sa = segIdx != null ? w.points[segIdx] : undefined
            const sb = segIdx != null ? w.points[segIdx + 1] : undefined
            const st = resolve(w, w.potential)
            return (
              <g key={w.id} data-id={w.id}>
                <path d={d} fill="none" stroke={sel ? selColor : strokeOf(st)} strokeWidth={(sel ? STROKE * 1.8 : STROKE) * WEIGHT_FACTOR[st.weight]} strokeDasharray={LINE_DASH[st.lineStyle]} strokeLinejoin="round" strokeOpacity={sel && sa ? 0.55 : 1} />
                {sa && sb && <path d={`M${sa.x} ${sa.y} L${sb.x} ${sb.y}`} stroke={selColor} strokeWidth={STROKE * 3} strokeLinecap="round" pointerEvents="none" />}
                {w.points.slice(0, -1).map((a, i) => {
                  const b = w.points[i + 1]
                  const horizontal = a.y === b.y
                  return (
                    <path
                      key={i}
                      data-seg={i}
                      d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
                      stroke="transparent"
                      strokeWidth={hitW * 2}
                      style={{ cursor: tool === 'select' ? (horizontal ? 'ns-resize' : 'ew-resize') : undefined }}
                    />
                  )
                })}
              </g>
            )
          })}

          {shownPage.symbols.map((sym) => {
            const sel = selected.has(sym.id)
            const dev = sym.deviceId ? devices.get(sym.deviceId) : undefined
            const b = symbolBounds(sym)
            const issue = issues.get(sym.id)
            const color = sel ? selColor : ink
            const wp = symbolPins(sym)
            return (
              <g key={sym.id} data-id={sym.id} transform={offset(sym.id)}>
                <rect x={b.x - 12} y={b.y - 12} width={b.w + 24} height={b.h + 24} fill="transparent" />
                {sel && <rect x={b.x - 18} y={b.y - 18} width={b.w + 36} height={b.h + 36} fill="var(--sheet-select)" fillOpacity={0.07} stroke={selColor} strokeWidth={2 / (s > 1 ? 1 : s) * 0.8} strokeDasharray="10 8" />}
                <g transform={`translate(${sym.position.x} ${sym.position.y}) rotate(${sym.rotation})`} fill="none" stroke={color} color={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
                  <SymbolBody kind={sym.kind} poles={sym.poles} />
                </g>
                {wp.map((p) => (
                  <text key={p.pinId} x={p.x + 10} y={p.y + (p.y < sym.position.y ? 24 : -10)} fontSize={18} fill="var(--sheet-ink-2)" fontFamily="var(--font-mono)" pointerEvents="none">
                    {p.pinId}
                  </text>
                ))}
                {!(sym.kind === 'outlet' && !dev) && <SymbolLabel
                  rotated={sym.labelRotation === 90}
                  numberOnly={numberOnly.has(sym.id)}
                  x={b.x - 22}
                  y={sym.position.y}
                  top={b.y}
                  bmk={dev?.bmk ?? `-${symbolDef(sym.kind).bmkPrefix}?`}
                  terminalNo={sym.kind === 'terminal' ? sym.terminalNo : undefined}
                  spec={executionType(dev, sym.kind, sym.poles)}
                  fn={dev?.function}
                  color={sel ? selColor : dev ? ink : 'var(--error)'}
                />}
                {issue && (
                  <g transform={`translate(${b.x + b.w + 6} ${b.y - 6})`} pointerEvents="none">
                    <circle r={16} fill={issue === 'error' ? 'var(--error)' : issue === 'warning' ? 'var(--warn)' : 'var(--accent)'} />
                    <text y={8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#fff">
                      !
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Junctions sit above symbols so pin junctions stay grabbable despite the symbol hit area. */}
          {shownPage.junctions.map((j) => {
            const sel = selected.has(j.id)
            const editable = tool === 'select' && !space
            return (
              <g key={j.id} data-id={j.id} style={{ cursor: editable ? (junctionDrag ? 'grabbing' : 'move') : undefined }} pointerEvents={editable ? undefined : 'none'}>
                <title>Klemmpunkt – ziehen, um ihn auf eine andere Leitung, Klemme oder Anschluss umzusetzen (Pfeiltasten: entlang der Leitung)</title>
                <circle cx={j.position.x} cy={j.position.y} r={Math.max(14, 12 / s)} fill="transparent" />
                {sel && <circle cx={j.position.x} cy={j.position.y} r={16} fill="none" stroke={selColor} strokeWidth={3} />}
                <circle cx={j.position.x} cy={j.position.y} r={9} fill={sel ? selColor : ink} />
              </g>
            )
          })}

          {shownPage.texts.map((t) => {
            const sel = selected.has(t.id)
            if (t.style === 'xref') return (
              <g key={t.id} data-id={t.id} transform={offset(t.id)} style={{ cursor: 'move' }}>
                <title>Querverweis – ziehen zum Verschieben, Rechtsklick für „Gehe zu“</title>
                <XrefTag tip={t.position.x} y={t.position.y} text={t.text} side={t.xref?.side ?? 'right'} interactive selected={sel} />
                <circle cx={t.position.x} cy={t.position.y} r={sel ? 10 : 5} fill={sel ? selColor : 'var(--w-xref)'} />
              </g>
            )
            const fill = sel ? selColor : t.size >= 4 ? ink : 'var(--sheet-ink-2)'
            return (
              <text key={t.id} data-id={t.id} transform={offset(t.id)} x={t.position.x} y={t.position.y} fontSize={t.size} textAnchor={t.anchor} fontWeight={t.size >= 4 ? 600 : 400} fill={fill} fontFamily={undefined} textDecoration={sel ? 'underline' : undefined}>
                {t.text.split('\n').map((line, i) => (
                  <tspan key={i} x={t.position.x} dy={i === 0 ? 0 : t.size * TEXT_LINE}>
                    {line || ' '}
                  </tspan>
                ))}
              </text>
            )
          })}


</>
}
