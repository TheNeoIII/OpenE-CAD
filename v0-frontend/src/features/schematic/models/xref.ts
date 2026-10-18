import { PAGE_FORMATS, type CadDocument, type CadPage, type CadSymbol, type Point, type SymbolKind } from '@/types/cad'
import { pageSequence } from '@/utils/pages'
import { BORDER, COLUMNS, FRAME_INSET, ROWS } from '../components/SheetFrame'

/** Grid coordinate of a point on its sheet, e.g. "E2" (row letter + column number, as in the drawing frame). */
export function gridRef(page: CadPage, p: Point): string {
  const { width: W, height: H } = PAGE_FORMATS[page.format]
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
    for (const symbol of page.symbols) {
      if (symbol.id !== exceptId && symbol.deviceId === deviceId && CONTACT_KINDS.has(symbol.kind)) out.push({ symbol, page })
    }
  }
  return out
}
