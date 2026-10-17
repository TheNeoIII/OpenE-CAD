import type { CadDocument, CadPage, CadText } from '@/types/cad'
import { groupNo, sortedPages } from './pages'

/** Rail-embedded cross-references (legacy) become free, selectable xref objects attached to the rail ends. */
function detachLegacyRailReferences(doc: CadDocument): CadDocument {
  if (!doc.pages.some((p) => p.potentials.some((r) => r.xrefLeft || r.xrefRight))) return doc
  return { ...doc, pages: doc.pages.map((p) => {
    if (!p.potentials.some((r) => r.xrefLeft || r.xrefRight)) return p
    const refs: CadText[] = p.potentials.flatMap((rail) => (['left', 'right'] as const).flatMap((side) => {
      const text = side === 'left' ? rail.xrefLeft : rail.xrefRight
      return text ? [{ id: `xref-${rail.id}-${side}`, type: 'text' as const, style: 'xref' as const, text, size: 22, anchor: 'start' as const, position: { x: side === 'left' ? rail.x1 : rail.x2, y: rail.y }, xref: { targetPageId: '', peerId: '', side } }] : []
    }))
    return { ...p, potentials: p.potentials.map((r) => ({ ...r, xrefLeft: undefined, xrefRight: undefined })), texts: [...p.texts, ...refs] }
  }) }
}

export function normalizePages(doc: CadDocument): CadDocument {
  doc = detachLegacyRailReferences(doc)
  if (!doc.sheetSchemaVersion && doc.pages.some(p => p.id === 'pg-0-1')) {
    const base = doc.pages.find(p => p.id === 'pg-0-1')!
    const additions: CadPage[] = (['spec', 'cabinetSpec', 'layout'] as const).filter(report => !doc.pages.some(p => p.report === report)).map((report, i) => ({ ...base, id: `pg-generated-${report}`, number: `0.${i + 3}`, functionGroup: '=GA', title: ['Spezifikationen Allgemein', 'Spezifikationen Verteiler', 'Aufbauplan'][i], kind: 'report', report, symbols: [], wires: [], potentials: [], junctions: [], texts: [], lines: [] }))
    doc = { ...doc, sheetSchemaVersion: 1, pages: [...doc.pages, ...additions] }
  }
  doc = { ...doc, pages: doc.pages.map(p => {
    const group = doc.functionGroups.find(g => g.id === p.functionGroup) ?? doc.functionGroups.find(g => g.label === p.functionGroup)
    return group ? { ...p, functionGroup: group.id } : p
  }) }
  const groups = [...doc.functionGroups]
  for (const p of doc.pages) {
    if (!groups.some(g => g.id === p.functionGroup)) {
      const desired = Number(p.number.split('.')[0])
      const no = Number.isFinite(desired) && !groups.some(g => g.no === desired) ? desired : Math.max(0, ...groups.map((g, i) => g.no ?? i)) + 1
      groups.push({ id: p.functionGroup, label: p.functionGroup, no })
    }
  }
  const next = { ...doc, functionGroups: groups }
  const ordered = sortedPages(next)
  const counters = new Map<string, number>()
  const pages = ordered.map(p => {
    const no = groupNo(next, p.functionGroup)
    const idx = (counters.get(p.functionGroup) ?? 0) + 1
    counters.set(p.functionGroup, idx)
    const number = no === Number.MAX_SAFE_INTEGER ? p.number : `${no}.${idx}`
    return number === p.number ? p : { ...p, number }
  })
  return { ...next, pages }
}

export function synchronizePage(doc: CadDocument, before: CadPage, after: CadPage): CadPage {
  if (after.number !== before.number) {
    const no = Number(after.number.split('.')[0])
    const group = doc.functionGroups.find(g => groupNo(doc, g.id) === no)
    if (Number.isFinite(no)) after = { ...after, functionGroup: group?.id ?? `=${no}` }
  } else if (after.functionGroup !== before.functionGroup) {
    const no = groupNo(doc, after.functionGroup)
    const max = Math.max(0, ...doc.pages.filter(p => p.functionGroup === after.functionGroup && p.id !== after.id).map(p => Number(p.number.split('.')[1]) || 0))
    if (no !== Number.MAX_SAFE_INTEGER) after = { ...after, number: `${no}.${max + 1}` }
  }
  return after
}

export function moveSheet(doc: CadDocument, id: string, group: string, beforeId?: string): CadDocument {
  const moved = doc.pages.find(p => p.id === id)
  if (!moved || id === beforeId) return doc
  const target = sortedPages(doc).filter(p => p.functionGroup === group && p.id !== id)
  const at = beforeId ? target.findIndex(p => p.id === beforeId) : target.length
  target.splice(at < 0 ? target.length : at, 0, { ...moved, functionGroup: group })
  const numbers = new Map(target.map((p, i) => [p.id, `${groupNo(doc, group)}.${i + 1}`]))
  return normalizePages({ ...doc, pages: doc.pages.map(p => numbers.has(p.id) ? { ...p, functionGroup: group, number: numbers.get(p.id)! } : p) })
}
