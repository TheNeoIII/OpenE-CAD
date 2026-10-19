import { memo } from 'react'
import { PAGE_FORMATS, type CadPage, type PageFormat } from '@/types/cad'
import { useProjectEditor } from '@/stores/userDirectoryStore'
import type { Project } from '@/types/project'
import { fmtDate } from '@/utils/format'

export const FRAME_INSET = 60
export const BORDER = 50
export const STRIP_W = 110
export const TITLE_H = 150
export const COLUMNS = 8
export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F']

export const XREF_W = 92
export const XREF_H = 34
export const XREF_TIP = 14
export const XREF_GAP = 6
/** Horizontal room an xref tag needs in front of a rail end. */
export const XREF_SPAN = XREF_W + XREF_TIP + XREF_GAP

/** Usable drawing area between the left text strip and the right frame border. */
export function drawingArea(format: PageFormat) {
  const W = PAGE_FORMATS[format].width
  return { left: FRAME_INSET + BORDER + STRIP_W + 4, right: W - FRAME_INSET - BORDER - 4 }
}

/** Tip x of an xref tag at a rail end, clamped so the tag never leaves the drawing area. */
export function xrefTip(side: 'left' | 'right', x: number, format: PageFormat) {
  const a = drawingArea(format)
  return side === 'left' ? Math.max(x - XREF_GAP, a.left + XREF_W + XREF_TIP) : Math.min(x + XREF_GAP, a.right - XREF_W - XREF_TIP)
}

const fit = (value: string, width: number, size: number) => {
  const max = Math.floor((width - 16) / (size * 0.55))
  return value.length > max ? value.slice(0, Math.max(1, max - 1)) + '…' : value
}

/** ELCAD-style drawing frame: border grid 1–8 / A–F, side strip and title block. Never hit-tested. */
export const SheetFrame = memo(function SheetFrame({ page, project, pageIndex, pageCount, grid, showGrid, guides }: { page: CadPage; project: Project | null; pageIndex: number; pageCount: number; grid: number; showGrid: boolean; guides: boolean }) {
  const { width: W, height: H } = PAGE_FORMATS[page.format]
  const ink = 'var(--sheet-ink)'
  const ink2 = 'var(--sheet-ink-2)'
  const ox = FRAME_INSET
  const oy = FRAME_INSET
  const ow = W - FRAME_INSET * 2
  const oh = H - FRAME_INSET * 2
  const ix = ox + BORDER
  const iy = oy + BORDER
  const iw = ow - BORDER * 2
  const ih = oh - BORDER * 2
  const colW = iw / COLUMNS
  const rowH = ih / ROWS.length
  const dx = ix + STRIP_W
  const tbY = iy + ih - TITLE_H
  const rowTb = TITLE_H / 4
  const mono = 'var(--font-mono)'

  const t = (x: number, y: number, s: string, size = 20, opts?: { anchor?: 'start' | 'middle' | 'end'; color?: string; weight?: number; mono?: boolean }) => (
    <text x={x} y={y} fontSize={size} textAnchor={opts?.anchor} fill={opts?.color ?? ink} fontWeight={opts?.weight} fontFamily={opts?.mono ? mono : undefined}>
      {s}
    </text>
  )

  const revW = 420
  const signW = 340
  const logoW = 360
  const clientW = 360
  const plantW = 360
  const xRev = dx
  const xSign = xRev + revW
  const xLogo = xSign + signW
  const xClient = xLogo + logoW
  const xPlant = xClient + clientW
  const xDraw = xPlant + plantW
  const xEnd = ix + iw
  const sheetW = 170
  const groupW = 200
  const xGroup = xEnd - sheetW - groupW
  const xSheet = xEnd - sheetW
  const revisions = (project?.revisions ?? []).slice(-3).reverse()
  const projectEditor = useProjectEditor(project).label
  const editor = page.editedBy || projectEditor || ''
  const drawingNo = project?.number ?? '—'

  const midMarker = (x: number, y: number, dir: 'down' | 'up' | 'right' | 'left') => {
    const s = 22
    const d = dir === 'down' ? `M${x - s} ${y} L${x + s} ${y} L${x} ${y + s * 1.4}Z` : dir === 'up' ? `M${x - s} ${y} L${x + s} ${y} L${x} ${y - s * 1.4}Z` : dir === 'right' ? `M${x} ${y - s} L${x} ${y + s} L${x + s * 1.4} ${y}Z` : `M${x} ${y - s} L${x} ${y + s} L${x - s * 1.4} ${y}Z`
    return <path d={d} fill={ink} />
  }

  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={W} height={H} fill="var(--sheet-bg)" />
      {showGrid && (
        <>
          <defs>
            <pattern id={`g-minor-${grid}`} width={grid} height={grid} patternUnits="userSpaceOnUse" x={dx} y={iy}>
              <path d={`M${grid} 0 H0 V${grid}`} fill="none" stroke="var(--sheet-grid-minor)" strokeWidth={1.5} />
            </pattern>
            <pattern id={`g-major-${grid}`} width={grid * 10} height={grid * 10} patternUnits="userSpaceOnUse" x={dx} y={iy}>
              <rect width={grid * 10} height={grid * 10} fill={`url(#g-minor-${grid})`} />
              <path d={`M${grid * 10} 0 H0 V${grid * 10}`} fill="none" stroke="var(--sheet-grid-major)" strokeWidth={2} />
            </pattern>
          </defs>
          <rect x={dx} y={iy} width={xEnd - dx} height={tbY - iy} fill={`url(#g-major-${grid})`} />
        </>
      )}

      <rect x={ox} y={oy} width={ow} height={oh} fill="none" stroke={ink} strokeWidth={3} />
      <rect x={ix} y={iy} width={iw} height={ih} fill="none" stroke={ink} strokeWidth={4} />

      {Array.from({ length: COLUMNS }, (_, i) => {
        const cx = ix + i * colW + colW / 2
        return (
          <g key={`c${i}`}>
            {i > 0 && <path d={`M${ix + i * colW} ${oy} V${iy} M${ix + i * colW} ${iy + ih} V${oy + oh}`} stroke={ink} strokeWidth={2} />}
            {guides && i > 0 && <path d={`M${ix + i * colW} ${iy} V${tbY}`} stroke="var(--sheet-grid-major)" strokeWidth={2} strokeDasharray="16 16" />}
            {t(cx, oy + 35, String(i + 1), 26, { anchor: 'middle', color: ink2 })}
            {t(cx, iy + ih + 35, String(i + 1), 26, { anchor: 'middle', color: ink2 })}
          </g>
        )
      })}
      {ROWS.map((r, i) => {
        const cy = iy + i * rowH + rowH / 2
        return (
          <g key={r}>
            {i > 0 && <path d={`M${ox} ${iy + i * rowH} H${ix} M${ix + iw} ${iy + i * rowH} H${ox + ow}`} stroke={ink} strokeWidth={2} />}
            {t(ox + BORDER / 2, cy + 9, r, 26, { anchor: 'middle', color: ink2 })}
            {t(ix + iw + BORDER / 2, cy + 9, r, 26, { anchor: 'middle', color: ink2 })}
          </g>
        )
      })}
      {midMarker(ix + iw / 2, oy, 'down')}
      {midMarker(ix + iw / 2, oy + oh, 'up')}
      {midMarker(ox, iy + ih / 2, 'right')}
      {midMarker(ox + ow, iy + ih / 2, 'left')}

      <path d={`M${dx} ${iy} V${iy + ih}`} stroke={ink} strokeWidth={2.5} />
      <g transform={`translate(${ix + 45} ${tbY - 30}) rotate(-90)`}>
        {t(0, 0, 'Weitergabe sowie Vervielfältigung dieser Unterlagen,', 20, { color: ink2 })}
        {t(0, 26, 'Verwertung und Mitteilung ihres Inhaltes nicht gestattet.', 20, { color: ink2 })}
        {t(0, 52, '- Alle Rechte vorbehalten -', 20, { color: ink2 })}
      </g>
      <g transform={`translate(${ix + 45} ${iy + ih / 2 - 60}) rotate(-90)`}>
        {t(0, 0, 'Erstellt mit OpenE-CAD', 18, { color: ink2 })}
        {t(0, 24, `Druckdatum ${fmtDate(new Date().toISOString())}`, 18, { color: ink2 })}
      </g>

      <rect x={dx} y={tbY} width={xEnd - dx} height={TITLE_H} fill="var(--sheet-bg)" stroke={ink} strokeWidth={3} />
      {[xSign, xLogo, xClient, xPlant, xDraw].map((x) => (
        <path key={x} d={`M${x} ${tbY} V${tbY + TITLE_H}`} stroke={ink} strokeWidth={2.5} />
      ))}

      {[1, 2, 3].map((k) => (
        <path key={k} d={`M${xRev} ${tbY + k * rowTb} H${xLogo}`} stroke={ink} strokeWidth={1.5} />
      ))}
      {[40, 200, 290].map((o) => (
        <path key={o} d={`M${xRev + o} ${tbY} V${tbY + TITLE_H}`} stroke={ink} strokeWidth={1.5} />
      ))}
      <path d={`M${xSign + 130} ${tbY} V${tbY + TITLE_H}`} stroke={ink} strokeWidth={1.5} />
      {['c', 'b', 'a'].map((l, k) => {
        const rev = revisions[2 - k]
        return (
          <g key={l}>
            {t(xRev + 10, tbY + (k + 1) * rowTb - 10, rev?.index ?? l, 18)}
            {rev && t(xRev + 50, tbY + (k + 1) * rowTb - 10, fit(rev.description, 150, 16), 16)}
            {rev && t(xRev + 210, tbY + (k + 1) * rowTb - 10, fmtDate(rev.date), 16)}
            {rev && t(xRev + 300, tbY + (k + 1) * rowTb - 10, fit(rev.author, 120, 16), 16)}
          </g>
        )
      })}
      {t(xRev + 10, tbY + TITLE_H - 10, 'R.', 16, { color: ink2 })}
      {t(xRev + 50, tbY + TITLE_H - 10, 'Änderung', 16, { color: ink2 })}
      {t(xRev + 210, tbY + TITLE_H - 10, 'Datum', 16, { color: ink2 })}
      {t(xRev + 300, tbY + TITLE_H - 10, 'Name', 16, { color: ink2 })}
      {t(xSign + 10, tbY + rowTb - 10, 'Datum', 16, { color: ink2 })}
      {t(xSign + 140, tbY + rowTb - 10, fmtDate(page.updatedAt), 16)}
      {t(xSign + 10, tbY + 2 * rowTb - 10, 'Bearbeiter', 16, { color: ink2 })}
      {t(xSign + 140, tbY + 2 * rowTb - 10, fit(editor, 200, 16), 16)}
      {t(xSign + 10, tbY + 3 * rowTb - 10, 'Geprüft', 16, { color: ink2 })}
      {t(xSign + 10, tbY + TITLE_H - 10, 'Norm', 16, { color: ink2 })}
      {t(xSign + 140, tbY + TITLE_H - 10, fit(project?.standard ?? '', 200, 16), 16)}

      {project?.creator?.logo ? (
        <image href={project.creator.logo} x={xLogo + 16} y={tbY + 16} width={logoW - 32} height={TITLE_H - 32} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <>
          {t(xLogo + logoW / 2, tbY + TITLE_H / 2, fit(project?.creator?.name || 'OpenE-CAD', logoW, 30), 30, { anchor: 'middle', weight: 700 })}
          {t(xLogo + logoW / 2, tbY + TITLE_H / 2 + 34, fit(project?.creator?.city ?? '', logoW, 18), 18, { anchor: 'middle', color: ink2 })}
        </>
      )}

      {t(xClient + 12, tbY + 30, 'Auftraggeber:', 18, { color: ink2 })}
      {t(xClient + 12, tbY + 80, fit(project?.client?.name || project?.customer || '—', clientW, 28), 28)}
      {t(xClient + 12, tbY + 118, fit(project?.client?.city ?? '', clientW, 18), 18, { color: ink2 })}

      <path d={`M${xPlant} ${tbY + TITLE_H / 2} H${xDraw}`} stroke={ink} strokeWidth={1.5} />
      {t(xPlant + 12, tbY + 50, fit(project?.name ?? '—', plantW, 28), 28)}
      {t(xPlant + 12, tbY + TITLE_H / 2 + 50, fit(project?.location || '—', plantW, 28), 28)}

      <path d={`M${xDraw} ${tbY + TITLE_H / 2} H${xEnd} M${xGroup} ${tbY} V${tbY + TITLE_H} M${xSheet} ${tbY + TITLE_H / 2} V${tbY + TITLE_H}`} stroke={ink} strokeWidth={1.5} />
      <path d={`M${xGroup} ${tbY + TITLE_H / 4} H${xEnd}`} stroke={ink} strokeWidth={1.5} />
      {t(xDraw + 14, tbY + 50, fit(`Zeichnungsnummer: ${drawingNo}`, xGroup - xDraw, 30), 30)}
      {t(xGroup + 10, tbY + 28, fit(`=${page.functionGroup.replace(/^=/, '')}`, groupW + sheetW, 20), 20, { mono: true })}
      {t(xGroup + 10, tbY + 64, fit(`+${(project?.location ?? '').replace(/^\+/, '') || '—'}`, groupW + sheetW, 20), 20, { mono: true })}
      {t(xDraw + 14, tbY + TITLE_H / 2 + 46, fit(`Rev. ${page.revision || project?.revision || '—'}`, 220, 18), 18, { color: ink2 })}
      <path d={`M${xDraw + 240} ${tbY + TITLE_H / 2} V${tbY + TITLE_H}`} stroke={ink} strokeWidth={1.5} />
      {t(xDraw + 254, tbY + TITLE_H / 2 + 46, fit(page.title, xGroup - xDraw - 260, 22), 22)}
      {t(xGroup + 10, tbY + TITLE_H / 2 + 46, fit(`Seite ${page.number}`, groupW, 18), 18, { color: ink2, mono: true })}
      {t(xSheet + 10, tbY + TITLE_H / 2 + 30, `Blatt ${pageIndex}`, 20)}
      {t(xSheet + 10, tbY + TITLE_H - 12, `von Bl. ${pageCount}`, 20)}
    </g>
  )
})
