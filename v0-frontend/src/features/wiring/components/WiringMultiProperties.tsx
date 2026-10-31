import { Field, Select } from '@/components/ui/primitives'
import { LiveNumberInput } from '@/components/ui/LiveNumberInput'
import { pageShapes, type CadPage, type LineStyle } from '@/types/cad'
import { updateWiringFill, updateWiringStyles } from '../actions'
import { sharedFill } from '../models/sharedFill'
import { LiveColorPicker } from './WiringProperties'

const STYLE_LABELS: Record<LineStyle, string> = { solid: 'Durchgezogen', dashed: 'Gestrichelt', dashdot: 'Strichpunkt' }
const DEFAULT_INK = '#111827'

type Styled = { kind: string; stroke: string; strokeWidth: number; lineStyle: LineStyle }

function collect(page: CadPage, ids: readonly string[]): Styled[] {
  const set = new Set(ids)
  const s = pageShapes(page)
  return [
    ...s.rectangles.filter((o) => set.has(o.id)).map((o) => ({ kind: 'Rechteck', stroke: o.stroke, strokeWidth: o.strokeWidth, lineStyle: o.lineStyle })),
    ...s.ellipses.filter((o) => set.has(o.id)).map((o) => ({ kind: 'Ellipse', stroke: o.stroke, strokeWidth: o.strokeWidth, lineStyle: o.lineStyle })),
    ...s.diagramBlocks.filter((o) => set.has(o.id)).map((o) => ({ kind: 'Baustein', stroke: o.stroke, strokeWidth: o.strokeWidth, lineStyle: o.lineStyle })),
    ...page.lines.filter((o) => set.has(o.id)).map((o) => ({ kind: 'Linie', stroke: o.stroke ?? DEFAULT_INK, strokeWidth: o.strokeWidth ?? 2, lineStyle: o.style })),
    ...(page.connections ?? []).filter((o) => set.has(o.id)).map((o) => ({ kind: 'Verbindung', stroke: o.stroke ?? DEFAULT_INK, strokeWidth: o.strokeWidth ?? 3, lineStyle: o.style })),
  ]
}

const shared = <K extends keyof Styled>(items: Styled[], key: K): Styled[K] | undefined =>
  items.every((i) => i[key] === items[0][key]) ? items[0][key] : undefined

/** Inspector for several wiring objects: edits only the properties they all share. */
export function WiringMultiProperties({ page, ids }: { page: CadPage; ids: readonly string[] }) {
  const fillState = sharedFill(page, ids)
  const items = collect(page, ids)
  const kinds = [...new Set(items.map((i) => i.kind))]
  const imageCount = ids.length - items.length
  if (!items.length) {
    return <p className="px-3 py-3 text-[12px] text-muted">{`${ids.length} Objekte ausgewählt – keine gemeinsamen Linieneigenschaften.`}</p>
  }
  const stroke = shared(items, 'stroke')
  const strokeWidth = shared(items, 'strokeWidth')
  const lineStyle = shared(items, 'lineStyle')
  const apply = (patch: Parameters<typeof updateWiringStyles>[1]) => updateWiringStyles(ids, patch)

  return (
    <section className="border-b border-line px-3 py-3">
      <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{`${ids.length} Objekte`}</h3>
      <p className="mb-3 text-[11px] text-muted">
        {kinds.join(', ')}
        {imageCount > 0 && ` · ${imageCount} ohne Linieneigenschaften`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex items-center justify-between gap-2 text-[12px]">
          <span className="text-muted">{stroke ? 'Linienfarbe' : 'Linienfarbe (gemischt)'}</span>
          <LiveColorPicker label="Linienfarbe" value={stroke ?? DEFAULT_INK} onChange={(c) => apply({ stroke: c })} />
        </div>
        <Field label="Strichstärke" htmlFor="m-sw">
          <LiveNumberInput id="m-sw" min={0.5} step={0.5} value={strokeWidth ?? 0} mixed={strokeWidth === undefined} onChange={(n) => apply({ strokeWidth: Math.max(0.5, n) })} />
        </Field>
        <Field label="Linienart" htmlFor="m-ls">
          <Select id="m-ls" value={lineStyle ?? ''} onChange={(e) => e.target.value && apply({ lineStyle: e.target.value as LineStyle })}>
            {!lineStyle && <option value="">gemischt</option>}
            {(Object.keys(STYLE_LABELS) as LineStyle[]).map((k) => <option key={k} value={k}>{STYLE_LABELS[k]}</option>)}
          </Select>
        </Field>
        {fillState && <>
          <div className="col-span-2 flex items-center justify-between gap-2 text-[12px]">
            <span className="text-muted">{fillState.fill === undefined ? 'Füllfarbe (gemischt)' : fillState.fill === 'none' ? 'Keine Füllung' : 'Füllfarbe'}</span>
            <LiveColorPicker label="Füllfarbe" value={fillState.fill && fillState.fill !== 'none' ? fillState.fill : '#ffffff'} onChange={(fill) => updateWiringFill(ids, { fill })} />
          </div>
          <button type="button" className="text-xs text-muted underline" onClick={() => updateWiringFill(ids, { fill: 'none' })}>Keine Füllung</button>
          <Field label="Deckkraft (%)" htmlFor="m-fill-opacity">
            <LiveNumberInput id="m-fill-opacity" min={0} max={100} step={1} value={(fillState.opacity ?? 1) * 100} mixed={fillState.opacity === undefined} onChange={(n) => updateWiringFill(ids, { fillOpacity: Math.max(0, Math.min(100, n)) / 100 })} />
          </Field>
        </>}
      </div>
    </section>
  )
}
