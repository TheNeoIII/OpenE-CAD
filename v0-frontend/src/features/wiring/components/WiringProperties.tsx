import { useEffect, useState } from 'react'
import { Field, Input, Select } from '@/components/ui/primitives'
import type { CadDiagramBlock, CadEllipse, CadImage, CadRectangle, LineStyle } from '@/types/cad'
import { updateShape } from '../actions'
import { BlockProperties } from './BlockProperties'
import { MIN_SHAPE_SIZE } from '../models/shapes'

type Shape = CadRectangle | CadEllipse | CadImage | CadDiagramBlock

const TYPE_LABELS: Record<Shape['type'], string> = { diagramBlock: 'Baustein', rectangle: 'Rechteck', ellipse: 'Ellipse', image: 'Bild' }
const STYLE_LABELS: Record<LineStyle, string> = { solid: 'Durchgezogen', dashed: 'Gestrichelt', dashdot: 'Strichpunkt' }

function NumberInput({ id, value, onCommit }: { id: string; value: number; onCommit: (v: number) => void }) {
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
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
      </Section>
      {obj.type !== 'image' && (
        <Section title="Darstellung">
          <Field label="Linienfarbe" htmlFor="w-stroke">
            <input id="w-stroke" type="color" value={obj.stroke} onChange={(e) => set({ stroke: e.target.value })} className="h-8 w-full cursor-pointer rounded-md border border-line bg-app" />
          </Field>
          <Field label="Füllung" htmlFor="w-fill">
            <div className="flex items-center gap-1.5">
              <input id="w-fill" type="color" value={obj.fill === 'none' ? '#ffffff' : obj.fill} onChange={(e) => set({ fill: e.target.value })} className="h-8 min-w-0 flex-1 cursor-pointer rounded-md border border-line bg-app" />
              <label className="flex items-center gap-1 text-[11px] text-muted">
                <input type="checkbox" checked={obj.fill === 'none'} onChange={(e) => set({ fill: e.target.checked ? 'none' : '#ffffff' })} />
                Keine
              </label>
            </div>
          </Field>
          <Field label="Strichstärke" htmlFor="w-sw"><NumberInput id="w-sw" value={obj.strokeWidth} onCommit={(strokeWidth) => set({ strokeWidth: Math.max(0.5, strokeWidth) })} /></Field>
          <Field label="Linienart" htmlFor="w-ls">
            <Select id="w-ls" value={obj.lineStyle} onChange={(e) => set({ lineStyle: e.target.value as LineStyle })}>
              {(Object.keys(STYLE_LABELS) as LineStyle[]).map((k) => <option key={k} value={k}>{STYLE_LABELS[k]}</option>)}
            </Select>
          </Field>
        </Section>
      )}
      {obj.type === 'diagramBlock' && <BlockProperties key={obj.id} block={obj} />}
    </>
  )
}
