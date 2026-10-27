import { pageShapes, type CadPage, type Point, type Rect } from '@/types/cad'
import { graphicBounds, graphicLabelPoint } from './shapes'
import { connectionBounds, connectionLabelPoint } from './connections'
import { PORT_LABEL_SIZE, portLabelLayout, portOwnerBounds, portWorldPosition } from './ports'

/** What an inline editor writes to. Every target maps to exactly one string field. */
export type InlineEditTarget =
  | { kind: 'text'; id: string }
  | { kind: 'newText'; at: Point }
  | { kind: 'label'; id: string }
  | { kind: 'blockTitle'; id: string }
  | { kind: 'fieldLabel'; id: string; fieldId: string }
  | { kind: 'fieldValue'; id: string; fieldId: string }
  | { kind: 'portLabel'; id: string; portId: string }

export const BLOCK_TITLE_SIZE = 30
export const BLOCK_FIELD_SIZE = 24
export const BLOCK_PADDING = 16
export const LABEL_SIZE = 24
/** Baselines inside a block, shared by DiagramBlock rendering and the inline editor box. */
export const blockTitleBaseline = (y: number) => y + 42
export const blockFieldBaseline = (y: number, visibleIndex: number) => y + 78 + visibleIndex * 32

const block = (page: CadPage, id: string) => pageShapes(page).diagramBlocks.find((b) => b.id === id)
const labelled = (page: CadPage, id: string) => {
  const s = pageShapes(page)
  return s.rectangles.find((o) => o.id === id) ?? s.ellipses.find((o) => o.id === id) ?? page.lines.find((o) => o.id === id) ?? page.connections?.find((o) => o.id === id)
}

/** Current value, or undefined if the target no longer exists (e.g. deleted by undo). */
export function readEditValue(page: CadPage, t: InlineEditTarget): string | undefined {
  switch (t.kind) {
    case 'newText': return ''
    case 'text': return page.texts.find((o) => o.id === t.id)?.text
    case 'label': return labelled(page, t.id) ? labelled(page, t.id)!.label ?? '' : undefined
    case 'blockTitle': return block(page, t.id)?.title
    case 'fieldLabel': return block(page, t.id)?.fields?.find((f) => f.id === t.fieldId)?.label
    case 'fieldValue': return block(page, t.id)?.fields?.find((f) => f.id === t.fieldId)?.value
    case 'portLabel': {
      const port = block(page, t.id)?.ports?.find((p) => p.id === t.portId)
      return port ? port.label ?? '' : undefined
    }
  }
}

/** Pure write of one inline edit. 'newText' is handled by the text action (it creates an object). */
export function applyEditOnPage(page: CadPage, t: InlineEditTarget, value: string): CadPage {
  if (page.kind !== 'wiring' || t.kind === 'newText') return page
  if (t.kind === 'text') return { ...page, texts: page.texts.map((o) => (o.id === t.id ? { ...o, text: value } : o)) }
  const s = pageShapes(page)
  if (t.kind === 'label') {
    const set = <T extends { id: string; label?: string }>(arr: T[]) => arr.map((o) => (o.id === t.id ? { ...o, label: value } : o))
    return { ...page, rectangles: set(s.rectangles), ellipses: set(s.ellipses), lines: set(page.lines), ...(page.connections && { connections: set(page.connections) }) }
  }
  return {
    ...page,
    diagramBlocks: s.diagramBlocks.map((b) => {
      if (b.id !== t.id) return b
      switch (t.kind) {
        case 'blockTitle': return { ...b, title: value }
        case 'fieldLabel': return { ...b, fields: (b.fields ?? []).map((f) => (f.id === t.fieldId ? { ...f, label: value } : f)) }
        case 'fieldValue': return { ...b, fields: (b.fields ?? []).map((f) => (f.id === t.fieldId ? { ...f, value } : f)) }
        case 'portLabel': return { ...b, ports: (b.ports ?? []).map((p) => (p.id === t.portId ? { ...p, label: value } : p)) }
      }
    }),
  }
}

/**
 * World-space box the editor overlays, plus font size and alignment.
 * Mirrors the render positions so the input sits where the text is drawn.
 */
export function editAnchor(page: CadPage, t: InlineEditTarget, s = 1): { box: Rect; size: number; align: 'start' | 'middle' | 'end' } | null {
  const line = (x: number, baseline: number, w: number, size: number, align: 'start' | 'middle' | 'end' = 'start') =>
    ({ box: { x: align === 'middle' ? x - w / 2 : align === 'end' ? x - w : x, y: baseline - size, w, h: size * 1.35 }, size, align })
  switch (t.kind) {
    case 'newText': return line(t.at.x, t.at.y, 400, 28)
    case 'text': {
      const o = page.texts.find((x) => x.id === t.id)
      if (!o) return null
      const b = graphicBounds(o)
      return { box: { ...b, w: Math.max(b.w, 200) }, size: o.size, align: o.anchor }
    }
    case 'label': {
      const o = labelled(page, t.id)
      if (!o) return null
      const c = o.type === 'connection' ? connectionLabelPoint(page, o) : graphicLabelPoint(o)
      if (!c) return null
      const bounds = o.type === 'connection' ? connectionBounds(page, o) : graphicBounds(o)
      return line(c.x, c.y + LABEL_SIZE / 2, Math.max(bounds?.w ?? 0, 200), LABEL_SIZE, 'middle')
    }
    case 'blockTitle': {
      const b = block(page, t.id)
      return b ? line(b.x + BLOCK_PADDING, blockTitleBaseline(b.y), Math.max(b.width - BLOCK_PADDING * 2, 120), BLOCK_TITLE_SIZE) : null
    }
    case 'fieldLabel':
    case 'fieldValue': {
      const b = block(page, t.id)
      const i = (b?.fields ?? []).filter((f) => f.visible !== false).findIndex((f) => f.id === t.fieldId)
      if (!b || i < 0) return null
      return line(b.x + BLOCK_PADDING, blockFieldBaseline(b.y, i), Math.max(b.width - BLOCK_PADDING * 2, 120), BLOCK_FIELD_SIZE)
    }
    case 'portLabel': {
      const b = block(page, t.id)
      const port = b?.ports?.find((p) => p.id === t.portId)
      if (!b || !port) return null
      const l = portLabelLayout(portWorldPosition(portOwnerBounds(b), port), port, s)
      const w = 160
      const baseline = l.baseline === 'middle' ? l.y + PORT_LABEL_SIZE * 0.35 : l.baseline === 'hanging' ? l.y + PORT_LABEL_SIZE : l.y
      return line(l.x, baseline, w, PORT_LABEL_SIZE, l.anchor)
    }
  }
}

export const EDIT_LABELS: Record<InlineEditTarget['kind'], string> = {
  text: 'Text bearbeitet',
  newText: 'Text eingefügt',
  label: 'Beschriftung geändert',
  blockTitle: 'Bausteintitel geändert',
  fieldLabel: 'Feldlabel geändert',
  fieldValue: 'Feldwert geändert',
  portLabel: 'Portlabel geändert',
}
