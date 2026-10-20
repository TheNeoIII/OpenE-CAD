import { pageShapes, type CadPage } from '@/types/cad'
import { polylinePath, TEXT_LINE } from '@/features/drawing/geometry'
import { LINE_DASH } from '@/features/drawing/styles'
import { useSettingsStore } from '@/stores/settingsStore'
import { imageHref } from '../models/shapes'
import { WiringSheetFrame } from './WiringSheetFrame'

import { DiagramBlock } from './DiagramBlock'
import { WiringPorts } from './WiringPorts'

const SEL = 'var(--sheet-select)'
const LINE_STROKE = 2.5

/** Pure render of a wiring page. Shared by the editor canvas and print/documentation views. */
export function WiringDrawing({ page, selected = new Set<string>(), s = 1, clean = false }: { page: CadPage; selected?: ReadonlySet<string>; s?: number; clean?: boolean }) {
  const grid = useSettingsStore((st) => st.gridSize)
  const showGrid = useSettingsStore((st) => st.showGrid)
  const { images, rectangles, ellipses } = pageShapes(page)
  const hitW = 10 / s
  return (
    <>
      <g style={clean ? undefined : { filter: 'drop-shadow(0 2px 10px rgb(0 0 0 / 0.18))' }}>
        <WiringSheetFrame page={page} grid={grid} showGrid={!clean && showGrid} />
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
          <rect key={r.id} data-id={r.id} x={r.x} y={r.y} width={r.width} height={r.height} rx={r.cornerRadius} fill={r.fill === 'none' ? 'transparent' : r.fill} stroke={sel ? SEL : r.stroke} strokeWidth={sel ? r.strokeWidth * 1.4 : r.strokeWidth} strokeDasharray={LINE_DASH[r.lineStyle]} />
        )
      })}

      {ellipses.map((el) => {
        const sel = selected.has(el.id)
        return (
          <ellipse key={el.id} data-id={el.id} cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} fill={el.fill === 'none' ? 'transparent' : el.fill} stroke={sel ? SEL : el.stroke} strokeWidth={sel ? el.strokeWidth * 1.4 : el.strokeWidth} strokeDasharray={LINE_DASH[el.lineStyle]} />
        )
      })}

      {(page.diagramBlocks ?? []).map((block) => <DiagramBlock key={block.id} block={block} selected={selected.has(block.id)} />)}

      {page.lines.map((l) => {
        const sel = selected.has(l.id)
        const d = polylinePath(l.points)
        return (
          <g key={l.id} data-id={l.id}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={hitW * 2} />
            <path d={d} fill="none" stroke={sel ? SEL : 'var(--sheet-ink)'} strokeWidth={sel ? LINE_STROKE * 1.6 : LINE_STROKE} strokeDasharray={LINE_DASH[l.style]} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      })}

      {page.texts.map((t) => {
        const sel = selected.has(t.id)
        return (
          <text key={t.id} data-id={t.id} x={t.position.x} y={t.position.y} fontSize={t.size} textAnchor={t.anchor} fill={sel ? SEL : 'var(--sheet-ink)'} textDecoration={sel ? 'underline' : undefined}>
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
