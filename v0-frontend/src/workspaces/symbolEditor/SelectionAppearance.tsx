import { ColorPicker } from '@/components/ui/ColorPicker'
import type { SymbolShape } from '@/types/cad'
import { fieldCls } from './fields'

function common<T>(values: T[]): T | undefined {
  return values.every((v) => v === values[0]) ? values[0] : undefined
}

export function SelectionAppearance({ shapes, onChange }: { shapes: SymbolShape[]; onChange: (change: (shape: SymbolShape) => SymbolShape) => void }) {
  const strokes = shapes.filter((s) => s.t !== 'text')
  const lines = shapes.filter((s) => s.t === 'line')
  const fills = shapes.filter((s) => s.t === 'rect' || s.t === 'circle' || s.t === 'path')
  const color = common(shapes.map((s) => s.color ?? 'standard'))
  const width = common(strokes.map((s) => s.strokeWidth ?? 7))
  const dash = common(lines.map((s) => s.dashed ? s.dash ?? '16 12' : ''))
  const fill = common(fills.map((s) => s.fillColor ?? '#ffffff'))
  return <section className="flex flex-col gap-3" aria-label="Gemeinsame Darstellung">
    <h4 className="text-[11px] text-muted">Gemeinsame Darstellung</h4>
    <label className="flex items-center justify-between text-[12px]">Farbe {color === undefined && <span className="text-muted">Gemischt</span>}<ColorPicker label="Auswahlfarbe" value={color === 'standard' || !color ? '#ffffff' : color} onChange={(color) => onChange((s) => ({ ...s, color }))} /></label>
    <button type="button" className="text-left text-[11px] text-muted" onClick={() => onChange((s) => ({ ...s, color: undefined }))}>Standardfarbe verwenden</button>
    {strokes.length > 0 && <label className="flex flex-col gap-1 text-[11px] text-muted">Linienstärke (0,1 mm)
      <input className={fieldCls} type="number" min="0.1" step="0.1" placeholder="Gemischt" value={width ?? ''} onChange={(e) => { const n = Number(e.target.value); if (e.target.value && Number.isFinite(n) && n > 0) onChange((s) => s.t === 'text' ? s : { ...s, strokeWidth: n }) }} />
    </label>}
    {lines.length > 0 && <label className="text-[12px]">Linienart (Linien)
      <select className={fieldCls} value={dash ?? 'mixed'} onChange={(e) => { const dash = e.target.value; onChange((s) => s.t === 'line' ? { ...s, dashed: !!dash, dash } : s) }}>
        <option value="mixed" disabled>Gemischt</option><option value="">Durchgezogen</option><option value="16 12">Gestrichelt</option><option value="2 12">Gepunktet</option><option value="24 10 2 10">Strichpunkt</option>
      </select>
    </label>}
    {fills.length > 0 && <>
      <label className="flex items-center justify-between text-[12px]">Füllfarbe {fill === undefined && <span className="text-muted">Gemischt</span>}<ColorPicker label="Auswahlfüllfarbe" value={fill ?? '#ffffff'} onChange={(fillColor) => onChange((s) => s.t === 'rect' || s.t === 'circle' ? { ...s, fillColor, filled: true } : s.t === 'path' ? { ...s, fillColor } : s)} /></label>
      <button type="button" className="text-left text-[11px] text-muted" onClick={() => onChange((s) => s.t === 'rect' || s.t === 'circle' ? { ...s, filled: false } : s.t === 'path' ? { ...s, fillColor: undefined } : s)}>Füllung entfernen</button>
    </>}
    <p className="text-[11px] text-muted">Änderungen gelten für passende Formen der Auswahl. Anschlusspunkte bleiben unverändert.</p>
  </section>
}
