import { pageSizeOf, type CadDocument, type CadPage, type CadSymbol, type CadText, type Point, type SymbolKind } from '@/types/cad'
import { pageSequence, sortedPages } from '@/utils/pages'
import { BORDER, COLUMNS, FRAME_INSET, ROWS } from '../components/SheetFrame'

/** Grid coordinate of a point on its sheet, e.g. "E2" (row letter + column number, as in the drawing frame). */
export function gridRef(page: CadPage, p: Point): string {
  const { width: W, height: H } = pageSizeOf(page)
  const inset = FRAME_INSET + BORDER
  const col = Math.min(COLUMNS, Math.max(1, Math.floor(((p.x - inset) / (W - inset * 2)) * COLUMNS) + 1))
  const row = ROWS[Math.min(ROWS.length - 1, Math.max(0, Math.floor(((p.y - inset) / (H - inset * 2)) * ROWS.length)))]
  return `${row}${col}`
}

/** Sheet part of a reference: group/sheet number ("2.1") or consecutive page number ("7"). */
export function pageRef(doc: CadDocument, page: CadPage): string {
  return doc.xrefMode === 'page' ? String(pageSequence(doc, page.id)) : page.number
}

/** Full reference to a point on `target`, seen from `from`: "B4" on the same sheet, otherwise "/2.1.E2". */
export function formatRef(doc: CadDocument, target: CadPage, p: Point, from?: CadPage): string {
  const coord = gridRef(target, p)
  return from && from.id === target.id ? coord : `/${pageRef(doc, target)}.${coord}`
}

/** Page named in a written tag: group number ("/4.1", "/4.1.E2") or consecutive page number ("/7", "/7.E2"). */
export function pageFromRefText(doc: CadDocument, text: string): CadPage | undefined {
  const group = text.match(/\/(\d+\.\d+)/)?.[1]
  if (group) return doc.pages.find((p) => p.number === group)
  const seq = text.match(/^\/(\d+)(?:\.[A-Z]|$)/)?.[1]
  return seq ? sortedPages(doc)[Number(seq) - 1] : undefined
}

/** Rail a free-standing tag sits on (tags detached from a rail keep its end coordinates). */
export function railAt(page: CadPage, at: Point) {
  return page.potentials.find((r) => Math.abs(r.y - at.y) < 3 && at.x >= Math.min(r.x1, r.x2) - 150 && at.x <= Math.max(r.x1, r.x2) + 150)
}

/**
 * Display text of a cross-reference tag: page part follows the project's xref mode and the grid coordinate of the
 * continuation is appended. A tag at the start of a rail points to the end of the same-named rail on the target page and vice versa.
 */
export function resolveXrefText(doc: CadDocument, text: string, railName: string | undefined, side: 'left' | 'right', peer?: { page: CadPage; at: Point }): string {
  if (peer) return formatRef(doc, peer.page, peer.at)
  const target = pageFromRefText(doc, text)
  if (!target) return text
  const rail = railName ? target.potentials.find((r) => r.name === railName) : undefined
  if (!rail) return `/${pageRef(doc, target)}`
  const at = { x: side === 'left' ? Math.max(rail.x1, rail.x2) : Math.min(rail.x1, rail.x2), y: rail.y }
  return formatRef(doc, target, at)
}

/** Display text of a free cross-reference text object on `page`. */
export function xrefDisplay(doc: CadDocument, page: CadPage, t: CadText): string {
  const target = t.xref?.targetPageId ? doc.pages.find((p) => p.id === t.xref?.targetPageId) : undefined
  const peer = target?.texts.find((x) => x.id === t.xref?.peerId)
  return resolveXrefText(doc, t.text, railAt(page, t.position)?.name, t.xref?.side ?? 'right', target && peer ? { page: target, at: peer.position } : undefined)
}

const CONTACT_KINDS = new Set<SymbolKind>(['contactNO', 'contactNC', 'contactCO', 'contactor'])
/** Symbols whose label lists the contacts of their device (ELCAD contact mirror). */
export const COIL_KINDS = new Set<SymbolKind>(['coil', 'contactor', 'timer'])

export interface ContactRef {
  symbol: CadSymbol
  page: CadPage
}

/** All switching contacts of a device across the project, excluding the coil symbol itself. */
export function deviceContacts(doc: CadDocument, deviceId: string, exceptId: string): ContactRef[] {
  const out: ContactRef[] = []
  for (const page of doc.pages) {
    if (page.kind !== 'schematic') continue
    for (const symbol of page.symbols) {
      if (symbol.id !== exceptId && symbol.deviceId === deviceId && CONTACT_KINDS.has(symbol.kind)) out.push({ symbol, page })
    }
  }
  return out
}
