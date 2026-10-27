import { pageShapes, type CadEllipse, type CadLine, type CadPage, type CadRectangle } from '@/types/cad'
import { polylinePath, TEXT_LINE } from '@/features/drawing/geometry'
import { LINE_DASH } from '@/features/drawing/styles'
import { useSettingsStore } from '@/stores/settingsStore'
import { graphicLabelPoint, imageHref, shapeFill } from '../models/shapes'
import { LABEL_SIZE } from '../models/inlineEdit'
import { WiringSheetFrame } from './WiringSheetFrame'

import { DiagramBlock } from './DiagramBlock'
import { WiringPorts } from './WiringPorts'
import { WiringConnection } from './WiringConnection'

const SEL = 'var(--sheet-select)'
const INK = 'var(--sheet-ink)'
export const LINE_STROKE = 2.5

/** Centred caption of a simple graphic. Hidden while being inline-edited so the editor is the only visible copy. */
function GraphicLabel({ obj, hidden }: { obj: CadRectangle | CadEllipse | CadLine; hidden: boolean }) {
  if (!obj.label || hidden) return null
  const c = graphicLabelPoint(obj)
  return (
    <text data-edit="label" x={c.x} y={c.y} fontSize={LABEL_SIZE} textAnchor="middle" dominantBaseline="middle" fill={INK}>
      {obj.label}
    </text>
  )
}

/** Pure render of a wiring page. Shared by the editor canvas and print/documentation views. */
export function WiringDrawing({ page, selected = new Set<string>(), s = 1, clean = false, editing }: { page: CadPage; selected?: ReadonlySet<string>; s?: number; clean?: boolean; editing?: string }) {
  const grid = useSettingsStore((st) => st.gridSize)
  const showGrid = useSettingsStore((st) => st.showGrid)
  const { images, rectangles, ellipses } = pageShapes(page)
  const hitW = 10 / s
  return (
    <>
      <g style={clean ? undefined : { filter: 'drop-shadow(0 2px 10px rgb(0 0 0 / 0.18))' }}>
        <WiringSheetFrame page={page} grid={grid} showGrid={!clean && showGrid} s={s} />
      </g>

      {images.map((im) => {
        const href = imageHref(im)
        const sel = selected.has(im.id)
        return (
          <g key={im.id} data-id={im.id}>
            {href ? (
              <image href={href} x={im.x} y={im.y} width={im.width} height={im.height} preserveAspectRatio={im.lockAspect === false ? 'none' : 'xMidYMid meet'}>
                {im.alt && <title>{im.alt}</title>}
              </image>
            ) : (
              <>
                <rect x={im.x} y={im.y} width={im.width} height={im.height} fill="var(--sheet-ink-2)" fillOpacity={0.06} stroke="var(--sheet-ink-2)" strokeWidth={2} strokeDasharray="8 6" />
                <text x={im.x + im.width / 2} y={im.y + im.height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(28, im.height / 4)} fill="var(--sheet-ink-2)">
                  {im.alt || 'Bild'}
                </text>
              </>
            )}
            <rect x={im.x} y={im.y} width={im.width} height={im.height} fill="transparent" stroke={sel ? SEL : 'none'} strokeWidth={3} strokeDasharray="12 6" />
          </g>
        )
      })}

      {rectangles.map((r) => {
        const sel = selected.has(r.id)
        return (
          <g key={r.id} data-id={r.id}>
            <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={r.cornerRadius} {...shapeFill(r)} stroke={sel ? SEL : r.stroke} strokeWidth={sel ? r.strokeWidth * 1.4 : r.strokeWidth} strokeDasharray={LINE_DASH[r.lineStyle]} />
            <GraphicLabel obj={r} hidden={editing === r.id} />
          </g>
        )
      })}

      {ellipses.map((el) => {
        const sel = selected.has(el.id)
        return (
          <g key={el.id} data-id={el.id}>
            <ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...shapeFill(el)} stroke={sel ? SEL : el.stroke} strokeWidth={sel ? el.strokeWidth * 1.4 : el.strokeWidth} strokeDasharray={LINE_DASH[el.lineStyle]} />
            <GraphicLabel obj={el} hidden={editing === el.id} />
          </g>
        )
      })}

      {(page.diagramBlocks ?? []).map((block) => <DiagramBlock key={block.id} block={block} selected={selected.has(block.id)} editing={editing === block.id} />)}

      {page.kind === 'wiring' && (page.connections ?? []).map((connection) => <WiringConnection key={connection.id} page={page} connection={connection} s={s} selected={selected.has(connection.id)} editing={editing === connection.id} />)}

      {page.lines.map((l) => {
        const sel = selected.has(l.id)
        const d = polylinePath(l.points)
        const width = l.strokeWidth ?? LINE_STROKE
        return (
          <g key={l.id} data-id={l.id}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(hitW * 2, width)} />
            <path d={d} fill="none" stroke={sel ? SEL : l.stroke ?? INK} strokeWidth={sel ? width * 1.6 : width} strokeDasharray={LINE_DASH[l.style]} strokeLinecap="round" strokeLinejoin="round" />
            <GraphicLabel obj={l} hidden={editing === l.id} />
          </g>
        )
      })}

      {page.texts.map((t) => {
        if (editing === t.id) return null
        const sel = selected.has(t.id)
        return (
          <text key={t.id} data-id={t.id} data-edit="text" x={t.position.x} y={t.position.y} fontSize={t.size} textAnchor={t.anchor} fill={sel ? SEL : INK} textDecoration={sel ? 'underline' : undefined}>
            {t.text.split('\n').map((line, i) => (
              <tspan key={i} x={t.position.x} dy={i === 0 ? 0 : t.size * TEXT_LINE}>
                {line || ' '}
              </tspan>
            ))}
          </text>
        )
      })}
      {clean && <WiringPorts page={page} s={s} />}
    </>
  )
}
