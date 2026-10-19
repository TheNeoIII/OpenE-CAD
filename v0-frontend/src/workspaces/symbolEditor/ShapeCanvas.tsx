import { Circle, Crosshair, FlipHorizontal2, FlipVertical2, Group, Minus, MousePointer2, MoveRight, RotateCcw, RotateCw, Square, Trash2, Type, Ungroup } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SelectionAppearance } from './SelectionAppearance'
import { IconButton } from '@/components/ui/primitives'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ShapeList } from '@/features/schematic/components/SymbolGlyph'
import { shapesBounds } from '@/features/schematic/models/symbolLibrary'
import {
  lineAngle,
  lineLength,
  rotatePoint,
  rotateShape,
  scaleShape,
  selectionBox,
  setLinePolar,
  shapePoints,
  pointsBox,
  translateShape,
  type Box,
  type Pt,
} from '@/features/schematic/models/shapeTransform'
import type { CadConnectionPoint, CustomSymbolDef, SymbolShape } from '@/types/cad'
import { cn } from '@/utils/cn'
import { NumField, TextField, fieldCls } from './fields'

const GRID = 25
const VIEW = 300
const snap = (v: number) => Math.round(v / GRID) * GRID
const uid = () => Math.random().toString(36).slice(2, 10)

type Tool = 'select' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'pin'
type Selection = { shapes: number[]; pins: number[] }
type Geometry = { shapes: SymbolShape[]; pins: CadConnectionPoint[] }
type Handle = { kind: 'p1' | 'p2' } | { kind: 'scale'; corner: Pt; anchor: Pt } | { kind: 'rotate'; center: Pt }
type Drag =
  | { mode: 'move'; start: Pt; base: Geometry }
  | { mode: 'draw'; start: Pt }
  | { mode: 'box'; start: Pt; additive: boolean }
  | { mode: 'handle'; start: Pt; base: Geometry; handle: Handle }

const EMPTY: Selection = { shapes: [], pins: [] }
const isEmpty = (s: Selection) => !s.shapes.length && !s.pins.length
const SHAPE_NAMES: Record<SymbolShape['t'], string> = { line: 'Linie', rect: 'Rechteck', circle: 'Kreis', text: 'Text', path: 'Bogen' }

/** Applies a transformation to the selected shapes and pins only. */
function mapSelected(g: Geometry, sel: Selection, fs: (s: SymbolShape) => SymbolShape, fp: (p: CadConnectionPoint) => CadConnectionPoint): Geometry {
  return {
    shapes: g.shapes.map((s, i) => (sel.shapes.includes(i) ? fs(s) : s)),
    pins: g.pins.map((p, i) => (sel.pins.includes(i) ? fp(p) : p)),
  }
}

/** Expands a selection so every member of a touched group is included. */
function withGroups(shapes: SymbolShape[], indices: number[]) {
  const groups = new Set(indices.map((i) => shapes[i]?.group).filter(Boolean))
  if (!groups.size) return indices
  return shapes.flatMap((s, i) => (indices.includes(i) || (s.group && groups.has(s.group)) ? [i] : []))
}

function intersects(a: Box, b: Box) {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h
}

export function ShapeCanvas({ sym, onPatch }: { sym: CustomSymbolDef; onPatch: (label: string, patch: Partial<CustomSymbolDef>) => void }) {
  const [tool, setTool] = useState<Tool>('select')
  const [grid, setGrid] = useState(true)
  const [guides, setGuides] = useState(true)
  const [snapping, setSnapping] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [sel, setSel] = useState<Selection>(EMPTY)
  const [draft, setDraft] = useState<Geometry | null>(null)
  const [preview, setPreview] = useState<SymbolShape | null>(null)
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [rotateBy, setRotateBy] = useState('90')
  const drag = useRef<Drag | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ width: 600, height: 400 })
  const previousSize = useRef({ width: 0, height: 0, id: sym.id })
  const canvasWidth = viewport.width * Math.max(1, zoom)
  const canvasHeight = viewport.height * Math.max(1, zoom)

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const observer = new ResizeObserver(() => setViewport({ width: node.clientWidth, height: node.clientHeight }))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const previous = previousSize.current
    const reset = previous.id !== sym.id || !previous.width
    node.scrollLeft = (reset ? 0.5 : (node.scrollLeft + viewport.width / 2) / previous.width) * canvasWidth - viewport.width / 2
    node.scrollTop = (reset ? 0.5 : (node.scrollTop + viewport.height / 2) / previous.height) * canvasHeight - viewport.height / 2
    previousSize.current = { width: canvasWidth, height: canvasHeight, id: sym.id }
  }, [canvasWidth, canvasHeight, viewport.width, viewport.height, sym.id])
  const shapes = draft?.shapes ?? sym.shapes
  const pins = draft?.pins ?? sym.pins
  const bounds = shapesBounds(sym.shapes, sym.pins)
  const extent = Math.max(VIEW, -bounds.x + 40, bounds.x + bounds.w + 40, -bounds.y + 40, bounds.y + bounds.h + 40)
  const hs = 1 / zoom

  useEffect(() => setSel(EMPTY), [sym.id])
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (drag.current) return
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? svg.clientHeight : 1)
      setZoom((current) => Math.min(4, Math.max(0.25, current * Math.exp(-delta * 0.0015))))
    }
    svg.addEventListener('wheel', wheel, { passive: false })
    return () => svg.removeEventListener('wheel', wheel)
  }, [])

  const rawPoint = (e: React.PointerEvent): Pt => {
    const m = svgRef.current!.getScreenCTM()!.inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
    return { x: p.x, y: p.y }
  }
  const toLocal = (e: React.PointerEvent): Pt => {
    const p = rawPoint(e)
    return snapping ? { x: snap(p.x), y: snap(p.y) } : p
  }

  const geometry: Geometry = { shapes: sym.shapes, pins: sym.pins }
  const selShapes = sel.shapes.map((i) => shapes[i]).filter(Boolean)
  const selPins = sel.pins.map((i) => pins[i]).filter(Boolean)
  const selBox = isEmpty(sel) ? null : selectionBox(selShapes, selPins)
  const single = sel.shapes.length === 1 && !sel.pins.length ? sym.shapes[sel.shapes[0]] : undefined
  const singleLive = single ? shapes[sel.shapes[0]] : undefined
  const selPin = sel.pins.length === 1 && !sel.shapes.length ? sym.pins[sel.pins[0]] : undefined
  const count = sel.shapes.length + sel.pins.length
  const selectedGroups = new Set(sel.shapes.map((i) => sym.shapes[i]?.group).filter(Boolean))
  const canGroup = count > 1 && !(selectedGroups.size === 1 && sel.shapes.every((i) => sym.shapes[i]?.group))
  const canUngroup = selectedGroups.size > 0

  const commitGeometry = (label: string, g: Geometry) => {
    const shapesChanged = JSON.stringify(g.shapes) !== JSON.stringify(sym.shapes)
    const pinsChanged = JSON.stringify(g.pins) !== JSON.stringify(sym.pins)
    if (shapesChanged || pinsChanged) onPatch(label, { ...(shapesChanged && { shapes: g.shapes }), ...(pinsChanged && { pins: g.pins }) })
  }

  const transformSelection = (label: string, fs: (s: SymbolShape) => SymbolShape, fp: (p: CadConnectionPoint) => CadConnectionPoint) => {
    if (isEmpty(sel)) return
    commitGeometry(label, mapSelected(geometry, sel, fs, fp))
  }

  const rotateSelection = (deg: number) => {
    if (!deg || !selBox) return
    const c = { x: selBox.x + selBox.w / 2, y: selBox.y + selBox.h / 2 }
    const pivot = snapping ? { x: snap(c.x), y: snap(c.y) } : c
    transformSelection(`Auswahl um ${deg}° gedreht`, (s) => rotateShape(s, deg, pivot), (p) => ({ ...p, ...rotatePoint(p, deg, pivot) }))
  }

  const mirrorSelection = (axis: 'x' | 'y') => {
    if (!selBox) return
    const c = { x: selBox.x + selBox.w / 2, y: selBox.y + selBox.h / 2 }
    const [sx, sy] = axis === 'x' ? [-1, 1] : [1, -1]
    transformSelection(axis === 'x' ? 'Horizontal gespiegelt' : 'Vertikal gespiegelt', (s) => {
      const scaled = scaleShape(s, sx, sy, c)
      return s.rot ? ({ ...scaled, rot: (360 - s.rot) % 360 || undefined } as SymbolShape) : scaled
    }, (p) => ({ ...p, x: c.x + (p.x - c.x) * sx, y: c.y + (p.y - c.y) * sy }))
  }

  const groupSelection = () => {
    if (!canGroup) return
    const id = uid()
    onPatch('Elemente gruppiert', { shapes: sym.shapes.map((s, i) => (sel.shapes.includes(i) ? { ...s, group: id } : s)) })
  }
  const ungroupSelection = () => {
    if (!canUngroup) return
    onPatch('Gruppierung aufgehoben', {
      shapes: sym.shapes.map((s, i) => {
        if (!sel.shapes.includes(i) || !s.group) return s
        const { group: _group, ...rest } = s
        return rest as SymbolShape
      }),
    })
  }

  const removeSelected = () => {
    if (isEmpty(sel)) return
    onPatch(count > 1 ? 'Elemente gelöscht' : sel.pins.length ? 'Anschluss gelöscht' : 'Element gelöscht', {
      shapes: sym.shapes.filter((_, i) => !sel.shapes.includes(i)),
      pins: sym.pins.filter((_, i) => !sel.pins.includes(i)),
    })
    setSel(EMPTY)
  }

  const pickHit = (hit: { type: 'shape' | 'pin'; index: number }, toggle: boolean): Selection => {
    const key = hit.type === 'shape' ? 'shapes' : 'pins'
    const members = hit.type === 'shape' ? withGroups(sym.shapes, [hit.index]) : [hit.index]
    const already = sel[key].includes(hit.index)
    if (toggle) {
      const next = already ? sel[key].filter((i) => !members.includes(i)) : [...new Set([...sel[key], ...members])]
      return { ...sel, [key]: next }
    }
    if (already) return sel
    return { ...EMPTY, [key]: members }
  }

  const startDrag = (e: React.PointerEvent, d: Drag) => {
    svgRef.current?.setPointerCapture(e.pointerId)
    drag.current = d
  }

  const onDown = (e: React.PointerEvent, hit?: { type: 'shape' | 'pin'; index: number }) => {
    if (e.button !== 0) return
    svgRef.current?.focus()
    const p = toLocal(e)
    if (tool === 'select') {
      const toggle = e.shiftKey || e.ctrlKey || e.metaKey
      if (hit) {
        const next = pickHit(hit, toggle)
        setSel(next)
        if (!isEmpty(next)) {
          startDrag(e, { mode: 'move', start: p, base: geometry })
          setDraft(geometry)
        }
        return
      }
      if (!toggle) setSel(EMPTY)
      startDrag(e, { mode: 'box', start: rawPoint(e), additive: toggle })
      return
    }
    if (tool === 'pin') {
      onPatch('Anschluss hinzugefügt', { pins: [...sym.pins, { id: String(sym.pins.length + 1), x: p.x, y: p.y }] })
      setSel({ shapes: [], pins: [sym.pins.length] })
      return
    }
    if (tool === 'text') {
      onPatch('Text hinzugefügt', { shapes: [...sym.shapes, { t: 'text', x: p.x, y: p.y, text: 'Text', size: 40, anchor: 'middle' }] })
      setSel({ shapes: [sym.shapes.length], pins: [] })
      setTool('select')
      return
    }
    startDrag(e, { mode: 'draw', start: p })
    setPreview(null)
  }

  const onHandleDown = (e: React.PointerEvent, handle: Handle) => {
    e.stopPropagation()
    if (e.button !== 0) return
    startDrag(e, { mode: 'handle', start: handle.kind === 'rotate' ? rawPoint(e) : toLocal(e), base: geometry, handle })
    setDraft(geometry)
  }

  const drawShape = (start: Pt, p: Pt): SymbolShape | null => {
    if (tool === 'line') return { t: 'line', x1: start.x, y1: start.y, x2: p.x, y2: p.y }
    if (tool === 'arrow') {
      const clickOnly = start.x === p.x && start.y === p.y
      return { t: 'line', x1: start.x, y1: start.y, x2: clickOnly ? start.x + 100 : p.x, y2: p.y, arrow: 'end' }
    }
    if (tool === 'rect') return { t: 'rect', x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }
    if (tool === 'circle') return { t: 'circle', cx: start.x, cy: start.y, r: Math.hypot(p.x - start.x, p.y - start.y) }
    return null
  }

  const dragResult = (d: Exclude<Drag, { mode: 'draw' } | { mode: 'box' }>, e: React.PointerEvent): Geometry => {
    if (d.mode === 'move') {
      const p = toLocal(e)
      const dx = p.x - d.start.x
      const dy = p.y - d.start.y
      return mapSelected(d.base, sel, (s) => translateShape(s, dx, dy), (pt) => ({ ...pt, x: pt.x + dx, y: pt.y + dy }))
    }
    const h = d.handle
    if (h.kind === 'p1' || h.kind === 'p2') {
      const p = toLocal(e)
      return mapSelected(d.base, sel, (s) => (s.t !== 'line' ? s : h.kind === 'p1' ? { ...s, x1: p.x, y1: p.y } : { ...s, x2: p.x, y2: p.y }), (pt) => pt)
    }
    if (h.kind === 'rotate') {
      const p = rawPoint(e)
      const a0 = Math.atan2(d.start.y - h.center.y, d.start.x - h.center.x)
      const a1 = Math.atan2(p.y - h.center.y, p.x - h.center.x)
      let deg = ((a1 - a0) * 180) / Math.PI
      const step = e.shiftKey ? 1 : snapping ? 15 : 1
      deg = Math.round(deg / step) * step
      return mapSelected(d.base, sel, (s) => rotateShape(s, deg, h.center), (pt) => ({ ...pt, ...rotatePoint(pt, deg, h.center) }))
    }
    if (h.kind !== 'scale') return d.base
    const p = toLocal(e)
    const spanX = h.corner.x - h.anchor.x
    const spanY = h.corner.y - h.anchor.y
    let sx = spanX ? (p.x - h.anchor.x) / spanX : 1
    let sy = spanY ? (p.y - h.anchor.y) / spanY : 1
    if (e.shiftKey) {
      const k = Math.max(Math.abs(sx), Math.abs(sy))
      sx = Math.sign(sx || 1) * k
      sy = Math.sign(sy || 1) * k
    }
    if (Math.abs(sx) < 0.01) sx = 0.01 * Math.sign(sx || 1)
    if (Math.abs(sy) < 0.01) sy = 0.01 * Math.sign(sy || 1)
    return mapSelected(d.base, sel, (s) => scaleShape(s, sx, sy, h.anchor), (pt) => ({ ...pt, x: h.anchor.x + (pt.x - h.anchor.x) * sx, y: h.anchor.y + (pt.y - h.anchor.y) * sy }))
  }

  const boxSelection = (d: Extract<Drag, { mode: 'box' }>, p: Pt): Selection => {
    const box = pointsBox([d.start, p])!
    const hitShapes = sym.shapes.flatMap((s, i) => {
      const b = pointsBox(shapePoints(s))
      return b && intersects(box, b) ? [i] : []
    })
    const hitPins = sym.pins.flatMap((pt, i) => (intersects(box, { x: pt.x, y: pt.y, w: 0, h: 0 }) ? [i] : []))
    const shapesSel = withGroups(sym.shapes, hitShapes)
    if (!d.additive) return { shapes: shapesSel, pins: hitPins }
    return { shapes: [...new Set([...sel.shapes, ...shapesSel])], pins: [...new Set([...sel.pins, ...hitPins])] }
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (d.mode === 'box') {
      setMarquee(pointsBox([d.start, rawPoint(e)]))
      return
    }
    if (d.mode === 'draw') {
      setPreview(drawShape(d.start, toLocal(e)))
      return
    }
    setDraft(dragResult(d, e))
  }

  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (d.mode === 'box') {
      const p = rawPoint(e)
      setMarquee(null)
      if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > 4) setSel(boxSelection(d, p))
      return
    }
    if (d.mode === 'draw') {
      const shape = drawShape(d.start, toLocal(e))
      setPreview(null)
      if (!shape) return
      const valid = shape.t === 'line' ? shape.x1 !== shape.x2 || shape.y1 !== shape.y2 : shape.t === 'rect' ? shape.w > 0 && shape.h > 0 : shape.t === 'circle' ? shape.r > 0 : true
      if (valid) {
        onPatch(shape.t === 'line' && shape.arrow ? 'Pfeil eingefügt' : 'Element gezeichnet', { shapes: [...sym.shapes, shape] })
        setSel({ shapes: [sym.shapes.length], pins: [] })
      }
      return
    }
    const result = dragResult(d, e)
    setDraft(null)
    const label = d.mode === 'move' ? 'Auswahl verschoben' : d.handle.kind === 'rotate' ? 'Auswahl gedreht' : d.handle.kind === 'scale' ? 'Größe geändert' : 'Endpunkt verschoben'
    commitGeometry(label, result)
  }

  const cancelDrag = () => {
    drag.current = null
    setDraft(null)
    setPreview(null)
    setMarquee(null)
  }

  const updateSingle = (label: string, next: SymbolShape) => {
    if (!single) return
    onPatch(label, { shapes: sym.shapes.map((s, i) => (i === sel.shapes[0] ? next : s)) })
  }
  const updateShape = (p: Partial<SymbolShape>) => single && updateSingle('Element geändert', { ...single, ...p } as SymbolShape)
  const updatePin = (p: Partial<CadConnectionPoint>) => selPin && onPatch('Anschluss geändert', { pins: sym.pins.map((s, i) => (i === sel.pins[0] ? { ...s, ...p } : s)) })

  const tools: { id: Tool; label: string; icon: typeof Minus }[] = [
    { id: 'select', label: 'Auswählen / Verschieben (Umschalt = Mehrfachauswahl)', icon: MousePointer2 },
    { id: 'line', label: 'Linie', icon: Minus },
    { id: 'arrow', label: 'Pfeil (klicken oder ziehen)', icon: MoveRight },
    { id: 'rect', label: 'Rechteck', icon: Square },
    { id: 'circle', label: 'Kreis', icon: Circle },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'pin', label: 'Anschlusspunkt', icon: Crosshair },
  ]

  const handleR = 9 * hs
  const showHandles = tool === 'select' && selBox && !(drag.current?.mode === 'move')
  const lineHandles = singleLive?.t === 'line'
  const boxCenter = selBox ? { x: selBox.x + selBox.w / 2, y: selBox.y + selBox.h / 2 } : null
  const rotateHandle = selBox ? { x: selBox.x + selBox.w / 2, y: selBox.y - 40 * hs } : null
  const scalable = selBox && (selBox.w > 0 || selBox.h > 0) && !lineHandles && !(selPins.length && !selShapes.length)

  return (
    <div className="flex min-h-80 flex-1 gap-3">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-app">
        <div role="toolbar" aria-label="Zeichenwerkzeuge" className="flex flex-wrap items-center gap-1 border-b border-line bg-panel px-2 py-1">
          {tools.map((t) => (
            <IconButton key={t.id} icon={t.icon} label={t.label} active={tool === t.id} size="sm" onClick={() => setTool(t.id)} />
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          <IconButton icon={Group} label="Gruppieren (Strg+G)" size="sm" disabled={!canGroup} onClick={groupSelection} />
          <IconButton icon={Ungroup} label="Gruppierung aufheben (Strg+Umschalt+G)" size="sm" disabled={!canUngroup} onClick={ungroupSelection} />
          <IconButton icon={RotateCcw} label="90° gegen Uhrzeigersinn drehen" size="sm" disabled={isEmpty(sel)} onClick={() => rotateSelection(-90)} />
          <IconButton icon={RotateCw} label="90° im Uhrzeigersinn drehen (R)" size="sm" disabled={isEmpty(sel)} onClick={() => rotateSelection(90)} />
          <IconButton icon={FlipHorizontal2} label="Horizontal spiegeln" size="sm" disabled={isEmpty(sel)} onClick={() => mirrorSelection('x')} />
          <IconButton icon={FlipVertical2} label="Vertikal spiegeln" size="sm" disabled={isEmpty(sel)} onClick={() => mirrorSelection('y')} />
          <IconButton icon={Trash2} label="Auswahl löschen (Entf)" size="sm" disabled={isEmpty(sel)} onClick={removeSelected} />
          <span className="ml-auto text-[11px] text-muted">Raster 2,5 mm · Anschlüsse: {sym.pins.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-2 py-1 text-[11px]">
          <label><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Raster</label>
          <label><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Hilfslinien</label>
          <label><input type="checkbox" checked={snapping} onChange={(e) => setSnapping(e.target.checked)} /> Rasterfang</label>
          <label className="flex items-center gap-2">Zoom <input aria-label="Symbolzoom" type="range" min="0.25" max="4" step="0.25" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /> {Math.round(zoom * 100)}%</label>
          <button type="button" onClick={() => setZoom(1)}>Einpassen</button>
        </div>
        <div ref={scrollRef} role="region" aria-label="Zeichenfläche scrollen" className="min-h-0 flex-1 overflow-scroll overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:auto] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-track]:bg-panel [&::-webkit-scrollbar-corner]:bg-panel">
        <svg
          ref={svgRef}
          tabIndex={0}
          aria-label="Symbolzeichenfläche"
          viewBox={`${-extent / Math.min(1, zoom)} ${-extent / Math.min(1, zoom)} ${extent * 2 / Math.min(1, zoom)} ${extent * 2 / Math.min(1, zoom)}`}
          style={{ width: canvasWidth, height: canvasHeight }}
          className={cn('block max-w-none touch-none text-fg outline-none', tool === 'select' ? 'cursor-default' : 'cursor-crosshair')}
          onPointerDown={(e) => onDown(e)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={cancelDrag}
          onKeyDown={(e) => {
            const mod = e.ctrlKey || e.metaKey
            if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault()
              e.stopPropagation()
              removeSelected()
            } else if (mod && e.key.toLowerCase() === 'g') {
              e.preventDefault()
              e.stopPropagation()
              if (e.shiftKey) ungroupSelection()
              else groupSelection()
            } else if (mod && e.key.toLowerCase() === 'a') {
              e.preventDefault()
              e.stopPropagation()
              setSel({ shapes: sym.shapes.map((_, i) => i), pins: sym.pins.map((_, i) => i) })
            } else if (!mod && e.key.toLowerCase() === 'r' && !isEmpty(sel)) {
              e.preventDefault()
              e.stopPropagation()
              rotateSelection(e.shiftKey ? -90 : 90)
            } else if (e.key === 'Escape') {
              e.stopPropagation()
              cancelDrag()
              setSel(EMPTY)
              setTool('select')
            }
          }}
        >
          <defs>
            <pattern id="sym-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse" x={-VIEW} y={-VIEW}>
              <circle cx={0} cy={0} r={1.6} className="fill-muted/40" />
            </pattern>
          </defs>
          {grid && <rect x={-extent / zoom} y={-extent / zoom} width={extent * 2 / zoom} height={extent * 2 / zoom} fill="url(#sym-grid)" />}
          {guides && <path d={`M${-extent / zoom} 0 H${extent / zoom} M0 ${-extent / zoom} V${extent / zoom}`} className="stroke-muted/30" strokeWidth={1.5 / zoom} strokeDasharray="6 6" />}
          <g fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
            {shapes.map((s, i) => {
              const selected = sel.shapes.includes(i)
              return (
                <g
                  key={i}
                  className={cn(selected && 'text-accent', tool === 'select' && 'cursor-move')}
                  onPointerDown={(e) => {
                    if (tool !== 'select') return
                    e.stopPropagation()
                    onDown(e, { type: 'shape', index: i })
                  }}
                >
                  <ShapeList shapes={[s]} />
                  <g stroke="transparent" strokeWidth={24} fill="none">
                    <ShapeList shapes={[s]} hitArea />
                  </g>
                </g>
              )
            })}
            {preview && (
              <g className="text-accent" opacity={0.7}>
                <ShapeList shapes={[preview]} />
              </g>
            )}
          </g>
          {pins.map((p, i) => {
            const selected = sel.pins.includes(i)
            return (
              <g
                key={i}
                className={cn(tool === 'select' && 'cursor-move')}
                onPointerDown={(e) => {
                  if (tool !== 'select') return
                  e.stopPropagation()
                  onDown(e, { type: 'pin', index: i })
                }}
              >
                <circle cx={p.x} cy={p.y} r={(selected ? 13 : 10) / zoom} className={selected ? 'fill-accent' : 'fill-warn'} />
                <text x={p.x + 16} y={p.y - 12} fontSize={26} className="fill-muted" fontFamily="ui-monospace, monospace">
                  {p.id}
                </text>
              </g>
            )
          })}

          {showHandles && selBox && boxCenter && rotateHandle && (
            <g className="text-accent">
              {count > 1 || !lineHandles ? (
                <rect x={selBox.x - 8 * hs} y={selBox.y - 8 * hs} width={selBox.w + 16 * hs} height={selBox.h + 16 * hs} fill="none" stroke="currentColor" strokeWidth={1.5 * hs} strokeDasharray={`${6 * hs} ${4 * hs}`} pointerEvents="none" />
              ) : null}
              {lineHandles && singleLive?.t === 'line' && (
                <>
                  {(['p1', 'p2'] as const).map((k) => {
                    const pt = k === 'p1' ? { x: singleLive.x1, y: singleLive.y1 } : { x: singleLive.x2, y: singleLive.y2 }
                    return (
                      <rect
                        key={k}
                        role="button"
                        aria-label={k === 'p1' ? 'Startpunkt verschieben' : 'Endpunkt verschieben'}
                        x={pt.x - handleR}
                        y={pt.y - handleR}
                        width={handleR * 2}
                        height={handleR * 2}
                        className="cursor-crosshair fill-app"
                        stroke="currentColor"
                        strokeWidth={2 * hs}
                        onPointerDown={(e) => onHandleDown(e, { kind: k })}
                      />
                    )
                  })}
                </>
              )}
              {scalable && [
                { x: selBox.x, y: selBox.y, cursor: 'cursor-nwse-resize' },
                { x: selBox.x + selBox.w, y: selBox.y, cursor: 'cursor-nesw-resize' },
                { x: selBox.x + selBox.w, y: selBox.y + selBox.h, cursor: 'cursor-nwse-resize' },
                { x: selBox.x, y: selBox.y + selBox.h, cursor: 'cursor-nesw-resize' },
                { x: selBox.x + selBox.w / 2, y: selBox.y, cursor: 'cursor-ns-resize', edge: 'y' },
                { x: selBox.x + selBox.w, y: selBox.y + selBox.h / 2, cursor: 'cursor-ew-resize', edge: 'x' },
                { x: selBox.x + selBox.w / 2, y: selBox.y + selBox.h, cursor: 'cursor-ns-resize', edge: 'y' },
                { x: selBox.x, y: selBox.y + selBox.h / 2, cursor: 'cursor-ew-resize', edge: 'x' },
              ].map((c, i) => {
                const anchor = { x: 2 * boxCenter.x - c.x, y: 2 * boxCenter.y - c.y }
                const corner = c.edge === 'y' ? { x: anchor.x, y: c.y } : c.edge === 'x' ? { x: c.x, y: anchor.y } : { x: c.x, y: c.y }
                if (c.edge === 'y' && selBox.h === 0) return null
                if (c.edge === 'x' && selBox.w === 0) return null
                return (
                  <rect
                    key={i}
                    role="button"
                    aria-label="Größe ändern"
                    x={c.x - handleR * 0.8}
                    y={c.y - handleR * 0.8}
                    width={handleR * 1.6}
                    height={handleR * 1.6}
                    className={cn('fill-app', c.cursor)}
                    stroke="currentColor"
                    strokeWidth={2 * hs}
                    onPointerDown={(e) => onHandleDown(e, { kind: 'scale', corner, anchor: c.edge === 'y' ? { x: corner.x, y: anchor.y } : c.edge === 'x' ? { x: anchor.x, y: corner.y } : anchor })}
                  />
                )
              })}
              {(selShapes.length > 0 || selPins.length > 1) && (
                <>
                  <line x1={boxCenter.x} y1={selBox.y - 8 * hs} x2={rotateHandle.x} y2={rotateHandle.y} stroke="currentColor" strokeWidth={1.5 * hs} pointerEvents="none" />
                  <circle
                    role="button"
                    aria-label="Drehen (ziehen, Umschalt = 1°-Schritte)"
                    cx={rotateHandle.x}
                    cy={rotateHandle.y}
                    r={handleR}
                    className="cursor-grab fill-accent"
                    onPointerDown={(e) => onHandleDown(e, { kind: 'rotate', center: boxCenter })}
                  />
                </>
              )}
            </g>
          )}
          {marquee && (
            <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} className="fill-accent/10 stroke-accent" strokeWidth={1.5 * hs} strokeDasharray={`${6 * hs} ${4 * hs}`} pointerEvents="none" />
          )}
        </svg>
        </div>
      </div>

      <aside aria-label="Elementeigenschaften" className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto rounded-md border border-line bg-panel p-3">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">
          {selPin ? 'Anschluss' : single ? SHAPE_NAMES[single.t] + (single.t === 'line' && single.arrow ? ' (Pfeil)' : '') : count > 1 ? `Auswahl (${count})` : 'Kein Element'}
        </h3>

        {!isEmpty(sel) && (
          <div className="flex flex-col gap-2 rounded-md border border-line p-2">
            <span className="text-[11px] text-muted">Drehen um (°)</span>
            <form
              className="flex gap-1"
              onSubmit={(e) => {
                e.preventDefault()
                const deg = Number(rotateBy.replace(',', '.'))
                if (Number.isFinite(deg)) rotateSelection(deg)
              }}
            >
              <input aria-label="Drehwinkel in Grad" inputMode="decimal" value={rotateBy} onChange={(e) => setRotateBy(e.target.value)} className={cn(fieldCls, 'tabular-nums')} />
              <button type="submit" className="h-7 shrink-0 rounded-md border border-line px-2 text-[12px] hover:border-accent">Drehen</button>
            </form>
            {selBox && (count > 1 || single?.t !== 'line') && (
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Breite" value={Math.round(selBox.w * 100) / 100} onCommit={(w) => {
                  if (w <= 0 || !selBox.w) return
                  const a = { x: selBox.x, y: selBox.y }
                  transformSelection('Größe geändert', (s) => scaleShape(s, w / selBox.w, 1, a), (p) => ({ ...p, x: a.x + (p.x - a.x) * (w / selBox.w) }))
                }} />
                <NumField label="Höhe" value={Math.round(selBox.h * 100) / 100} onCommit={(h) => {
                  if (h <= 0 || !selBox.h) return
                  const a = { x: selBox.x, y: selBox.y }
                  transformSelection('Größe geändert', (s) => scaleShape(s, 1, h / selBox.h, a), (p) => ({ ...p, y: a.y + (p.y - a.y) * (h / selBox.h) }))
                }} />
              </div>
            )}
            {count > 1 && (
              <div className="flex gap-1">
                <button type="button" disabled={!canGroup} onClick={groupSelection} className="h-7 flex-1 rounded-md border border-line text-[12px] hover:border-accent disabled:opacity-40">Gruppieren</button>
                <button type="button" disabled={!canUngroup} onClick={ungroupSelection} className="h-7 flex-1 rounded-md border border-line text-[12px] hover:border-accent disabled:opacity-40">Lösen</button>
              </div>
            )}
            {count === 1 && canUngroup && (
              <button type="button" onClick={ungroupSelection} className="h-7 rounded-md border border-line text-[12px] hover:border-accent">Gruppierung aufheben</button>
            )}
          </div>
        )}

        {count > 1 && selShapes.length > 0 && <SelectionAppearance shapes={selShapes} onChange={(change) => transformSelection('Darstellung der Auswahl geändert', change, (p) => p)} />}

        {single && <>
          <label className="flex items-center justify-between text-[12px]">{single.t === 'text' ? 'Textfarbe' : 'Außenlinienfarbe'}<ColorPicker label="Elementfarbe" value={single.color ?? '#ffffff'} onChange={(color) => updateShape({ color })} /></label>
          <button className="text-left text-[11px] text-muted" onClick={() => updateShape({ color: undefined })}>Standardfarbe verwenden</button>
          {single.t !== 'text' && <NumField label="Linienstärke (0,1 mm)" value={single.strokeWidth ?? 7} onCommit={(strokeWidth) => updateShape({ strokeWidth: Math.max(0.1, strokeWidth) })} />}
          {(single.t === 'rect' || single.t === 'circle') && <label className="flex items-center justify-between text-[12px]">Füllfarbe<ColorPicker label="Füllfarbe" value={single.fillColor ?? '#ffffff'} onChange={(fillColor) => updateShape({ fillColor, filled: true })} /></label>}
          {(single.t === 'rect' || single.t === 'text' || single.t === 'path') && (
            <NumField label="Drehung (°)" value={single.rot ?? 0} onCommit={(rot) => updateShape({ rot: ((rot % 360) + 360) % 360 || undefined })} />
          )}
        </>}
        {selPin && (
          <>
            <TextField label="Anschlussname" value={selPin.id} mono onCommit={(v) => v && updatePin({ id: v })} />
            <div className="grid grid-cols-2 gap-2">
              <NumField label="X" value={selPin.x} onCommit={(x) => updatePin({ x })} />
              <NumField label="Y" value={selPin.y} onCommit={(y) => updatePin({ y })} />
            </div>
          </>
        )}
        {single?.t === 'line' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="X1" value={single.x1} onCommit={(x1) => updateShape({ x1 })} />
              <NumField label="Y1" value={single.y1} onCommit={(y1) => updateShape({ y1 })} />
              <NumField label="X2" value={single.x2} onCommit={(x2) => updateShape({ x2 })} />
              <NumField label="Y2" value={single.y2} onCommit={(y2) => updateShape({ y2 })} />
              <NumField label="Länge" value={lineLength(single)} onCommit={(len) => len > 0 && updateSingle('Linienlänge geändert', setLinePolar(single, len, lineAngle(single)))} />
              <NumField label="Winkel (°)" value={lineAngle(single)} onCommit={(deg) => updateSingle('Linienwinkel geändert', setLinePolar(single, lineLength(single), deg))} />
            </div>
            <label className="text-[12px]">Pfeilspitze
              <select className={fieldCls} value={single.arrow ?? ''} onChange={(e) => updateShape({ arrow: (e.target.value || undefined) as 'start' | 'end' | 'both' | undefined })}>
                <option value="">Keine</option><option value="end">Am Ende</option><option value="start">Am Anfang</option><option value="both">Beidseitig</option>
              </select>
            </label>
            <label className="text-[12px]">Linienart
              <select className={fieldCls} value={single.dashed ? single.dash ?? '16 12' : ''} onChange={(e) => updateShape({ dashed: !!e.target.value, dash: e.target.value })}>
                <option value="">Durchgezogen</option><option value="16 12">Gestrichelt</option><option value="2 12">Gepunktet</option><option value="24 10 2 10">Strichpunkt</option>
              </select>
            </label>
          </>
        )}
        {single?.t === 'rect' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="X" value={single.x} onCommit={(x) => updateShape({ x })} />
              <NumField label="Y" value={single.y} onCommit={(y) => updateShape({ y })} />
              <NumField label="Breite" value={single.w} onCommit={(w) => updateShape({ w: Math.max(1, w) })} />
              <NumField label="Höhe" value={single.h} onCommit={(h) => updateShape({ h: Math.max(1, h) })} />
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={!!single.filled} onChange={(e) => updateShape({ filled: e.target.checked })} /> Gefüllt
            </label>
          </>
        )}
        {single?.t === 'circle' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Mitte X" value={single.cx} onCommit={(cx) => updateShape({ cx })} />
              <NumField label="Mitte Y" value={single.cy} onCommit={(cy) => updateShape({ cy })} />
              <NumField label="Radius" value={single.r} onCommit={(r) => updateShape({ r: Math.max(1, r) })} />
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={!!single.filled} onChange={(e) => updateShape({ filled: e.target.checked })} /> Gefüllt
            </label>
          </>
        )}
        {single?.t === 'path' && (
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={single.x} onCommit={(x) => updateShape({ x })} />
            <NumField label="Y" value={single.y} onCommit={(y) => updateShape({ y })} />
          </div>
        )}
        {single?.t === 'text' && (
          <>
            <TextField label="Inhalt" value={single.text} onCommit={(text) => text && updateShape({ text })} />
            <div className="grid grid-cols-2 gap-2">
              <NumField label="X" value={single.x} onCommit={(x) => updateShape({ x })} />
              <NumField label="Y" value={single.y} onCommit={(y) => updateShape({ y })} />
              <NumField label="Größe" value={single.size} onCommit={(size) => updateShape({ size: Math.max(5, size) })} />
            </div>
          </>
        )}
        {isEmpty(sel) && (
          <p className="text-[12px] leading-relaxed text-muted">
            Werkzeug wählen und auf der Fläche zeichnen. Mit gedrückter Maustaste einen Rahmen ziehen oder mit Umschalt klicken, um mehrere Elemente zu markieren. Anschlusspunkte (orange) sind die Klemmstellen. Einheiten: 0,1 mm.
          </p>
        )}
      </aside>
    </div>
  )
}
