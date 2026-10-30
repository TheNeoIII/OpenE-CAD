import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { GRAPHIC_CONTEXT_MENU } from '@/commands/menus'
import { useActivePage } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToolStore } from '@/stores/toolStore'
import { useUiStore } from '@/stores/uiStore'
import { useCursorStore, useViewportStore } from '@/stores/viewportStore'
import type { CadConnection, CadConnectionEndpoint, CadPage, Point, Rect } from '@/types/cad'
import { addConnection, updateConnection } from '../actions'
import { connectionBounds, connectionEndpointAt, moveBoundConnectionSegment, resolveConnectionEndpoint } from '../models/connections'
import { ConnectionHandles, WiringConnection } from './WiringConnection'
import { normalizeRect, polylinePath, rectContains } from '@/features/drawing/geometry'
import { HANDLE_CURSORS, handlePoint, isResizeHandle, RESIZE_HANDLES, resizeRect, sameRect, type ResizeHandle } from '@/features/drawing/resize'
import { resolveConstrainedLinePoint, resolveGraphicSnap, type GraphicSnap } from '@/features/drawing/snap'
import { scaleOf, screenToWorld } from '@/features/drawing/viewport'
import { pageRect, panBy } from '@/features/drawing/viewportActions'
import { useViewportHost } from '@/features/drawing/useViewportHost'
import { CanvasScrollbars } from '@/features/drawing/components/CanvasScrollbars'
import { SnapIndicator } from '@/features/drawing/components/SnapIndicator'
import { addDiagramBlock, addPort, updatePort, addEllipse, addPolyline, addRectangle, applyInlineEdit, moveLineVertex, moveWiringObjects, resizeShape } from '../actions'
import { findShape, graphicAnchors, graphicBounds, MIN_SHAPE_SIZE, moveLineVertexOnPage, resizeShapeOnPage, shapeBox, translateGraphics, wiringGraphics } from '../models/shapes'
import { WIRING_TOOLS } from '../profile'
import { WiringDrawing } from './WiringDrawing'
import { WiringInlineEditor } from './WiringInlineEditor'
import type { InlineEditTarget } from '../models/inlineEdit'
import { escapeAction, toolMatchesType, toolPointerIntent } from '../models/interaction'

import { nearestPortAnchor, portOwnerBounds, portWorldPosition, selectedPortOwner, updatePortOnPage, wiringPortAnchors } from '../models/ports'
import { WiringPorts } from './WiringPorts'

const PREVIEW = 'var(--sheet-select)'
const HANDLE_PX = 8

type Gesture =
  | { kind: 'connect'; origin: Point; dragged: boolean }
  | { kind: 'connection'; original: CadConnection; next: CadConnection; endpoint?: 'start' | 'end'; segment?: number }
  | { kind: 'portMove'; objectId: string; portId: string; anchor: ReturnType<typeof nearestPortAnchor> }
  | { kind: 'portCreate'; objectId: string; anchor: ReturnType<typeof nearestPortAnchor> }
  | { kind: 'shapeCreate'; shape: 'rectangle' | 'ellipse' | 'diagramBlock'; start: Point; end: Point; snap: GraphicSnap }
  | { kind: 'pan'; x: number; y: number }
  | { kind: 'drag'; origin: Point; ids: string[]; dx: number; dy: number }
  | { kind: 'marquee'; a: Point; b: Point; additive: boolean }
  | { kind: 'resize'; id: string; handle: ResizeHandle; start: Rect; rect: Rect; snap: GraphicSnap | null }
  | { kind: 'vertex'; lineId: string; index: number; start: Point; point: Point; snap: GraphicSnap | null }

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
  const [gesture, renderGesture] = useState<Gesture | null>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const pointerId = useRef<number | null>(null)
  const setGesture = (next: Gesture | null) => {
    gestureRef.current = next
    renderGesture(next)
    if (!next) {
      const captured = pointerId.current
      pointerId.current = null
      setHover(null)
      setPortHover(null)
      setConnectionTarget(null)
      if (captured !== null && ref.current?.hasPointerCapture(captured)) ref.current.releasePointerCapture(captured)
    }
  }

  const [connectionDraft, renderConnectionDraft] = useState<CadConnection | null>(null)
  const connectionDraftRef = useRef<CadConnection | null>(null)
  const setConnectionDraft = (next: CadConnection | null) => { connectionDraftRef.current = next; renderConnectionDraft(next) }
  const [editing, setEditing] = useState<InlineEditTarget | null>(null)
  useEffect(() => { setGesture(null); setConnectionDraft(null) }, [rawTool, page.id])
  useEffect(() => { setEditing(null) }, [page.id])
  const [hover, setHover] = useState<GraphicSnap | null>(null)
  const [connectionTarget, setConnectionTarget] = useState<CadConnectionEndpoint | null>(null)
  const [space, setSpace] = useState(false)
  const [portHover, setPortHover] = useState<ReturnType<typeof nearestPortAnchor> | null>(null)
  const portOwner = selectedPortOwner(page, selection)
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
        const sel = useSelectionStore.getState()
        if (!gestureRef.current && connectionDraftRef.current) { swallow(); setConnectionDraft(null); return }
        // The inline editor handles its own Escape (it lives in a textarea, filtered by typing()).
        const action = escapeAction({ editing: false, gesture: !!gestureRef.current, drafting: t.wireDraft.length > 0, tool: t.tool, hasSelection: sel.ids.length > 0 })
        if (action === 'none') return
        swallow()
        if (action === 'cancelGesture') { setGesture(null); setConnectionDraft(null) }
        else if (action === 'cancelDraft') t.setDraft([])
        else if (action === 'clearSelection') sel.clear()
        else if (action === 'exitTool') { setPortHover(null); t.setTool('select') }
        return
      }
      if (t.tool === 'line' && t.wireDraft.length) {
        if (e.key === 'Enter') {
          if (e.isComposing || e.keyCode === 229) return
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
    const blur = () => { setSpace(false); setGesture(null); setConnectionDraft(null) }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  if (!view) return <div ref={ref} className="relative flex-1 overflow-hidden bg-[var(--sheet-desk)]" />

  const s = scaleOf(view)
  const unit = 1 / s
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    return screenToWorld(view, e.clientX - r.left, e.clientY - r.top)
  }

  /** Single source of truth: indicator, preview and commit all use the point returned here. */
  const resolvePoint = (w: Point, e: { altKey: boolean; shiftKey: boolean }, skip?: { lineId: string; index: number }): GraphicSnap => {
    const snap = resolveGraphicSnap(w, { scale: s, grid: gridSize, gridSnap, disabled: e.altKey, ports: wiringPortAnchors(page).map((anchor) => anchor.point), anchors: graphicAnchors(page, tool === 'line' ? draft : [], skip) })
    if (skip) return snap
    const last = draft[draft.length - 1]
    if (tool === 'line') return resolveConstrainedLinePoint(snap, last, e.shiftKey)
    return snap
  }

  const hitId = (t: EventTarget) => (t as Element).closest?.('[data-id]')?.getAttribute('data-id') ?? null
  const typeOf = (id: string) => wiringGraphics(page).find((o) => o.id === id)?.type ?? page.connections?.find((o) => o.id === id)?.type
  const portAnchorAt = (bounds: Rect, w: Point, e: { altKey: boolean }) => nearestPortAnchor(bounds, w, gridSnap && !e.altKey ? gridSize : undefined)
  const endpointAt = (w: Point, e: { altKey: boolean; shiftKey: boolean }): CadConnectionEndpoint => connectionEndpointAt(page, w, resolvePoint(w, e).point, 12 / s, e.altKey)
  const connectionGestureAt = (g: Extract<Gesture, { kind: 'connection' }>, w: Point, e: { altKey: boolean; shiftKey: boolean }): CadConnection => g.endpoint
    ? { ...g.original, [g.endpoint]: endpointAt(w, e) }
    : moveBoundConnectionSegment(page, g.original, g.segment!, resolvePoint(w, e).point)

  const onPointerDown = (e: RPointerEvent) => {
    if ((e.button !== 0 && e.button !== 1) || typing(e.target)) return
    if (pointerId.current !== null) return
    e.preventDefault()
    pointerId.current = e.pointerId
    ref.current!.setPointerCapture(e.pointerId)
    const w = toWorld(e)
    if (e.button === 1 || tool === 'pan' || space) return setGesture({ kind: 'pan', x: e.clientX, y: e.clientY })
    if (e.button !== 0) return
    const t = useToolStore.getState()
    const p = resolvePoint(w, e).point

    const portId = (e.target as Element).closest?.('[data-port-id]')?.getAttribute('data-port-id')
    const ownerId = hitId(e.target)
    const hitOwner = page.diagramBlocks?.find((o) => o.id === ownerId)
    if (tool === 'select' && portId && hitOwner) {
      useSelectionStore.getState().set([hitOwner.id])
      // Label clicks must not move the port before a double-click can open its editor.
      if ((e.target as Element).closest?.('[data-edit="portLabel"]')) return setGesture(null)
      const attached = (page.connections ?? []).flatMap((connection) => (['start', 'end'] as const).filter((end) => {
        const endpoint = connection[end]
        return endpoint.kind === 'port' && endpoint.objectId === hitOwner.id && endpoint.portId === portId
      }).map((endpoint) => ({ connection, endpoint })))
      if (attached.length !== 1) return setGesture(null)
      const { connection, endpoint } = attached[0]
      useSelectionStore.getState().set([connection.id])
      return setGesture({ kind: 'connection', original: connection, next: connection, endpoint })
    }
    if (tool === 'port') {
      if (portId && hitOwner) {
        useSelectionStore.getState().set([hitOwner.id])
        const port = hitOwner.ports?.find((p) => p.id === portId)
        if (!port) return setGesture(null)
        return setGesture({ kind: 'portMove', objectId: hitOwner.id, portId, anchor: { edge: port.edge, t: port.t, point: portWorldPosition(portOwnerBounds(hitOwner), port) } })
      }
      if (!portOwner || ownerId !== portOwner.id) return setGesture(null)
      const anchor = portAnchorAt(portOwnerBounds(portOwner), w, e)
      if (Math.hypot(anchor.point.x - w.x, anchor.point.y - w.y) > 14 / s) return setGesture(null)
      return setGesture({ kind: 'portCreate', objectId: portOwner.id, anchor })
    }

    const sel = useSelectionStore.getState()
    const forceCreate = e.ctrlKey || e.metaKey
    const drafting = (tool === 'line' && t.wireDraft.length > 0) || (tool === 'connection' && !!connectionDraftRef.current)
    const selType = sel.ids.length === 1 ? typeOf(sel.ids[0]) : undefined
    // Handles of a selected compatible object stay usable while its drawing tool is active.
    const handlesLive = tool === 'select' || (!forceCreate && !drafting && toolMatchesType(tool, selType))
    if (handlesLive) {
      const connection = sel.ids.length === 1 ? page.connections?.find((c) => c.id === sel.ids[0]) : undefined
      const endpoint = (e.target as Element).closest?.('[data-connection-end]')?.getAttribute('data-connection-end')
      const segment = (e.target as Element).closest?.('[data-connection-segment]')?.getAttribute('data-connection-segment')
      if (connection && (endpoint === 'start' || endpoint === 'end')) return setGesture({ kind: 'connection', original: connection, next: connection, endpoint })
      if (connection && segment !== null && segment !== undefined) return setGesture({ kind: 'connection', original: connection, next: connection, segment: Number(segment) })
      const vertex = (e.target as Element).closest?.('[data-vertex]')?.getAttribute('data-vertex')
      const line = sel.ids.length === 1 ? page.lines.find((l) => l.id === sel.ids[0]) : undefined
      if (line && vertex != null) {
        const index = Number(vertex)
        const start = line.points[index]
        if (start) return setGesture({ kind: 'vertex', lineId: line.id, index, start, point: start, snap: null })
      }
      const handle = (e.target as Element).closest?.('[data-handle]')?.getAttribute('data-handle')
      const shape = sel.ids.length === 1 ? findShape(page, sel.ids[0]) : undefined
      if (shape && isResizeHandle(handle)) {
        const start = shapeBox(shape)
        return setGesture({ kind: 'resize', id: shape.id, handle, start, rect: start, snap: null })
      }
    }

    const id = hitId(e.target)
    if (tool !== 'select') {
      const intent = toolPointerIntent({ tool, hitType: id ? typeOf(id) : undefined, forceCreate, drafting })
      if (intent === 'select' && id) {
        if (e.shiftKey) { sel.toggle(id); return setGesture(null) }
        const ids = sel.ids.includes(id) ? sel.ids : [id]
        if (!sel.ids.includes(id)) sel.set(ids)
        setHover(null)
        return setGesture({ kind: 'drag', origin: w, ids, dx: 0, dy: 0 })
      }
      if (tool === 'connection') {
        const endpoint = endpointAt(w, e)
        const current = connectionDraftRef.current
        if (current) { addConnection(current.start, endpoint); setConnectionDraft(null); return setGesture(null) }
        sel.clear()
        setConnectionDraft({ id: 'connection-preview', type: 'connection', connectionType: 'generic', start: endpoint, end: endpoint, style: 'dashed' })
        return setGesture({ kind: 'connect', origin: w, dragged: false })
      }
      if (tool === 'line') return t.setDraft([...t.wireDraft, p])
      if (tool === 'block' || tool === 'rect' || tool === 'ellipse') {
        const snap = resolvePoint(w, e)
        setHover(null)
        return setGesture({ kind: 'shapeCreate', shape: tool === 'block' ? 'diagramBlock' : tool === 'rect' ? 'rectangle' : 'ellipse', start: snap.point, end: snap.point, snap })
      }
      if (tool === 'text') {
        setGesture(null)
        sel.clear()
        return setEditing({ kind: 'newText', at: p })
      }
    }

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
    if (pointerId.current !== null && pointerId.current !== e.pointerId) return
    const gesture = gestureRef.current
    const w = toWorld(e)
    const snap = resolvePoint(w, e)
    useCursorStore.getState().set(w, snap.point, false)
    const targeting = tool === 'connection' || (gesture?.kind === 'connection' && !!gesture.endpoint)
    const target = targeting ? endpointAt(w, e) : null
    setConnectionTarget(target)
    setHover(target?.kind === 'point' || (!gesture && (tool === 'line' || tool === 'rect' || tool === 'ellipse' || tool === 'block')) ? snap : null)
    setPortHover(tool === 'port' && portOwner && hitId(e.target) === portOwner.id ? portAnchorAt(portOwnerBounds(portOwner), w, e) : null)
    if (tool === 'connection' && connectionDraftRef.current) setConnectionDraft({ ...connectionDraftRef.current, end: endpointAt(w, e) })
    if (!gesture) return
    if (gesture.kind === 'connect') return setGesture({ ...gesture, dragged: gesture.dragged || Math.hypot(w.x - gesture.origin.x, w.y - gesture.origin.y) * s > 3 })
    if (gesture.kind === 'connection') return setGesture({ ...gesture, next: connectionGestureAt(gesture, w, e) })
    if (gesture.kind === 'portMove' || gesture.kind === 'portCreate') {
      const owner = page.diagramBlocks?.find((o) => o.id === gesture.objectId)
      if (!owner) return setGesture(null)
      return setGesture({ ...gesture, anchor: portAnchorAt(portOwnerBounds(owner), w, e) })
    }
    if (gesture.kind === 'pan') {
      panBy(e.clientX - gesture.x, e.clientY - gesture.y)
      return setGesture({ ...gesture, x: e.clientX, y: e.clientY })
    }
    if (gesture.kind === 'shapeCreate') {
      setHover(null)
      return setGesture({ ...gesture, end: snap.point, snap })
    }
    if (gesture.kind === 'drag') {
      const g = gridSnap && !e.altKey ? gridSize : 1
      const dx = Math.round((w.x - gesture.origin.x) / g) * g
      const dy = Math.round((w.y - gesture.origin.y) / g) * g
      if (dx !== gesture.dx || dy !== gesture.dy) setGesture({ ...gesture, dx, dy })
      return
    }
    if (gesture.kind === 'vertex') {
      const vs = resolvePoint(w, e, { lineId: gesture.lineId, index: gesture.index })
      if (vs.point.x !== gesture.point.x || vs.point.y !== gesture.point.y || gesture.snap?.kind !== vs.kind) setGesture({ ...gesture, point: vs.point, snap: vs })
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

  const onPointerUp = (e: RPointerEvent) => {
    if (pointerId.current !== e.pointerId) return
    const gesture = gestureRef.current
    setGesture(null)
    if (gesture?.kind === 'connect' && gesture.dragged && connectionDraftRef.current) {
      addConnection(connectionDraftRef.current.start, endpointAt(toWorld(e), e))
      setConnectionDraft(null)
    }
    if (gesture?.kind === 'connection' && gesture.next !== gesture.original) updateConnection(gesture.original.id, connectionGestureAt(gesture, toWorld(e), e))
    if (gesture?.kind === 'portCreate') addPort(gesture.objectId, gesture.anchor)
    if (gesture?.kind === 'portMove') updatePort(gesture.objectId, gesture.portId, { edge: gesture.anchor.edge, t: gesture.anchor.t })
    if (gesture?.kind === 'shapeCreate') (gesture.shape === 'diagramBlock' ? addDiagramBlock : gesture.shape === 'rectangle' ? addRectangle : addEllipse)(gesture.start, gesture.end)
    if (gesture?.kind === 'drag' && (gesture.dx || gesture.dy)) moveWiringObjects(gesture.ids, gesture.dx, gesture.dy)
    if (gesture?.kind === 'resize' && !sameRect(gesture.rect, gesture.start)) resizeShape(gesture.id, gesture.rect)
    if (gesture?.kind === 'vertex' && (gesture.point.x !== gesture.start.x || gesture.point.y !== gesture.start.y)) moveLineVertex(gesture.lineId, gesture.index, gesture.point)
    if (gesture?.kind === 'marquee') {
      const r = normalizeRect(gesture.a, gesture.b)
      if (r.w * s > 3 || r.h * s > 3) {
        const crossing = gesture.b.x < gesture.a.x
        const hit = wiringGraphics(page)
          .filter((o) => (crossing ? intersects(r, graphicBounds(o)) : rectContains(r, graphicBounds(o))))
          .map((o) => o.id)
        for (const connection of page.connections ?? []) {
          const bounds = connectionBounds(page, connection)
          if (bounds && (crossing ? intersects(r, bounds) : rectContains(r, bounds))) hit.push(connection.id)
        }
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
    if (tool === 'line' && useToolStore.getState().wireDraft.length) return finishLine()
    // Pointer capture retargets native double-clicks to the canvas after selection drags.
    const hit = e.target === e.currentTarget ? document.elementFromPoint(e.clientX, e.clientY) : e.target
    if (!(hit instanceof Element) || !e.currentTarget.contains(hit)) return
    const target = editTargetAt(hit)
    if (!target) return
    setGesture(null)
    useSelectionStore.getState().set([target.id])
    setEditing(target)
  }

  /** Maps the double-clicked element to exactly one editable string (field, port label, title, caption). */
  const editTargetAt = (t: EventTarget): Exclude<InlineEditTarget, { kind: 'newText' }> | null => {
    const el = t as Element
    const id = hitId(t)
    if (!id) return null
    const portId = el.closest?.('[data-port-id]')?.getAttribute('data-port-id')
    if (portId) return { kind: 'portLabel', id, portId }
    const part = el.closest?.('[data-edit]')
    const kind = part?.getAttribute('data-edit')
    const fieldId = part?.getAttribute('data-field-id')
    if ((kind === 'fieldLabel' || kind === 'fieldValue') && fieldId) return { kind, id, fieldId }
    const type = typeOf(id)
    if (type === 'diagramBlock') return { kind: 'blockTitle', id }
    if (type === 'text') return { kind: 'text', id }
    if (type === 'rectangle' || type === 'ellipse' || type === 'line' || type === 'connection') return { kind: 'label', id }
    return null
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const t = useToolStore.getState()
    if (t.tool === 'line' && t.wireDraft.length) return finishLine()
    if (gestureRef.current?.kind === 'shapeCreate') return setGesture(null)
    const id = hitId(e.target)
    const sel = useSelectionStore.getState()
    if (id && !sel.ids.includes(id)) sel.set([id])
    useUiStore.getState().openContextMenu(e.clientX, e.clientY, GRAPHIC_CONTEXT_MENU)
  }

  const selected = new Set(selection)
  const shownPage =
    gesture?.kind === 'connection'
      ? { ...page, connections: page.connections?.map((c) => c.id === gesture.original.id ? gesture.next : c) }
      : gesture?.kind === 'portMove'
      ? updatePortOnPage(page, gesture.objectId, gesture.portId, { edge: gesture.anchor.edge, t: gesture.anchor.t })
      : gesture?.kind === 'drag' && (gesture.dx || gesture.dy)
      ? translateGraphics(page, gesture.ids, gesture.dx, gesture.dy)
      : gesture?.kind === 'resize'
        ? resizeShapeOnPage(page, gesture.id, gesture.rect)
        : gesture?.kind === 'vertex'
          ? moveLineVertexOnPage(page, gesture.lineId, gesture.index, gesture.point)
          : page
  const single = selection.length === 1 ? selection[0] : undefined
  const handlesShown = !!single && (tool === 'select' || toolMatchesType(tool, typeOf(single))) && !(tool === 'line' && draft.length)
  const selectedShape = handlesShown ? findShape(shownPage, single!) : undefined
  const selectedLine = handlesShown ? shownPage.lines.find((l) => l.id === single) : undefined
  const editingId = editing && editing.kind !== 'newText' && editing.kind !== 'portLabel' && editing.kind !== 'fieldLabel' && editing.kind !== 'fieldValue' ? editing.id : undefined
  const linePreview = tool === 'line' && draft.length ? (hover ? [...draft, hover.point] : draft) : null
  const shapePreview = gesture?.kind === 'shapeCreate' ? normalizeRect(gesture.start, gesture.end) : null
  const targetPoint = connectionTarget && connectionTarget.kind !== 'point' ? resolveConnectionEndpoint(page, connectionTarget) : null
  const cursor = gesture?.kind === 'connection' && gesture.endpoint ? 'crosshair' : gesture?.kind === 'pan' ? 'grabbing' : tool === 'pan' || space ? 'grab' : gesture?.kind === 'resize' ? HANDLE_CURSORS[gesture.handle] : tool === 'select' ? 'default' : 'crosshair'

  return (
    <div
      ref={ref}
      className="relative flex-1 touch-none overflow-hidden bg-[var(--sheet-desk)] select-none"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => { if (pointerId.current === e.pointerId) { setGesture(null); setConnectionDraft(null) } }}
      onLostPointerCapture={(e) => { if (pointerId.current === e.pointerId) { setGesture(null); setConnectionDraft(null) } }}
      onPointerLeave={() => (useCursorStore.getState().set(null, null, false), setHover(null), setConnectionTarget(null))}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      role="application"
      aria-label={`Verkabelungsschema Seite ${page.number}: ${page.title}`}
    >
      <svg width={size.w} height={size.h} className="absolute inset-0 block" style={{ fontFamily: 'var(--font-sans)' }}>
        <g transform={`translate(${view.panX} ${view.panY}) scale(${s})`}>
          <WiringDrawing page={shownPage} selected={selected} s={s} editing={editingId} />

          {selectedLine && (
            <g aria-label="Linienpunkte">
              {selectedLine.points.map((p, i) => (
                <g key={i} data-id={selectedLine.id} data-vertex={i} style={{ cursor: 'move' }}>
                  <circle cx={p.x} cy={p.y} r={HANDLE_PX * unit} fill="transparent" />
                  <rect x={p.x - (HANDLE_PX / 2) * unit} y={p.y - (HANDLE_PX / 2) * unit} width={HANDLE_PX * unit} height={HANDLE_PX * unit} fill="var(--sheet-paper, white)" stroke={PREVIEW} strokeWidth={1.5 * unit} />
                </g>
              ))}
            </g>
          )}

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

          <WiringPorts page={shownPage} s={s} cursor={tool === 'port' ? 'move' : tool === 'connection' || gesture?.kind === 'connection' ? 'crosshair' : 'default'} editing={editing?.kind === 'portLabel' ? editing : undefined} />
          {(() => {
            const anchor = gesture?.kind === 'portCreate' ? gesture.anchor : tool === 'port' && portOwner ? portHover : null
            return anchor && <circle cx={anchor.point.x} cy={anchor.point.y} r={5 / s} fill={PREVIEW} pointerEvents="none" />
          })()}

          {handlesShown && !connectionDraft && shownPage.connections?.filter((c) => c.id === single).map((connection) => <ConnectionHandles key={connection.id} page={shownPage} connection={connection} s={s} />)}
          {connectionDraft && <g pointerEvents="none"><WiringConnection page={page} connection={connectionDraft} s={s} selected /></g>}

          {linePreview && linePreview.length > 0 && (
            <g pointerEvents="none">
              {linePreview.length > 1 && <path d={polylinePath(linePreview)} fill="none" stroke={PREVIEW} strokeWidth={2.5} strokeDasharray="10 8" strokeLinejoin="round" />}
              {draft.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4 * unit} fill={PREVIEW} />
              ))}
            </g>
          )}

          {shapePreview &&
            (tool === 'rect' || tool === 'block' ? (
              <rect x={shapePreview.x} y={shapePreview.y} width={shapePreview.w} height={shapePreview.h} fill="none" stroke={PREVIEW} strokeWidth={2.5} strokeDasharray="10 8" pointerEvents="none" />
            ) : (
              <ellipse cx={shapePreview.x + shapePreview.w / 2} cy={shapePreview.y + shapePreview.h / 2} rx={shapePreview.w / 2} ry={shapePreview.h / 2} fill="none" stroke={PREVIEW} strokeWidth={2.5} strokeDasharray="10 8" pointerEvents="none" />
            ))}

          {targetPoint && <g data-connection-target={connectionTarget?.kind} pointerEvents="none" aria-label={connectionTarget?.kind === 'port' ? 'Port-Bindung' : 'Shape-Bindung'}>
            <circle cx={targetPoint.x} cy={targetPoint.y} r={9 * unit} fill="var(--sheet-paper, white)" fillOpacity={0.7} stroke={PREVIEW} strokeWidth={2 * unit} />
            <circle cx={targetPoint.x} cy={targetPoint.y} r={3 * unit} fill={PREVIEW} />
          </g>}
          {hover && (!gesture || connectionTarget?.kind === 'point') && <SnapIndicator snap={hover} unit={unit} />}
          {(gesture?.kind === 'resize' || gesture?.kind === 'shapeCreate' || gesture?.kind === 'vertex') && gesture.snap && <SnapIndicator snap={gesture.snap} unit={unit} />}

          {gesture?.kind === 'marquee' &&
            (() => {
              const r = normalizeRect(gesture.a, gesture.b)
              const crossing = gesture.b.x < gesture.a.x
              return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={PREVIEW} fillOpacity={0.08} stroke={PREVIEW} strokeWidth={1.5 / s} strokeDasharray={crossing ? `${6 / s} ${4 / s}` : undefined} pointerEvents="none" />
            })()}
        </g>
      </svg>
      {editing && (
        <WiringInlineEditor
          key={JSON.stringify(editing)}
          page={page}
          view={view}
          target={editing}
          onCommit={(value) => { setEditing(null); applyInlineEdit(editing, value) }}
          onCancel={() => setEditing(null)}
        />
      )}
      <CanvasScrollbars view={view} size={size} sheet={pageRect(page)} />
    </div>
  )
}
