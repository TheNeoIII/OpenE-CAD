import type { CadDocument, CadPage, FunctionGroup } from '@/types/cad'

export function groupNo(doc: CadDocument, groupId: string): number {
  const i = doc.functionGroups.findIndex((g) => g.id === groupId)
  if (i < 0) return Number.MAX_SAFE_INTEGER
  return doc.functionGroups[i].no ?? i
}

export function sortedGroups(doc: CadDocument): FunctionGroup[] {
  return [...doc.functionGroups].sort((a, b) => groupNo(doc, a.id) - groupNo(doc, b.id))
}

/** Pages in document order: by group number, then by group/sheet number. */
export function sortedPages(doc: CadDocument): CadPage[] {
  return [...doc.pages].sort((a, b) => groupNo(doc, a.functionGroup) - groupNo(doc, b.functionGroup) || a.number.localeCompare(b.number, 'de', { numeric: true }))
}

/** 1-based consecutive sheet number across the whole project. */
export function pageSequence(doc: CadDocument, pageId: string): number {
  return sortedPages(doc).findIndex((p) => p.id === pageId) + 1
}

/** Next free group/sheet number inside a group, e.g. "2.5". */
export function nextNumberInGroup(doc: CadDocument, groupId: string, excludePageId?: string): string {
  const no = groupNo(doc, groupId)
  const max = doc.pages
    .filter((p) => p.functionGroup === groupId && p.id !== excludePageId)
    .reduce((m, p) => Math.max(m, parseInt(p.number.split('.')[1] ?? '0', 10) || 0), 0)
  return `${no === Number.MAX_SAFE_INTEGER ? 0 : no}.${max + 1}`
}
