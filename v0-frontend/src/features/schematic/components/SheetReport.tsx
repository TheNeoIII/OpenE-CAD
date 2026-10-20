import { memo } from 'react'
import { terminalReportRows } from '../models/terminalReport'
import { pageSizeOf, type CadDocument, type CadPage } from '@/types/cad'
import { useProjectEditor } from '@/stores/userDirectoryStore'
import type { Project } from '@/types/project'
import { fmtDate } from '@/utils/format'
import { sortedPages } from '@/utils/pages'
import { NET_SPEC_FIELDS, CABINET_SPEC_FIELDS } from '@/utils/docPages'
import { BORDER, FRAME_INSET, STRIP_W, TITLE_H } from './SheetFrame'

const ink = 'var(--sheet-ink)'
const ink2 = 'var(--sheet-ink-2)'
const mono = 'var(--font-mono)'

type Col = { label: string; width: number; mono?: boolean }

function Txt({ x, y, s, size = 22, color = ink, weight, isMono, anchor }: { x: number; y: number; s: string; size?: number; color?: string; weight?: number; isMono?: boolean; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} fontSize={size} fill={color} fontWeight={weight} fontFamily={isMono ? mono : undefined} textAnchor={anchor}>
      {s}
    </text>
  )
}

function ReportTable({ x, y, w, title, cols, rows, rowH = 40 }: { x: number; y: number; w: number; title: string; cols: Col[]; rows: string[][]; rowH?: number }) {
  const total = cols.reduce((n, c) => n + c.width, 0)
  const xs = cols.reduce<number[]>((acc, c, i) => [...acc, (i ? acc[i - 1] : x) + (i ? (cols[i - 1].width / total) * w : 0)], [])
  const headY = y + 70
  return (
    <g>
      <Txt x={x} y={y + 36} s={title} size={36} weight={700} />
      <rect x={x} y={headY} width={w} height={rowH + 4} fill="var(--sheet-grid-minor)" stroke={ink} strokeWidth={2.5} />
      {cols.map((c, i) => (
        <g key={c.label}>
          {i > 0 && <path d={`M${xs[i]} ${headY} V${headY + rowH + 4 + rows.length * rowH}`} stroke={ink} strokeWidth={1.5} />}
          <Txt x={xs[i] + 10} y={headY + rowH - 10} s={c.label} size={20} weight={600} />
        </g>
      ))}
      {rows.map((r, ri) => {
        const ry = headY + rowH + 4 + ri * rowH
        return (
          <g key={ri}>
            <path d={`M${x} ${ry + rowH} H${x + w}`} stroke="var(--sheet-grid-major)" strokeWidth={1.5} />
            {r.map((cell, ci) => (
              <Txt key={ci} x={xs[ci] + 10} y={ry + rowH - 12} s={cell} size={20} isMono={cols[ci].mono} />
            ))}
          </g>
        )
      })}
      <rect x={x} y={headY} width={w} height={rowH + 4 + rows.length * rowH} fill="none" stroke={ink} strokeWidth={2.5} />
    </g>
  )
}

/** Draws generated content (cover, table of contents, terminal plan) inside the ELCAD sheet frame. */
export const SheetReport = memo(function SheetReport({ page, doc, project }: { page: CadPage; doc: CadDocument; project: Project | null }) {
  const projectEditor = useProjectEditor(project).label
  if (page.kind === 'schematic') return null
  const { width: W, height: H } = pageSizeOf(page)
  const ix = FRAME_INSET + BORDER
  const iy = FRAME_INSET + BORDER
  const iw = W - 2 * ix
  const ih = H - 2 * iy
  const x0 = ix + STRIP_W + 60
  const x1 = ix + iw - 60
  const y0 = iy + 60
  const yEnd = iy + ih - TITLE_H - 40
  const w = x1 - x0

  if (page.kind === 'cover') {
    const spec = project?.spec ?? {}
    const cx = x0 + w / 2
    const party = (label: string, p: Project['creator'], x: number) => (
      <g>
        <Txt x={x} y={y0 + 20} s={label.toUpperCase()} size={18} color={ink2} />
        <Txt x={x} y={y0 + 62} s={p?.name || '—'} size={30} weight={700} />
        <Txt x={x} y={y0 + 98} s={p?.street ?? ''} size={22} />
        <Txt x={x} y={y0 + 128} s={p?.city ?? ''} size={22} />
        <Txt x={x} y={y0 + 158} s={[p?.phone, p?.email].filter(Boolean).join(' · ')} size={18} color={ink2} />
      </g>
    )
    const rows: [string, string][] = [
      ['Projektnummer', project?.number ?? '—'],
      ['Anlagenort', project?.location || '—'],
      ['Verteiler', doc.cabinets.map((c) => `${c.name} ${c.description}`).join(', ') || '—'],
      ['Netzform / Spannung', [spec.network, spec.voltage].filter(Boolean).join(', ') || '—'],
      ['Bemessungsstrom / Icc', [spec.ratedCurrent, spec.shortCircuit].filter(Boolean).join(' / ') || '—'],
      ['Steuerspannung', spec.controlVoltage || '—'],
      ['Norm', project?.standard ?? '—'],
      ['Bearbeiter', projectEditor || '—'],
      ['Revision / Stand', `${project?.revision ?? '—'} · ${fmtDate(project?.updatedAt ?? page.updatedAt)}`],
    ]
    const ty = y0 + 340
    return (
      <g pointerEvents="none">
        {project?.creator?.logo && <image href={project.creator.logo} x={x0} y={y0 - 20} width={360} height={110} preserveAspectRatio="xMinYMid meet" />}
        {!project?.creator?.logo && party('Ersteller', project?.creator, x0)}
        {party('Auftraggeber', project?.client ?? { name: project?.customer ?? '', street: '', city: '', phone: '', email: '', contact: '' }, x1 - 900)}
        <path d={`M${x0} ${y0 + 210} H${x1}`} stroke={ink} strokeWidth={3} />
        <Txt x={cx} y={ty - 40} s="ELEKTRODOKUMENTATION" size={26} color={ink2} anchor="middle" />
        <Txt x={cx} y={ty + 30} s={project?.name ?? page.title} size={64} weight={700} anchor="middle" />
        <Txt x={cx} y={ty + 80} s={project?.description ?? ''} size={24} color={ink2} anchor="middle" />
        {rows.map(([k, v], i) => (
          <g key={k}>
            <path d={`M${cx - 700} ${ty + 150 + i * 46} H${cx + 700}`} stroke="var(--sheet-grid-major)" strokeWidth={1.5} />
            <Txt x={cx - 680} y={ty + 186 + i * 46} s={k} size={22} color={ink2} />
            <Txt x={cx - 240} y={ty + 186 + i * 46} s={v} size={22} isMono />
          </g>
        ))}
      </g>
    )
  }

  if (page.report === 'spec' || page.report === 'cabinetSpec') {
    const fields = page.report === 'spec' ? NET_SPEC_FIELDS : CABINET_SPEC_FIELDS
    return <ReportTable x={x0} y={y0} w={w} title={page.title} cols={[{ label: 'Eigenschaft', width: 2 }, { label: 'Wert', width: 4 }]} rows={fields.map(f => [f.label, project?.spec?.[f.key] || '—'])} rowH={70} />
  }
  if (page.report === 'layout') {
    const cw = w / Math.max(1, doc.cabinets.length)
    return <g><Txt x={x0} y={y0 + 36} s="Aufbauplan" size={36} weight={700} />{doc.cabinets.map((cab, ci) => {
      const x = x0 + ci * cw
      const rh = Math.min(300, (yEnd - y0 - 250) / Math.max(1, cab.rows))
      return <g key={cab.id}>
        <Txt x={x + 20} y={y0 + 110} s={`${cab.name} · ${cab.description}`} size={24} />
        <rect x={x} y={y0 + 150} width={cw - 40} height={cab.rows * rh + 60} fill="none" stroke={ink} strokeWidth={3} />
        {Array.from({ length: cab.rows }, (_, row) => {
          const items = doc.devices.filter(d => d.placement?.cabinetId === cab.id && d.placement.row === row).sort((a,b) => a.placement!.order - b.placement!.order)
          const used = items.reduce((sum,d) => sum + d.widthTE, 0)
          const unit = (cw - 100) / Math.max(cab.rowCapacityTE, used)
          let offset = 0
          const y = y0 + 200 + row * rh
          return <g key={row}><Txt x={x + 30} y={y} s={`TS35 · Reihe ${row + 1} · ${used}/${cab.rowCapacityTE} TE`} color={used > cab.rowCapacityTE ? 'var(--w-red)' : ink2} size={20} /><path d={`M${x + 30} ${y + 90} H${x + cw - 70}`} stroke={ink} strokeWidth={8} />{items.map(d => {
            const dx = x + 30 + offset * unit; offset += d.widthTE
            return <g key={d.id}><rect x={dx} y={y + 20} width={d.widthTE * unit} height={130} fill="var(--sheet-bg)" stroke={ink} strokeWidth={2} /><text x={dx + d.widthTE * unit / 2} y={y + 65} textAnchor="middle" fill={ink} fontSize={18}>{d.bmk}</text></g>
          })}</g>
        })}
      </g>
    })}</g>
  }

  if (page.report === 'toc') {
    const groups = new Map(doc.functionGroups.map((g) => [g.id, g.label]))
    const maxRows = Math.floor((yEnd - y0 - 120) / 40)
    const rows = sortedPages(doc).slice(0, maxRows).map((p) => [p.number, `=${p.functionGroup.replace(/^=/, '')}`, groups.get(p.functionGroup) ?? '', p.title, p.revision, fmtDate(p.updatedAt), p.editedBy ?? projectEditor])
    return (
      <g pointerEvents="none">
        <ReportTable x={x0} y={y0} w={w} title="Inhaltsverzeichnis" cols={[{ label: 'Seite', width: 1, mono: true }, { label: 'Anlage', width: 1, mono: true }, { label: 'Funktion', width: 2 }, { label: 'Seitenbenennung', width: 4 }, { label: 'Rev.', width: 0.7, mono: true }, { label: 'Datum', width: 1.3 }, { label: 'Bearbeiter', width: 1.5 }]} rows={rows} />
      </g>
    )
  }

  if (page.report === 'terminals') {
    const rows = terminalReportRows(doc)
    const maxRows = Math.floor((yEnd - y0 - 120) / 40)
    return (
      <g pointerEvents="none">
        <ReportTable x={x0} y={y0} w={w} title="Klemmenplan" cols={[{ label: 'Leiste', width: 1, mono: true }, { label: 'Klemme', width: 1, mono: true }, { label: 'Funktion / Ziel', width: 4 }, { label: 'Artikel', width: 2, mono: true }, { label: 'Seite', width: 1, mono: true }]} rows={rows.slice(0, maxRows)} />
        {rows.length > maxRows && <Txt x={x0} y={yEnd} s={`+ ${rows.length - maxRows} weitere Klemmen (Fortsetzung im Export)`} size={20} color={ink2} />}
      </g>
    )
  }
  return null
})
