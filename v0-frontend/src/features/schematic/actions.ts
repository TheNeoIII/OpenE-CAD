import { create } from 'zustand'
import { getActivePage, updatePage, useDocumentStore } from '@/stores/documentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { pageShapes, type CadDocument, type CadLine, type CadObject, type CadPage, type FunctionGroup, type CadSymbol, type CadText, type LineStyle, type Point, type Rotation, type SymbolKind, type TextStyle } from '@/types/cad'
import type { Article, Device, Placement } from '@/types/device'
import { uid } from '@/utils/format'
import { useProjectStore } from '@/stores/projectStore'
import { projectEditorLabel } from '@/stores/userDirectoryStore'
import { useUiStore } from '@/stores/uiStore'
import { useToolStore } from '@/stores/toolStore'
import { groupNo, nextNumberInGroup, sortedPages } from '@/utils/pages'
import { insertWire, pruneJunctions } from './models/connectivity'
import { connectedConductors } from './models/netTrace'
import { findObject, objectBounds, simplifyPolyline, translateObject } from './models/geometry'
import { centerOn } from './viewport'
import type { SnapResult } from './models/snap'
import { currentSymbolVersion, symbolDef, symbolMeta } from './models/symbolLibrary'
import { relocateWireEndPage, extendRailEndPage, moveJunctionPage, movePage, moveSegmentPage, relocateJunctionPage } from './models/wireEdit'

export function relocateWireEnd(wireId: string, end: 'start' | 'end', target: SnapResult) {
  withPage('Leiterende neu angeschlossen', (p) => relocateWireEndPage(p, wireId, end, target))
}

export function extendRailEnd(railId: string, end: 'x1' | 'x2', target: SnapResult) {
  withPage('Schienenende angeschlossen', (p) => extendRailEndPage(p, railId, end, target))
}

const commit = (label: string, fn: (d: CadDocument) => CadDocument) => useDocumentStore.getState().commit(label, fn)
const activeId = () => useDocumentStore.getState().activePageId

export function detachRailReferences(railId: string) {
  const pageId = activeId()
  commit('Schienenverweise beweglich gemacht', (doc) => ({ ...doc, pages: doc.pages.map((p) => {
    if (p.id !== pageId) return p
    const rail = p.potentials.find((r) => r.id === railId)
    if (!rail) return p
    const refs: CadText[] = (['left', 'right'] as const).flatMap((side) => {
      const text = side === 'left' ? rail.xrefLeft : rail.xrefRight
      return text ? [{ id: uid('xref'), type: 'text' as const, style: 'xref' as const, text, size: 22, anchor: 'start' as const, position: { x: side === 'left' ? rail.x1 : rail.x2, y: rail.y }, xref: { targetPageId: '', peerId: '', side } }] : []
    })
    return { ...p, potentials: p.potentials.map((r) => r.id === railId ? { ...r, xrefLeft: undefined, xrefRight: undefined } : r), texts: [...p.texts, ...refs] }
  }) }))
}

/** Target page of a cross-reference: explicit link first, otherwise the page number written in the tag ("/2.2" or "/2.2.A1"). */
export function crossReferenceTarget(doc: CadDocument, ref: CadText): CadPage | undefined {
  const linked = ref.xref?.targetPageId ? doc.pages.find((p) => p.id === ref.xref!.targetPageId) : undefined
  if (linked) return linked
  const no = ref.text.match(/\/(\d+\.\d+)/)?.[1]
  return no ? doc.pages.find((p) => p.number === no) : undefined
}

export function goToCrossReference(id: string | undefined) {
  const state = useDocumentStore.getState()
  const doc = state.document
  const page = getActivePage()
  const ref = doc && page && id ? page.texts.find((t) => t.id === id && t.style === 'xref') : undefined
  if (!doc || !ref) return
  const target = crossReferenceTarget(doc, ref)
  if (!target) return useUiStore.getState().toast(`Zielblatt für „${ref.text}“ nicht gefunden`, 'error')
  const peer = target.texts.find((t) => t.id === ref.xref?.peerId) ?? target.texts.find((t) => t.style === 'xref' && crossReferenceTarget(doc, t)?.id === page!.id)
  state.setActivePage(target.id)
  useSelectionStore.getState().set(peer ? [peer.id] : [])
  if (peer) requestAnimationFrame(() => centerOn(objectBounds(peer)))
}

export function addCrossReference(targetPageId: string, column: string, end: 'start' | 'end') {
  const sourceId = activeId()
  const selectedId = useSelectionStore.getState().ids[0]
  commit('Querverweispaar eingefügt', (doc) => {
    const source = doc.pages.find((p) => p.id === sourceId)
    const target = doc.pages.find((p) => p.id === targetPageId)
    if (!source || !target || source.id === target.id) return doc
    const object = findObject(source, selectedId)
    const position = object?.type === 'potential'
      ? { x: end === 'start' ? object.x1 : object.x2, y: object.y }
      : object?.type === 'wire' || object?.type === 'line'
        ? object.points[end === 'start' ? 0 : object.points.length - 1]
        : { x: 400, y: 400 }
    const a = uid('xref'), b = uid('xref')
    const make = (id: string, peerId: string, targetPageId: string, text: string, position: Point, side: 'left' | 'right'): CadText => ({ id, type: 'text', position, text, size: 22, style: 'xref', anchor: 'start', xref: { peerId, targetPageId, side } })
    return { ...doc, pages: doc.pages.map((p) => p.id === source.id
      ? { ...p, texts: [...p.texts, make(a, b, target.id, `/${target.number}.${column}`, position, end === 'start' ? 'left' : 'right')] }
      : p.id === target.id ? { ...p, texts: [...p.texts, make(b, a, source.id, `/${source.number}`, { x: 400, y: 400 }, end === 'start' ? 'right' : 'left')] } : p) }
  })
}

function nextBmk(doc: CadDocument, prefix: string) {
  const nums = doc.devices.map((d) => d.bmk.match(new RegExp(`^-${prefix}(\\d+)$`))?.[1]).filter(Boolean).map(Number)
  return `-${prefix}${(nums.length ? Math.max(...nums) : 0) + 1}`
}

function newDevice(doc: CadDocument, kind: SymbolKind, poles: 1 | 3): Device {
  const def = symbolMeta(kind, poles)
  return {
    id: uid('dev'),
    bmk: nextBmk(doc, def.bmkPrefix),
    function: def.label,
    location: def.mount === 'field' ? '+FELD' : (doc.cabinets[0]?.name ?? '+UV1'),
    distributor: '',
    category: def.category,
    articleId: null,
    manufacturer: '',
    articleNo: '',
    type: '',
    ratedCurrent: null,
    ac3Power: null,
    coilVoltage: '',
    auxContacts: '',
    widthTE: def.mount === 'rail' ? 1 : 0,
    dimensions: '',
    mount: def.mount,
    placement: null,
  }
}

function withPage(label: string, fn: (p: CadPage, doc: CadDocument) => CadPage) {
  const pageId = activeId()
  if (!pageId) return
  commit(label, (doc) => updatePage(doc, pageId, (p) => fn(p, doc)))
}

export function addSymbol(kind: SymbolKind, poles: 1 | 3, position: Point) {
  const pageId = activeId()
  if (!pageId) return
  let createdId = ''
  commit(`${symbolMeta(kind, poles).label} platziert`, (doc) => {
    const base = newDevice(doc, kind, poles)
    const a = useToolStore.getState().placeArticle
    const dev: Device = a
      ? { ...base, function: a.description, articleId: a.id, manufacturer: a.manufacturer, articleNo: a.articleNo, type: a.type, ratedCurrent: a.ratedCurrent, ac3Power: a.ac3Power, coilVoltage: a.coilVoltage, auxContacts: a.auxContacts, widthTE: a.widthTE, dimensions: a.dimensions }
      : base
    const sym: CadSymbol = { id: uid('sym'), type: 'symbol', kind, deviceId: dev.id, position, rotation: 0, poles: symbolDef(kind).supportsPoles ? poles : 1, symbolVersion: currentSymbolVersion(kind) }
    if (kind === 'terminal') sym.terminalNo = '1'
    createdId = sym.id
    return updatePage({ ...doc, devices: [...doc.devices, dev] }, pageId, (p) => ({ ...p, symbols: [...p.symbols, sym] }))
  })
  if (createdId) useSelectionStore.getState().set([createdId])
}

/**
 * Commits an electrical wire. `points` must be the exact snapped preview polyline;
 * coordinates are stored unchanged (only redundant collinear vertices are dropped).
 */
export function addWire(points: Point[], start: SnapResult | null = null, end: SnapResult | null = null) {
  const clean = simplifyPolyline(points)
  if (clean.length < 2) return null
  let result: { wireId: string; junctions: number } | null = null
  withPage('Leitung gezeichnet', (p) => {
    const r = insertWire(p, clean, start, end)
    result = { wireId: r.wire.id, junctions: r.junctions.length }
    return r.page
  })
  return result as { wireId: string; junctions: number } | null
}

/** Commits a generic graphical line (may be diagonal, never electrical). */
export function addLine(a: Point, b: Point, style: LineStyle = 'solid') {
  if (a.x === b.x && a.y === b.y) return
  const line: CadLine = { id: uid('ln'), type: 'line', points: [{ ...a }, { ...b }], style }
  withPage('Linie gezeichnet', (p) => ({ ...p, lines: [...p.lines, line] }))
}

export function addText(position: Point, text: string, style: TextStyle = 'note') {
  const t: CadText = { id: uid('t'), type: 'text', position, text, size: style === 'xref' ? 22 : 28, style, anchor: 'start' }
  withPage(style === 'xref' ? 'Querverweis eingefügt' : 'Text eingefügt', (p) => ({ ...p, texts: [...p.texts, t] }))
  useSelectionStore.getState().set([t.id])
}

export function addPotential(name: string, y: number) {
  withPage(`Potential ${name} eingefügt`, (p) => ({ ...p, potentials: [...p.potentials, { id: uid('pot'), type: 'potential', name, y, x1: 200, x2: 4000 }] }))
}

function mapObjects(p: CadPage, ids: Set<string>, fn: (o: CadObject) => CadObject): CadPage {
  const m = <T extends CadObject>(arr: T[]) => arr.map((o) => (ids.has(o.id) ? (fn(o) as T) : o))
  const s = pageShapes(p)
  return { ...p, symbols: m(p.symbols), wires: m(p.wires), junctions: m(p.junctions), texts: m(p.texts), potentials: m(p.potentials), lines: m(p.lines), rectangles: m(s.rectangles), ellipses: m(s.ellipses), images: m(s.images) }
}

export function moveObjects(ids: string[], dx: number, dy: number) {
  if (!ids.length || (dx === 0 && dy === 0)) return
  withPage(`${ids.length} Objekt(e) verschoben`, (p) => movePage(p, ids, dx, dy))
}

/** Moves one wire segment perpendicular to its direction; returns the segment's new index. */
export function moveWireSegment(wireId: string, index: number, delta: number) {
  let next = index
  withPage('Leitungsabschnitt verschoben', (p) => {
    const r = moveSegmentPage(p, wireId, index, delta)
    next = r.index
    return r.page
  })
  return next
}

/** Slides a clamp point along the line it sits on. */
export function moveJunction(at: Point, delta: number) {
  withPage('Klemmpunkt verschoben', (p) => moveJunctionPage(p, at, delta))
}

/** Moves a clamp point (with its branch wires) to any other line, pin or position. */
export function relocateJunction(at: Point, target: SnapResult) {
  withPage('Klemmpunkt umgesetzt', (p) => relocateJunctionPage(p, at, target))
}

export function rotateObjects(ids: string[]) {
  const set = new Set(ids)
  withPage('Gedreht', (p) => mapObjects(p, set, (o) => (o.type === 'symbol' ? { ...o, rotation: (((o.rotation + 90) % 360) as Rotation) } : o)))
}

export function updateObject(id: string, patch: Partial<CadObject>, label = 'Eigenschaft ge��ndert') {
  withPage(label, (p) => mapObjects(p, new Set([id]), (o) => ({ ...o, ...patch }) as CadObject))
}

/** Copies the line style of `sourceId` to every conductor galvanically connected to it (through junctions, rails and terminals). */
export function applyStyleToConnected(sourceId: string): number {
  const pageId = activeId()
  const page = useDocumentStore.getState().document?.pages.find((p) => p.id === pageId)
  if (!page) return 0
  const src = page.wires.find((w) => w.id === sourceId) ?? page.potentials.find((r) => r.id === sourceId)
  if (!src) return 0
  const targets = connectedConductors(page, sourceId).filter((id) => id !== sourceId)
  if (!targets.length) return 0
  const patch = { color: src.color ?? 'auto', lineStyle: src.lineStyle, weight: src.weight, preset: src.preset }
  updateObjects(targets, patch as Partial<CadObject>, `Leiterstil auf ${targets.length} verbundene Leiter übertragen`)
  return targets.length
}

export function resizeRails(ids: string[], end: 'x1' | 'x2', delta: number) {
  if (!Number.isFinite(delta) || delta === 0) return
  const selected = new Set(ids)
  withPage('Schienen gemeinsam verlängert/gekürzt', (p) => ({
    ...p,
    potentials: p.potentials.map((r) => selected.has(r.id) ? { ...r, [end]: r[end] + delta } : r),
  }))
}

export function updateObjects(ids: string[], patch: Partial<CadObject>, label = 'Eigenschaft geändert') {
  withPage(label, (p) => mapObjects(p, new Set(ids), (o) => ({ ...o, ...patch }) as CadObject))
  }

/** Like updateObjects, but derives the patch per object so dependent fields (e.g. label offsets) stay correct; still one history entry. */
export function updateObjectsWith(ids: string[], patchFor: (o: CadObject) => Partial<CadObject>, label = 'Eigenschaft geändert') {
  withPage(label, (p) => mapObjects(p, new Set(ids), (o) => ({ ...o, ...patchFor(o) }) as CadObject))
}

export function updateDevices(ids: string[], patch: Partial<Device>, label = 'Betriebsmittel geändert') {
  if (!ids.length) return
  const set = new Set(ids)
  commit(label, (doc) => ({ ...doc, devices: doc.devices.map((d) => (set.has(d.id) ? { ...d, ...patch } : d)) }))
}

export function deleteObjects(ids: string[]) {
  if (!ids.length) return
  const set = new Set(ids)
  withPage(`${ids.length} Objekt(e) gelöscht`, (p) =>
    pruneJunctions({
      ...p,
      symbols: p.symbols.filter((o) => !set.has(o.id)),
      wires: p.wires.filter((o) => !set.has(o.id)),
      junctions: p.junctions.filter((o) => !set.has(o.id)),
      texts: p.texts.filter((o) => !set.has(o.id)),
      potentials: p.potentials.filter((o) => !set.has(o.id)),
      lines: p.lines.filter((o) => !set.has(o.id)),
      rectangles: pageShapes(p).rectangles.filter((o) => !set.has(o.id)),
      ellipses: pageShapes(p).ellipses.filter((o) => !set.has(o.id)),
      images: pageShapes(p).images.filter((o) => !set.has(o.id)),
    }),
  )
  useSelectionStore.getState().clear()
}

/* ---------------- clipboard ---------------- */

/**
 * App-wide clipboard. It lives outside the per-project document, so content copied in
 * one open project can be pasted into any other open project.
 */
interface ClipboardState {
  objects: CadObject[]
  devices: Device[]
  /** Whole pages (exclusive with `objects`). */
  pages: CadPage[]
  groups: FunctionGroup[]
  sourceProjectId: string | null
  sourcePageId: string | null
}
export const useClipboardStore = create<ClipboardState>(() => ({ objects: [], devices: [], pages: [], groups: [], sourceProjectId: null, sourcePageId: null }))

const currentProjectId = () => useProjectStore.getState().current?.id ?? null

export function copySelection() {
  const page = getActivePage()
  const doc = useDocumentStore.getState().document
  if (!page || !doc) return 0
  const objects = useSelectionStore.getState().ids.map((id) => findObject(page, id)).filter((o): o is CadObject => !!o && o.type !== 'potential')
  const devIds = new Set(objects.flatMap((o) => (o.type === 'symbol' && o.deviceId ? [o.deviceId] : [])))
  useClipboardStore.setState({
    objects: structuredClone(objects),
    devices: structuredClone(doc.devices.filter((d) => devIds.has(d.id))),
    pages: [],
    groups: [],
    sourceProjectId: currentProjectId(),
    sourcePageId: page.id,
  })
  return objects.length
}

/** Pages chosen in the navigator, falling back to the active page. */
export function selectedPageIds(): string[] {
  const doc = useDocumentStore.getState().document
  if (!doc) return []
  const sel = useUiStore.getState().pageSelection.filter((id) => doc.pages.some((p) => p.id === id))
  if (sel.length) return sel
  const a = activeId()
  return a ? [a] : []
}

/** Copies whole pages including their devices and function groups. */
export function copyPages(ids: string[]) {
  const doc = useDocumentStore.getState().document
  if (!doc || !ids.length) return 0
  const wanted = new Set(ids)
  const pages = sortedPages(doc).filter((p) => wanted.has(p.id))
  const devIds = new Set(pages.flatMap((p) => p.symbols.flatMap((s) => (s.deviceId ? [s.deviceId] : []))))
  const groupIds = new Set(pages.map((p) => p.functionGroup))
  useClipboardStore.setState({
    objects: [],
    devices: structuredClone(doc.devices.filter((d) => devIds.has(d.id))),
    pages: structuredClone(pages),
    groups: structuredClone(doc.functionGroups.filter((g) => groupIds.has(g.id)).map((g) => ({ ...g, no: groupNo(doc, g.id) }))),
    sourceProjectId: currentProjectId(),
    sourcePageId: null,
  })
  return pages.length
}

/** Inserts clipboard pages into the foreground project with fresh ids, BMKs and sheet numbers. */
export function pastePages() {
  const { pages, devices, groups, sourceProjectId } = useClipboardStore.getState()
  if (!pages.length || !useDocumentStore.getState().document) return 0
  const sameProject = sourceProjectId === currentProjectId()
  const editedBy = projectEditorLabel(useProjectStore.getState().current) || undefined
  const newIds: string[] = []
  commit(`${pages.length} Seite(n) eingefügt`, (doc) => {
    let working = doc
    for (const g of groups) {
      if (working.functionGroups.some((x) => x.id === g.id)) continue
      const used = new Set(working.functionGroups.map((x) => groupNo(working, x.id)))
      let no = g.no ?? 0
      if (used.has(no)) no = Math.max(-1, ...used) + 1
      working = { ...working, functionGroups: [...working.functionGroups, { ...g, no }] }
    }
    const devMap = new Map<string, string>()
    for (const d of devices) {
      const prefix = d.bmk.replace(/^-/, '').replace(/\d+$/, '') || 'X'
      const bmk = working.devices.some((x) => x.bmk === d.bmk) ? nextBmk(working, prefix) : d.bmk
      const nd: Device = { ...d, id: uid('dev'), bmk, placement: null }
      devMap.set(d.id, nd.id)
      working = { ...working, devices: [...working.devices, nd] }
    }
    const re = <T extends { id: string }>(arr: T[], prefix: string) => arr.map((o) => ({ ...structuredClone(o), id: uid(prefix) }))
    for (const src of pages) {
      const page: CadPage = {
        ...structuredClone(src),
        id: uid('pg'),
        number: nextNumberInGroup(working, src.functionGroup),
        title: sameProject ? `${src.title} (Kopie)` : src.title,
        updatedAt: new Date().toISOString(),
        editedBy: editedBy ?? src.editedBy,
        symbols: re(src.symbols, 'sym').map((s) => (s.deviceId ? { ...s, deviceId: devMap.get(s.deviceId) ?? s.deviceId } : s)),
        wires: re(src.wires, 'wire'),
        junctions: re(src.junctions, 'junction'),
        texts: re(src.texts, 'text'),
        potentials: re(src.potentials, 'pot'),
        lines: re(src.lines, 'ln'),
        rectangles: re(pageShapes(src).rectangles, 'rect'),
        ellipses: re(pageShapes(src).ellipses, 'ell'),
        images: re(pageShapes(src).images, 'img'),
      }
      newIds.push(page.id)
      working = { ...working, pages: [...working.pages, page] }
    }
    return working
  })
  if (newIds[0]) {
    useDocumentStore.getState().setActivePage(newIds[0])
    useUiStore.getState().set({ pageSelection: newIds })
  }
  return newIds.length
}

export function pasteClipboard(offset?: number) {
  const { objects, devices, sourceProjectId, sourcePageId } = useClipboardStore.getState()
  const pageId = activeId()
  if (!objects.length || !pageId) return
  offset ??= sourceProjectId === currentProjectId() && sourcePageId === pageId ? 100 : 0
  const newIds: string[] = []
  commit(`${objects.length} Objekt(e) eingefügt`, (doc) => {
    const devMap = new Map<string, Device>()
    let working = doc
    for (const d of devices) {
      const prefix = d.bmk.replace(/^-/, '').replace(/\d+$/, '') || 'X'
      const nd = { ...d, id: uid('dev'), bmk: nextBmk(working, prefix), placement: null }
      devMap.set(d.id, nd)
      working = { ...working, devices: [...working.devices, nd] }
    }
    const clones = objects.map((o) => {
      const moved = translateObject({ ...o, id: uid(o.type) }, offset, offset)
      if (moved.type === 'symbol' && moved.deviceId) moved.deviceId = devMap.get(moved.deviceId)?.id ?? moved.deviceId
      newIds.push(moved.id)
      return moved
    })
    return updatePage(working, pageId, (p) => ({
      ...p,
      symbols: [...p.symbols, ...clones.filter((o): o is CadSymbol => o.type === 'symbol')],
      wires: [...p.wires, ...clones.filter((o) => o.type === 'wire')],
      junctions: [...p.junctions, ...clones.filter((o) => o.type === 'junction')],
      texts: [...p.texts, ...clones.filter((o): o is CadText => o.type === 'text')],
      lines: [...p.lines, ...clones.filter((o): o is CadLine => o.type === 'line')],
      rectangles: [...pageShapes(p).rectangles, ...clones.filter((o) => o.type === 'rectangle')],
      ellipses: [...pageShapes(p).ellipses, ...clones.filter((o) => o.type === 'ellipse')],
      images: [...pageShapes(p).images, ...clones.filter((o) => o.type === 'image')],
    }))
  })
  useSelectionStore.getState().set(newIds)
}

/* ---------------- devices ---------------- */

export function updateDevice(id: string, patch: Partial<Device>, label = 'Betriebsmittel geändert') {
  commit(label, (doc) => ({ ...doc, devices: doc.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
}

export function assignArticle(deviceId: string, a: Article) {
  updateDevice(
    deviceId,
    { articleId: a.id, manufacturer: a.manufacturer, articleNo: a.articleNo, type: a.type, ratedCurrent: a.ratedCurrent, ac3Power: a.ac3Power, coilVoltage: a.coilVoltage, auxContacts: a.auxContacts, widthTE: a.widthTE, dimensions: a.dimensions },
    `Artikel ${a.articleNo} zugewiesen`,
  )
}

export function placeDevice(deviceId: string, cabinetId: string, row: number, index: number) {
  commit('Im Aufbau platziert', (doc) => {
    const others = doc.devices.filter((d) => d.id !== deviceId && d.placement?.cabinetId === cabinetId && d.placement.row === row).sort((a, b) => a.placement!.order - b.placement!.order)
    const order = new Map<string, Placement>()
    const target = doc.devices.find((d) => d.id === deviceId)
    if (!target) return doc
    const seq = [...others]
    seq.splice(Math.min(index, seq.length), 0, target)
    seq.forEach((d, i) => order.set(d.id, { cabinetId, row, order: i }))
    return { ...doc, devices: doc.devices.map((d) => (order.has(d.id) ? { ...d, placement: order.get(d.id)!, location: doc.cabinets.find((c) => c.id === cabinetId)?.name ?? d.location } : d)) }
  })
}

export function unplaceDevice(deviceId: string) {
  updateDevice(deviceId, { placement: null }, 'Aus Aufbau entfernt')
}

export function autoPlace(cabinetId: string) {
  commit('Automatisch platziert', (doc) => {
    const cab = doc.cabinets.find((c) => c.id === cabinetId)
    if (!cab) return doc
    const used = Array.from({ length: cab.rows }, (_, r) => doc.devices.filter((d) => d.placement?.cabinetId === cabinetId && d.placement.row === r))
    const fill = used.map((r) => r.reduce((s, d) => s + d.widthTE, 0))
    const devices = doc.devices.map((d) => {
      if (d.mount !== 'rail' || d.placement) return d
      const row = fill.findIndex((f) => f + d.widthTE <= cab.rowCapacityTE)
      if (row < 0) return d
      fill[row] += d.widthTE
      used[row].push(d)
      return { ...d, placement: { cabinetId, row, order: used[row].length - 1 } }
    })
    return { ...doc, devices }
  })
}

export function addCabinetRow(cabinetId: string) {
  commit('Tragschiene hinzugefügt', (doc) => ({ ...doc, cabinets: doc.cabinets.map((c) => (c.id === cabinetId ? { ...c, rows: c.rows + 1 } : c)) }))
}

/* ---------------- pages ---------------- */

export function addPage(afterId?: string, options: Partial<Pick<CadPage, 'kind' | 'format' | 'customSize' | 'title'>> = {}) {
  const doc = useDocumentStore.getState().document
  if (!doc) return
  const ref = doc.pages.find((p) => p.id === (afterId ?? activeId())) ?? doc.pages[doc.pages.length - 1]
  const id = uid('pg')
  const number = nextNumberInGroup(doc, ref.functionGroup)
  const page: CadPage = { id, number, title: 'Neue Seite', functionGroup: ref.functionGroup, format: ref.format, customSize: ref.customSize, kind: 'schematic', ...options, revision: 'A', updatedAt: new Date().toISOString(), symbols: [], wires: [], junctions: [], texts: [], potentials: [], lines: [] }
  commit('Seite angelegt', (d) => {
    const idx = d.pages.findIndex((p) => p.id === ref.id)
    const pages = [...d.pages]
    pages.splice(idx + 1, 0, page)
    return { ...d, pages }
  })
  useDocumentStore.getState().setActivePage(id)
  return id
}

export function duplicatePage(pageId: string) {
  const doc = useDocumentStore.getState().document
  const src = doc?.pages.find((p) => p.id === pageId)
  if (!doc || !src) return
  const id = uid('pg')
  const re = <T extends { id: string }>(arr: T[]) => arr.map((o) => ({ ...o, id: uid('o') }))
  const copy: CadPage = { ...structuredClone(src), id, number: `${src.number}a`, title: `${src.title} (Kopie)`, symbols: re(src.symbols), wires: re(src.wires), junctions: re(src.junctions), texts: re(src.texts), potentials: re(src.potentials), lines: re(src.lines), rectangles: re(pageShapes(src).rectangles), ellipses: re(pageShapes(src).ellipses), images: re(pageShapes(src).images) }
  commit('Seite dupliziert', (d) => {
    const idx = d.pages.findIndex((p) => p.id === pageId)
    const pages = [...d.pages]
    pages.splice(idx + 1, 0, copy)
    return { ...d, pages }
  })
  useDocumentStore.getState().setActivePage(id)
}

export interface FunctionGroupEdit {
  /** Group id before the edit; null for newly added groups. */
  origId: string | null
  group: FunctionGroup
}

/** Replaces the group list; renamed ids and changed group numbers are carried over to the pages. */
export function applyFunctionGroups(entries: FunctionGroupEdit[]) {
  commit('Funktionsgruppen geändert', (doc) => {
    const byOrig = new Map(entries.filter((e) => e.origId).map((e) => [e.origId!, e]))
    const pages = doc.pages.map((p) => {
      const e = byOrig.get(p.functionGroup)
      if (!e) return p
      const old = doc.functionGroups.find((g) => g.id === p.functionGroup)
      const oldNo = old?.no ?? doc.functionGroups.indexOf(old!)
      const sheet = p.number.includes('.') ? p.number.slice(p.number.indexOf('.') + 1) : p.number
      const number = oldNo !== e.group.no ? `${e.group.no}.${sheet}` : p.number
      return number === p.number && e.group.id === p.functionGroup ? p : { ...p, functionGroup: e.group.id, number }
    })
    return { ...doc, functionGroups: entries.map((e) => e.group), pages }
  })
}

export function updatePageMeta(pageId: string, patch: Partial<Pick<CadPage, 'title' | 'number' | 'format' | 'customSize' | 'functionGroup' | 'revision'>>) {
  commit('Seiteneigenschaften geändert', (doc) => updatePage(doc, pageId, (p) => ({ ...p, ...patch })))
}

export function deletePage(pageId: string) {
  const doc = useDocumentStore.getState().document
  if (!doc || doc.pages.length <= 1) return
  const idx = doc.pages.findIndex((p) => p.id === pageId)
  commit('Seite gelöscht', (d) => ({ ...d, pages: d.pages.filter((p) => p.id !== pageId) }))
  const next = doc.pages[idx + 1] ?? doc.pages[idx - 1]
  if (next) useDocumentStore.getState().setActivePage(next.id)
}
