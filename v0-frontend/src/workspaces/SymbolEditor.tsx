import { Circle, Copy, Download, Minus, MousePointer2, Plus, RotateCcw, Square, Trash2, Type, Upload, Crosshair } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton } from '@/components/ui/primitives'
import { ShapeList, SymbolGlyph } from '@/features/schematic/components/SymbolGlyph'
import { articleVariant, customKind, symbolDef, symbolOverrideOf, symbolShapes, symbolVariants, shapesBounds, variantKey, type SymbolVariant } from '@/features/schematic/models/symbolLibrary'
import { useDocumentStore } from '@/stores/documentStore'
import type { BuiltinSymbolKind, CadConnectionPoint, CadDocument, CustomSymbolDef, SymbolKind, SymbolOverride, SymbolShape } from '@/types/cad'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { backend } from '@/backend'
import type { Article, DeviceCategory, MountType } from '@/types/device'
import { cn } from '@/utils/cn'

const CATEGORIES: DeviceCategory[] = ['Schutzgerät', 'Schütz', 'Relais', 'Befehlsgerät', 'Meldegerät', 'Klemme', 'Motor', 'Leuchte']
const MOUNTS: { value: MountType; label: string }[] = [
  { value: 'rail', label: 'Hutschiene' },
  { value: 'door', label: 'Tür' },
  { value: 'field', label: 'Feld' },
]
const GRID = 25
const VIEW = 300
const fieldCls = 'h-7 w-full rounded-md border border-line bg-app px-2 text-[12px] text-fg outline-none focus:border-accent'
const snap = (v: number) => Math.round(v / GRID) * GRID

type Tool = 'select' | 'line' | 'rect' | 'circle' | 'text' | 'pin'
type Sel = { type: 'shape' | 'pin'; index: number } | null

const uid = () => Math.random().toString(36).slice(2, 10)

function commitCustom(label: string, fn: (list: CustomSymbolDef[]) => CustomSymbolDef[]) {
  useDocumentStore.getState().commit(label, (d) => ({ ...d, customSymbols: fn(d.customSymbols ?? []) }))
}
function patchCustom(id: string, label: string, p: Partial<CustomSymbolDef>) {
  commitCustom(label, (list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)))
}
function patchOverride(kind: BuiltinSymbolKind, p: SymbolOverride | null) {
  useDocumentStore.getState().commit(p ? 'Symbol angepasst' : 'Symbol zurückgesetzt', (d) => {
    const next = { ...(d.symbolOverrides ?? {}) }
    if (p) next[kind] = { ...next[kind], ...p }
    else delete next[kind]
    return { ...d, symbolOverrides: next }
  })
}

function usageCount(doc: CadDocument, kind: SymbolKind) {
  let n = 0
  for (const p of doc.pages) for (const s of p.symbols) if (s.kind === kind) n++
  return n
}

function moveShape(s: SymbolShape, dx: number, dy: number): SymbolShape {
  if (s.t === 'line') return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
  if (s.t === 'rect') return { ...s, x: s.x + dx, y: s.y + dy }
  if (s.t === 'circle') return { ...s, cx: s.cx + dx, cy: s.cy + dy }
  return { ...s, x: s.x + dx, y: s.y + dy }
}

function TextField({ label, value, mono, onCommit }: { label: string; value: string; mono?: boolean; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted">
      {label}
      <input
        value={draft}
        onChange={(e) => { setDraft(e.target.value); onCommit(e.target.value) }}
        onBlur={() => draft.trim() !== value && onCommit(draft.trim())}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setDraft(value)
        }}
        className={cn(fieldCls, mono && 'font-mono')}
      />
    </label>
  )
}

function NumField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onCommit(v)
        }}
        className={cn(fieldCls, 'tabular-nums')}
      />
    </label>
  )
}

function MetaForm({ value, onPatch }: { value: { label: string; description: string; bmkPrefix: string; category: DeviceCategory; mount: MountType }; onPatch: (p: SymbolOverride) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <TextField label="Bezeichnung" value={value.label} onCommit={(v) => v && onPatch({ label: v })} />
      <TextField label="BMK-Präfix" value={value.bmkPrefix} mono onCommit={(v) => v && onPatch({ bmkPrefix: v.toUpperCase() })} />
      <div className="col-span-2">
        <TextField label="Beschreibung" value={value.description} onCommit={(v) => onPatch({ description: v })} />
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        Kategorie
        <select value={value.category} onChange={(e) => onPatch({ category: e.target.value as DeviceCategory })} className={fieldCls}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        Montage
        <select value={value.mount} onChange={(e) => onPatch({ mount: e.target.value as MountType })} className={fieldCls}>
          {MOUNTS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function ShapeCanvas({ sym, onPatch }: { sym: CustomSymbolDef; onPatch: (label: string, patch: Partial<CustomSymbolDef>) => void }) {
  const [tool, setTool] = useState<Tool>('select')
  const [grid, setGrid] = useState(true)
  const [guides, setGuides] = useState(true)
  const [snapping, setSnapping] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [sel, setSel] = useState<Sel>(null)
  const [draft, setDraft] = useState<{ shapes: SymbolShape[]; pins: CadConnectionPoint[] } | null>(null)
  const [preview, setPreview] = useState<SymbolShape | null>(null)
  const drag = useRef<{ start: { x: number; y: number }; mode: 'move' | 'draw' } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const shapes = draft?.shapes ?? sym.shapes
  const pins = draft?.pins ?? sym.pins
  const bounds = shapesBounds(sym.shapes, sym.pins)
  const extent = Math.max(VIEW, -bounds.x + 40, bounds.x + bounds.w + 40, -bounds.y + 40, bounds.y + bounds.h + 40)

  useEffect(() => setSel(null), [sym.id])
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

  const toLocal = (e: React.PointerEvent) => {
    const m = svgRef.current!.getScreenCTM()!.inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
    return { x: snapping ? snap(p.x) : p.x, y: snapping ? snap(p.y) : p.y }
  }

  const removeSelected = () => {
    if (!sel) return
    if (sel.type === 'shape') onPatch('Element gelöscht', { shapes: sym.shapes.filter((_, i) => i !== sel.index) })
    else onPatch('Anschluss gelöscht', { pins: sym.pins.filter((_, i) => i !== sel.index) })
    setSel(null)
  }

  const onDown = (e: React.PointerEvent, hit?: Sel) => {
    const p = toLocal(e)
    svgRef.current?.setPointerCapture(e.pointerId)
    if (tool === 'select') {
      setSel(hit ?? null)
      if (hit) {
        drag.current = { start: p, mode: 'move' }
        setDraft({ shapes: sym.shapes, pins: sym.pins })
      }
      return
    }
    if (tool === 'pin') {
      const n = sym.pins.length + 1
      onPatch('Anschluss hinzugefügt', { pins: [...sym.pins, { id: String(n), x: p.x, y: p.y }] })
      setSel({ type: 'pin', index: sym.pins.length })
      return
    }
    if (tool === 'text') {
      onPatch('Text hinzugefügt', { shapes: [...sym.shapes, { t: 'text', x: p.x, y: p.y, text: 'Text', size: 40, anchor: 'middle' }] })
      setSel({ type: 'shape', index: sym.shapes.length })
      setTool('select')
      return
    }
    drag.current = { start: p, mode: 'draw' }
    setPreview(null)
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toLocal(e)
    const dx = p.x - d.start.x
    const dy = p.y - d.start.y
    if (d.mode === 'move' && sel) {
      setDraft({
        shapes: sel.type === 'shape' ? sym.shapes.map((s, i) => (i === sel.index ? moveShape(s, dx, dy) : s)) : sym.shapes,
        pins: sel.type === 'pin' ? sym.pins.map((pt, i) => (i === sel.index ? { ...pt, x: pt.x + dx, y: pt.y + dy } : pt)) : sym.pins,
      })
      return
    }
    const s = d.start
    if (tool === 'line') setPreview({ t: 'line', x1: s.x, y1: s.y, x2: p.x, y2: p.y })
    else if (tool === 'rect') setPreview({ t: 'rect', x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(dx), h: Math.abs(dy) })
    else if (tool === 'circle') setPreview({ t: 'circle', cx: s.x, cy: s.y, r: Math.hypot(dx, dy) })
  }

  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toLocal(e)
    const dx = p.x - d.start.x, dy = p.y - d.start.y
    const draft = d.mode === 'move' && sel ? {
      shapes: sel.type === 'shape' ? sym.shapes.map((s, i) => i === sel.index ? moveShape(s, dx, dy) : s) : sym.shapes,
      pins: sel.type === 'pin' ? sym.pins.map((pt, i) => i === sel.index ? { ...pt, x: pt.x + dx, y: pt.y + dy } : pt) : sym.pins,
    } : null
    const preview: SymbolShape | null = d.mode !== 'draw' ? null : tool === 'line' ? { t: 'line', x1: d.start.x, y1: d.start.y, x2: p.x, y2: p.y }
      : tool === 'rect' ? { t: 'rect', x: Math.min(d.start.x, p.x), y: Math.min(d.start.y, p.y), w: Math.abs(dx), h: Math.abs(dy) }
      : tool === 'circle' ? { t: 'circle', cx: d.start.x, cy: d.start.y, r: Math.hypot(dx, dy) } : null
    drag.current = null
    if (d?.mode === 'move' && draft) {
      const changed = draft.shapes !== sym.shapes && JSON.stringify(draft.shapes) !== JSON.stringify(sym.shapes)
      const pinsChanged = JSON.stringify(draft.pins) !== JSON.stringify(sym.pins)
      if (changed || pinsChanged) onPatch('Symbolelement verschoben', draft)
      setDraft(null)
      return
    }
    if (preview) {
      const valid = preview.t === 'line' ? preview.x1 !== preview.x2 || preview.y1 !== preview.y2 : preview.t === 'rect' ? preview.w > 0 && preview.h > 0 : preview.t === 'circle' ? preview.r > 0 : true
      if (valid) {
        onPatch('Element gezeichnet', { shapes: [...sym.shapes, preview] })
        setSel({ type: 'shape', index: sym.shapes.length })
      }
      setPreview(null)
    }
  }

  const selShape = sel?.type === 'shape' ? sym.shapes[sel.index] : undefined
  const selPin = sel?.type === 'pin' ? sym.pins[sel.index] : undefined
  const updateShape = (p: Partial<SymbolShape>) => sel && onPatch('Element geändert', { shapes: sym.shapes.map((s, i) => (i === sel.index ? ({ ...s, ...p } as SymbolShape) : s)) })
  const updatePin = (p: Partial<CadConnectionPoint>) => sel && onPatch('Anschluss geändert', { pins: sym.pins.map((s, i) => (i === sel.index ? { ...s, ...p } : s)) })

  const tools: { id: Tool; label: string; icon: typeof Minus }[] = [
    { id: 'select', label: 'Auswählen / Verschieben', icon: MousePointer2 },
    { id: 'line', label: 'Linie', icon: Minus },
    { id: 'rect', label: 'Rechteck', icon: Square },
    { id: 'circle', label: 'Kreis', icon: Circle },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'pin', label: 'Anschlusspunkt', icon: Crosshair },
  ]

  return (
    <div className="flex min-h-80 flex-1 gap-3">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-app">
        <div role="toolbar" aria-label="Zeichenwerkzeuge" className="flex items-center gap-1 border-b border-line bg-panel px-2 py-1">
          {tools.map((t) => (
            <IconButton key={t.id} icon={t.icon} label={t.label} active={tool === t.id} size="sm" onClick={() => setTool(t.id)} />
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          <IconButton icon={Trash2} label="Auswahl löschen (Entf)" size="sm" disabled={!sel} onClick={removeSelected} />
          <span className="ml-auto text-[11px] text-muted">Raster 2,5 mm · Anschlüsse: {sym.pins.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-2 py-1 text-[11px]">
          <label><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Raster</label>
          <label><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Hilfslinien</label>
          <label><input type="checkbox" checked={snapping} onChange={(e) => setSnapping(e.target.checked)} /> Rasterfang</label>
          <label className="flex items-center gap-2">Zoom <input aria-label="Symbolzoom" type="range" min="0.25" max="4" step="0.25" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /> {Math.round(zoom * 100)}%</label>
          <button type="button" onClick={() => setZoom(1)}>Einpassen</button>
        </div>
        <svg
          ref={svgRef}
          tabIndex={0}
          aria-label="Symbolzeichenfläche"
          viewBox={`${-extent / zoom} ${-extent / zoom} ${extent * 2 / zoom} ${extent * 2 / zoom}`}
          className={cn('min-h-0 w-full flex-1 touch-none text-fg outline-none', tool === 'select' ? 'cursor-default' : 'cursor-crosshair')}
          onPointerDown={(e) => onDown(e)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => { drag.current = null; setDraft(null); setPreview(null) }}
          onKeyDown={(e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault()
              e.stopPropagation()
              removeSelected()
            } else if (e.key === 'Escape') {
              e.stopPropagation()
              drag.current = null
              setDraft(null)
              setPreview(null)
              setSel(null)
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
              const selected = sel?.type === 'shape' && sel.index === i
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
            const selected = sel?.type === 'pin' && sel.index === i
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
        </svg>
      </div>

      <aside aria-label="Elementeigenschaften" className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto rounded-md border border-line bg-panel p-3">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">{selPin ? 'Anschluss' : selShape ? { line: 'Linie', rect: 'Rechteck', circle: 'Kreis', text: 'Text', path: 'Bogen' }[selShape.t] : 'Kein Element'}</h3>
        {selShape && <>
          <label className="flex items-center justify-between text-[12px]">{selShape.t === 'text' ? 'Textfarbe' : 'Außenlinienfarbe'}<ColorPicker label="Elementfarbe" value={selShape.color ?? '#ffffff'} onChange={(color) => updateShape({ color })} /></label>
          <button className="text-left text-[11px] text-muted" onClick={() => updateShape({ color: undefined })}>Standardfarbe verwenden</button>
          {selShape.t !== 'text' && <NumField label="Linienstärke (0,1 mm)" value={selShape.strokeWidth ?? 7} onCommit={(strokeWidth) => updateShape({ strokeWidth: Math.max(0.1, strokeWidth) })} />}
          {(selShape.t === 'rect' || selShape.t === 'circle') && <label className="flex items-center justify-between text-[12px]">Füllfarbe<ColorPicker label="Füllfarbe" value={selShape.fillColor ?? '#ffffff'} onChange={(fillColor) => updateShape({ fillColor, filled: true })} /></label>}
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
        {selShape?.t === 'line' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="X1" value={selShape.x1} onCommit={(x1) => updateShape({ x1 })} />
              <NumField label="Y1" value={selShape.y1} onCommit={(y1) => updateShape({ y1 })} />
              <NumField label="X2" value={selShape.x2} onCommit={(x2) => updateShape({ x2 })} />
              <NumField label="Y2" value={selShape.y2} onCommit={(y2) => updateShape({ y2 })} />
            </div>
            <label className="text-[12px]">Linienart
              <select className={fieldCls} value={selShape.dashed ? selShape.dash ?? '16 12' : ''} onChange={(e) => updateShape({ dashed: !!e.target.value, dash: e.target.value })}>
                <option value="">Durchgezogen</option><option value="16 12">Gestrichelt</option><option value="2 12">Gepunktet</option><option value="24 10 2 10">Strichpunkt</option>
              </select>
            </label>
          </>
        )}
        {selShape?.t === 'rect' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="X" value={selShape.x} onCommit={(x) => updateShape({ x })} />
              <NumField label="Y" value={selShape.y} onCommit={(y) => updateShape({ y })} />
              <NumField label="Breite" value={selShape.w} onCommit={(w) => updateShape({ w: Math.max(1, w) })} />
              <NumField label="Höhe" value={selShape.h} onCommit={(h) => updateShape({ h: Math.max(1, h) })} />
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={!!selShape.filled} onChange={(e) => updateShape({ filled: e.target.checked })} /> Gefüllt
            </label>
          </>
        )}
        {selShape?.t === 'circle' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Mitte X" value={selShape.cx} onCommit={(cx) => updateShape({ cx })} />
              <NumField label="Mitte Y" value={selShape.cy} onCommit={(cy) => updateShape({ cy })} />
              <NumField label="Radius" value={selShape.r} onCommit={(r) => updateShape({ r: Math.max(1, r) })} />
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={!!selShape.filled} onChange={(e) => updateShape({ filled: e.target.checked })} /> Gefüllt
            </label>
          </>
        )}
        {selShape?.t === 'path' && (
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={selShape.x} onCommit={(x) => updateShape({ x })} />
            <NumField label="Y" value={selShape.y} onCommit={(y) => updateShape({ y })} />
          </div>
        )}
        {selShape?.t === 'text' && (
          <>
            <TextField label="Inhalt" value={selShape.text} onCommit={(text) => text && updateShape({ text })} />
            <div className="grid grid-cols-2 gap-2">
              <NumField label="X" value={selShape.x} onCommit={(x) => updateShape({ x })} />
              <NumField label="Y" value={selShape.y} onCommit={(y) => updateShape({ y })} />
              <NumField label="Größe" value={selShape.size} onCommit={(size) => updateShape({ size: Math.max(5, size) })} />
            </div>
          </>
        )}
        {!sel && <p className="text-[12px] leading-relaxed text-muted">Werkzeug wählen und auf der Fläche zeichnen. Anschlusspunkte (orange) sind die Klemmstellen, an denen Leiter andocken. Einheiten: 0,1 mm.</p>}
      </aside>
    </div>
  )
}

type Entry = SymbolVariant & { custom?: CustomSymbolDef }

const unsavedDrafts = new Map<string, { selected: string; pending: Partial<CustomSymbolDef> }>()

export function SymbolEditor() {
  const id = useDocumentStore((s) => s.document?.id)
  return id ? <SymbolEditorSession key={id} documentId={id} /> : null
}

function SymbolEditorSession({ documentId }: { documentId: string }) {
  const doc = useDocumentStore((s) => s.document)
  const [selected, select] = useState(() => unsavedDrafts.get(documentId)?.selected ?? 'breaker:1')
  const [pending, setPending] = useState<Partial<CustomSymbolDef> | null>(() => unsavedDrafts.get(documentId)?.pending ?? null)
  useEffect(() => {
    if (pending) unsavedDrafts.set(documentId, { selected, pending })
    else unsavedDrafts.delete(documentId)
  }, [documentId, selected, pending])
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [articleSearch, setArticleSearch] = useState('')
  const [loadingArticles, setLoadingArticles] = useState(false)
  const abandon = () => !pending || window.confirm('Ungespeicherte Symboländerungen verwerfen?')
  const setSelected = (key: string) => { if (abandon()) { setPending(null); select(key) } }
  useEffect(() => {
    if (!pending) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending])
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = symbolVariants().map((v) => ({ ...v, custom: doc?.customSymbols?.find((c) => customKind(c.id) === v.kind) }))
    const n = search.trim().toLowerCase()
    return n ? all.filter((e) => `${e.label} ${symbolDef(e.kind).bmkPrefix}`.toLowerCase().includes(n)) : all
  }, [doc, search])

  if (!doc) return null
  const variant = symbolVariants().find((v) => v.key === selected) ?? symbolVariants()[0]
  const current: Entry = { ...variant, custom: doc.customSymbols?.find((c) => customKind(c.id) === variant.kind) }
  const def = symbolDef(current.kind)
  const used = usageCount(doc, current.kind)
  const builtin = !current.custom
  const editing: CustomSymbolDef = { ...(current.custom ?? { ...def, id: current.key, shapes: symbolShapes(current.kind, current.poles), pins: def.pins({ poles: current.poles }) }), ...pending }
  const save = () => {
    if (!pending) return
    if (current.custom) patchCustom(current.custom.id, 'Symbol gespeichert', pending)
    else {
      const kind = current.kind as BuiltinSymbolKind
      const { label, description, bmkPrefix, category, mount, shapes, pins } = editing
      patchOverride(kind, { label, description, bmkPrefix, category, mount, geometry: { ...symbolOverrideOf(kind)?.geometry, [current.poles]: { shapes, pins } } })
    }
    setPending(null)
  }

  const createSymbol = (base?: Partial<CustomSymbolDef>) => {
    if (!abandon()) return
    setPending(null)
    const id = uid()
    const sym: CustomSymbolDef = {
      id,
      label: 'Neues Symbol',
      description: '',
      bmkPrefix: 'X',
      category: 'Klemme',
      mount: 'rail',
      pins: [
        { id: '1', x: 0, y: -100 },
        { id: '2', x: 0, y: 100 },
      ],
      shapes: [
        { t: 'line', x1: 0, y1: -100, x2: 0, y2: -50 },
        { t: 'rect', x: -50, y: -50, w: 100, h: 100 },
        { t: 'line', x1: 0, y1: 50, x2: 0, y2: 100 },
      ],
      ...base,
    }
    commitCustom('Symbol angelegt', (list) => [...list, sym])
    select(variantKey(customKind(id), 1))
  }

  const duplicate = () => {
    const pins = def.pins({ poles: current.poles })
    createSymbol({
      shapes: structuredClone(symbolShapes(current.kind, current.poles)),
      label: `${current.label} (Kopie)`,
      description: def.description,
      bmkPrefix: def.bmkPrefix,
      category: def.category,
      mount: def.mount,
      pins: pins.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    })
  }

  const remove = () => {
    if (!current.custom || !abandon()) return
    setPending(null)
    if (used && !window.confirm(`Das Symbol wird ${used}× im Projekt verwendet. Trotzdem löschen? Platzierte Symbole werden als „Unbekanntes Symbol“ angezeigt.`)) return
    const id = current.custom.id
    commitCustom('Symbol gelöscht', (list) => list.filter((s) => s.id !== id))
    select('breaker:1')
  }

  const exportLib = () => {
    const blob = new Blob([JSON.stringify({ format: 'symbol-library', version: 1, symbols: doc.customSymbols ?? [] }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'symbolbibliothek.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importLib = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      const list: CustomSymbolDef[] = Array.isArray(data) ? data : data.symbols
      if (!Array.isArray(list)) throw new Error('format')
      const valid = list.filter((s) => s && typeof s.id === 'string' && typeof s.label === 'string' && Array.isArray(s.pins) && Array.isArray(s.shapes))
      commitCustom('Symbole importiert', (cur) => {
        const byId = new Map(cur.map((s) => [s.id, s]))
        for (const s of valid) byId.set(s.id, { ...s, description: s.description ?? '', bmkPrefix: s.bmkPrefix || 'X', category: s.category ?? 'Klemme', mount: s.mount ?? 'rail' })
        return [...byId.values()]
      })
      setNotice(`${valid.length} Symbol(e) importiert${valid.length < list.length ? `, ${list.length - valid.length} ungültig übersprungen` : ''}.`)
    } catch {
      setNotice('Datei konnte nicht gelesen werden (erwartet: Symbolbibliothek als JSON).')
    }
  }

  const overridden = builtin && !!symbolOverrideOf(current.kind as BuiltinSymbolKind)

  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Symbolbibliothek" className="flex w-64 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex flex-col gap-2 border-b border-line p-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Symbol suchen…" aria-label="Symbol suchen" className={fieldCls} />
          <div className="flex gap-1">
            <Button size="sm" icon={Plus} onClick={() => createSymbol()} className="flex-1">
              Neu
            </Button>
            <IconButton icon={Upload} label="Bibliothek importieren" size="sm" onClick={() => fileRef.current?.click()} />
            <IconButton icon={Download} label="Eigene Symbole exportieren" size="sm" disabled={!doc.customSymbols?.length} onClick={exportLib} />
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importLib(f)
                e.target.value = ''
              }}
            />
          </div>
          <Button size="sm" disabled={loadingArticles} onClick={async () => {
            setLoadingArticles(true)
            try { setArticles(await backend.listArticles('')) } catch { setNotice('Artikelliste konnte nicht geladen werden.') } finally { setLoadingArticles(false) }
          }}>Aus Artikelvorlage…</Button>
          {articles && <div className="flex flex-col gap-2">
            <input className={fieldCls} aria-label="Artikelvorlage suchen" placeholder="Artikel suchen…" value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)} />
            <ul className="max-h-48 overflow-y-auto">
              {articles.filter((a) => `${a.description} ${a.manufacturer} ${a.articleNo}`.toLowerCase().includes(articleSearch.toLowerCase()) && articleVariant(a)).map((a) => <li key={a.id}><button className="w-full rounded p-2 text-left text-[11px] hover:bg-panel-2" onClick={() => {
                const v = articleVariant(a)!
                const d = symbolDef(v.kind)
                createSymbol({ label: `${a.description} (${a.articleNo})`, description: `${a.manufacturer} ${a.articleNo}`, category: d.category, mount: d.mount, bmkPrefix: d.bmkPrefix, shapes: structuredClone(symbolShapes(v.kind, v.poles)), pins: structuredClone(d.pins({ poles: v.poles })) })
                setArticles(null)
              }}>{a.description}<span className="block text-muted">{a.manufacturer} · {a.articleNo}</span></button></li>)}
            </ul>
            <button className="text-[11px]" onClick={() => setArticles(null)}>Artikelauswahl schließen</button>
          </div>}
          {notice && (
            <p role="status" className="text-[11px] text-muted">
              {notice}
            </p>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1">
          {(['Projektsymbole', 'Standardsymbole'] as const).map((group) => {
            const items = entries.filter((e) => (group === 'Projektsymbole' ? !!e.custom : !e.custom))
            if (!items.length) return null
            return (
              <li key={group}>
                <h3 className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted uppercase">{group}</h3>
                <ul>
                  {items.map((e) => {
                    const d = symbolDef(e.kind)
                    return (
                      <li key={e.key}>
                        <button
                          type="button"
                          onClick={() => setSelected(e.key)}
                          aria-current={e.key === current.key}
                          className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] hover:bg-panel-2', e.key === current.key && 'bg-accent-soft text-fg')}
                        >
                          <SymbolGlyph kind={e.kind} poles={e.poles} className="size-8 shrink-0 rounded-sm bg-app text-fg" />
                          <span className="min-w-0 flex-1 truncate">{e.label}</span>
                          <span className="font-mono text-[11px] text-muted">{d.bmkPrefix}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>

      <section aria-label="Symbol bearbeiten" className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <header className="flex items-start gap-3">
          <SymbolGlyph kind={current.kind} poles={current.poles} className="size-14 shrink-0 rounded-md border border-line bg-app text-fg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold">{editing.label}{pending ? ' · Ungespeichert' : ''}</h2>
            <p className="text-[12px] text-muted">
              {builtin ? 'Standardvorlage – Grafik dieser Polvariante im Projekt editierbar' : 'Projektsymbol – frei editierbar'} · {used}× verwendet
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" disabled={!pending} onClick={save}>Speichern</Button>
            <Button size="sm" disabled={!pending} onClick={() => setPending(null)}>Änderungen verwerfen</Button>
            {overridden && (
              <Button size="sm" icon={RotateCcw} onClick={() => { if (abandon()) { setPending(null); patchOverride(current.kind as BuiltinSymbolKind, null) } }}>
                Zurücksetzen
              </Button>
            )}
            <Button size="sm" icon={Copy} onClick={duplicate}>
              Duplizieren
            </Button>
            {!builtin && (
              <Button size="sm" icon={Trash2} variant="danger" onClick={remove}>
                Löschen
              </Button>
            )}
          </div>
        </header>

        <div className="max-w-xl">
          <MetaForm value={editing} onPatch={(p) => setPending((previous) => ({ ...previous, ...p }))} />
        </div>

        <ShapeCanvas
          key={current.key}
          sym={editing}
          onPatch={(_label, patch) => setPending((previous) => ({ ...previous, ...patch }))}
        />
      </section>
    </div>
  )
}
