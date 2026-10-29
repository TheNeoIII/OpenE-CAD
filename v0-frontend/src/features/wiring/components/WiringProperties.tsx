import { useEffect, useState } from 'react'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field, Input, Select } from '@/components/ui/primitives'
import type { CadDiagramBlock, CadEllipse, CadImage, CadLine, CadRectangle, LineStyle } from '@/types/cad'
import { updateConnection, updateLine, updateShape } from '../actions'
import type { CadConnection, CadConnectionType, CadPage } from '@/types/cad'
import { endpointDescription } from '../models/connections'
import { BlockProperties } from './BlockProperties'
import { clampOpacity, MIN_SHAPE_SIZE } from '../models/shapes'
import { LINE_STROKE } from './WiringDrawing'

type Shape = CadRectangle | CadEllipse | CadImage | CadDiagramBlock

const TYPE_LABELS: Record<Shape['type'], string> = { diagramBlock: 'Baustein', rectangle: 'Rechteck', ellipse: 'Ellipse', image: 'Bild' }
const STYLE_LABELS: Record<LineStyle, string> = { solid: 'Durchgezogen', dashed: 'Gestrichelt', dashdot: 'Strichpunkt' }
const DEFAULT_INK = '#111827'

function NumberInput({ id, value, onCommit, min, max, step }: { id: string; value: number; onCommit: (v: number) => void; min?: number; max?: number; step?: number }) {
  const [draft, setDraft] = useState(String(Math.round(value * 10) / 10))
  useEffect(() => setDraft(String(Math.round(value * 10) / 10)), [value])
  const commit = () => {
    const n = Number(draft)
    if (Number.isFinite(n) && n !== value) onCommit(n)
  }
  return (
    <Input
      id={id}
      type="number"
      mono
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') commit()
      }}
    />
  )
}

function TextInput({ id, value, onCommit }: { id: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <Input
      id={id}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-muted">{label}</span>
      <ColorPicker label={label} value={value} onChange={onChange} />
    </div>
  )
}

function LineStyleSelect({ id, value, onChange }: { id: string; value: LineStyle; onChange: (v: LineStyle) => void }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value as LineStyle)}>
      {(Object.keys(STYLE_LABELS) as LineStyle[]).map((k) => <option key={k} value={k}>{STYLE_LABELS[k]}</option>)}
    </Select>
  )
}

/** Inspector section for purely graphical wiring-diagram shapes. */
export function WiringProperties({ obj }: { obj: Shape }) {
  const set = (patch: Partial<Shape>) => updateShape(obj.id, patch)
  const box =
    obj.type === 'ellipse'
      ? { x: obj.cx - obj.rx, y: obj.cy - obj.ry, w: obj.rx * 2, h: obj.ry * 2 }
      : { x: obj.x, y: obj.y, w: obj.width, h: obj.height }
  const setBox = (next: Partial<typeof box>) => {
    const b = { ...box, ...next, w: Math.max(MIN_SHAPE_SIZE, next.w ?? box.w), h: Math.max(MIN_SHAPE_SIZE, next.h ?? box.h) }
    if (obj.type === 'ellipse') set({ cx: b.x + b.w / 2, cy: b.y + b.h / 2, rx: b.w / 2, ry: b.h / 2 })
    else set({ x: b.x, y: b.y, width: b.w, height: b.h })
  }

  return (
    <>
      <Section title={TYPE_LABELS[obj.type]}>
        <Field label="X" htmlFor="w-x"><NumberInput id="w-x" value={box.x} onCommit={(x) => setBox({ x })} /></Field>
        <Field label="Y" htmlFor="w-y"><NumberInput id="w-y" value={box.y} onCommit={(y) => setBox({ y })} /></Field>
        <Field label="Breite" htmlFor="w-w"><NumberInput id="w-w" value={box.w} onCommit={(w) => setBox({ w })} /></Field>
        <Field label="Höhe" htmlFor="w-h"><NumberInput id="w-h" value={box.h} onCommit={(h) => setBox({ h })} /></Field>
        {(obj.type === 'rectangle' || obj.type === 'ellipse') && (
          <Field label="Beschriftung" htmlFor="w-label" className="col-span-2">
            <TextInput id="w-label" value={obj.label ?? ''} onCommit={(label) => updateShape(obj.id, { label }, 'Beschriftung geändert')} />
          </Field>
        )}
      </Section>
      {obj.type !== 'image' && (
        <Section title="Darstellung">
          <div className="col-span-2 space-y-2">
            <ColorField label="Linienfarbe" value={obj.stroke} onChange={(stroke) => set({ stroke })} />
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-muted">Füllung</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-muted">
                  <input type="checkbox" checked={obj.fill === 'none'} onChange={(e) => set({ fill: e.target.checked ? 'none' : '#ffffff' })} />
                  Keine
                </label>
                {obj.fill !== 'none' && <ColorPicker label="Füllfarbe" value={obj.fill} onChange={(fill) => set({ fill })} />}
              </div>
            </div>
          </div>
          {obj.fill !== 'none' && (
            <Field label="Deckkraft (%)" htmlFor="w-op" className="col-span-2">
              <NumberInput id="w-op" min={0} max={100} step={5} value={Math.round(clampOpacity(obj.fillOpacity) * 100)} onCommit={(v) => set({ fillOpacity: clampOpacity(v / 100) })} />
            </Field>
          )}
          <Field label="Strichstärke" htmlFor="w-sw"><NumberInput id="w-sw" value={obj.strokeWidth} onCommit={(strokeWidth) => set({ strokeWidth: Math.max(0.5, strokeWidth) })} /></Field>
          <Field label="Linienart" htmlFor="w-ls"><LineStyleSelect id="w-ls" value={obj.lineStyle} onChange={(lineStyle) => set({ lineStyle })} /></Field>
        </Section>
      )}
      {obj.type === 'diagramBlock' && <BlockProperties key={obj.id} block={obj} />}
    </>
  )
}

export function ConnectionProperties({ connection, page }: { connection: CadConnection; page: CadPage }) {
  const set = (patch: Partial<CadConnection>) => updateConnection(connection.id, patch)
  const types: CadConnectionType[] = ['generic', 'cable', 'network', 'bus', 'power', 'signal']
  return <Section title="Verbindung">
    <Field label="Verbindungstyp" htmlFor="c-type" className="col-span-2"><Select id="c-type" value={connection.connectionType} onChange={(e) => set({ connectionType: e.target.value as CadConnectionType })}>{types.map((type) => <option key={type} value={type}>{type}</option>)}</Select></Field>
    <Field label="Beschriftung" htmlFor="c-label" className="col-span-2"><TextInput id="c-label" value={connection.label ?? ''} onCommit={(label) => set({ label })} /></Field>
    <div className="col-span-2"><ColorField label="Linienfarbe" value={connection.stroke ?? DEFAULT_INK} onChange={(stroke) => set({ stroke })} /></div>
    <Field label="Linienbreite" htmlFor="c-width"><NumberInput id="c-width" min={0.5} value={connection.strokeWidth ?? 3} onCommit={(n) => set({ strokeWidth: Math.max(0.5, n) })} /></Field>
    <Field label="Linienart" htmlFor="c-style"><LineStyleSelect id="c-style" value={connection.style} onChange={(style) => set({ style })} /></Field>
    <p className="col-span-2 break-words text-xs text-muted">Start: {endpointDescription(page, connection.start)}</p>
    <p className="col-span-2 break-words text-xs text-muted">Ende: {endpointDescription(page, connection.end)}</p>
  </Section>
}

/** Inspector for a free graphic polyline. Not a wire, not a connection. */
export function LineProperties({ line }: { line: CadLine }) {
  return (
    <Section title="Linie">
      <div className="col-span-2">
        <ColorField label="Linienfarbe" value={line.stroke ?? DEFAULT_INK} onChange={(stroke) => updateLine(line.id, { stroke })} />
      </div>
      <Field label="Linienbreite" htmlFor="l-sw"><NumberInput id="l-sw" value={line.strokeWidth ?? LINE_STROKE} onCommit={(v) => updateLine(line.id, { strokeWidth: Math.max(0.5, v) })} /></Field>
      <Field label="Linienart" htmlFor="l-ls"><LineStyleSelect id="l-ls" value={line.style} onChange={(style) => updateLine(line.id, { style })} /></Field>
      <Field label="Beschriftung" htmlFor="l-label" className="col-span-2">
        <TextInput id="l-label" value={line.label ?? ''} onCommit={(label) => updateLine(line.id, { label }, 'Beschriftung geändert')} />
      </Field>
      <p className="col-span-2 text-[11px] text-muted">{`${line.points.length} Punkte – Punkte direkt auf der Zeichenfläche ziehen.`}</p>
    </Section>
  )
}
