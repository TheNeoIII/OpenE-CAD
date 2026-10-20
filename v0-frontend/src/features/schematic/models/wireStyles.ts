import type { CadDocument, CadPotential, CadWire, LineStyle, PotentialDef, WireColor, WirePreset, WireWeight } from '@/types/cad'

export type { PotentialDef, WirePreset }

export const WIRE_PRESETS: WirePreset[] = [
  { id: 'main', label: 'Hauptstrom (L1–L3)', color: 'black', lineStyle: 'solid', weight: 'thick', crossSection: '2,5 mm²' },
  { id: 'neutral', label: 'Neutralleiter N', color: 'blue', lineStyle: 'solid', weight: 'thick', crossSection: '2,5 mm²' },
  { id: 'pe', label: 'Schutzleiter PE', color: 'green', lineStyle: 'solid', weight: 'thick', crossSection: '2,5 mm²' },
  { id: 'ctrl-ac', label: 'Steuerstrom 230 V AC', color: 'red', lineStyle: 'solid', weight: 'normal', crossSection: '1,5 mm²' },
  { id: 'ctrl-dc', label: 'Steuerspannung 24 V DC', color: 'blue', lineStyle: 'solid', weight: 'thin', crossSection: '0,75 mm²' },
  { id: 'foreign', label: 'Fremdspannung', color: 'orange', lineStyle: 'dashed', weight: 'normal', crossSection: '1,5 mm²' },
  { id: 'signal', label: 'Signal / Bus', color: 'violet', lineStyle: 'dashdot', weight: 'thin', crossSection: '0,5 mm²' },
]

export const WIRE_COLOR_LABELS: Record<WireColor, string> = {
  auto: 'Automatisch (nach Potential)',
  black: 'Schwarz',
  brown: 'Braun',
  gray: 'Grau',
  blue: 'Blau',
  red: 'Rot',
  green: 'Grün-Gelb',
  orange: 'Orange',
  violet: 'Violett',
}

export const WIRE_STROKE: Record<Exclude<WireColor, 'auto'>, string> = {
  black: 'var(--w-main)',
  blue: 'var(--w-blue)',
  red: 'var(--w-red)',
  green: 'var(--w-green)',
  gray: 'var(--w-gray)',
  brown: '#8b5a2b',
  orange: '#e07b00',
  violet: '#8a4fc7',
}

export const wireStroke = (color: WireColor) => /^#[0-9a-f]{6}$/i.test(color) ? color : color === 'auto' ? 'var(--w-main)' : WIRE_STROKE[color] ?? 'var(--w-main)'

export const LINE_STYLE_LABELS: Record<LineStyle, string> = { solid: 'Durchgezogen', dashed: 'Gestrichelt', dashdot: 'Strichpunkt' }
export const WIRE_WEIGHT_LABELS: Record<WireWeight, string> = { thin: 'Dünn', normal: 'Normal', thick: 'Dick' }

import { LINE_DASH } from '@/features/drawing/styles'
export { LINE_DASH }
export const WEIGHT_FACTOR: Record<WireWeight, number> = { thin: 0.65, normal: 1, thick: 1.4 }

export const presetsOf = (doc: Pick<CadDocument, 'wirePresets'> | null | undefined) => doc?.wirePresets ?? WIRE_PRESETS

export function presetPatch(p: WirePreset): Partial<CadWire> {
  return { preset: p.id, color: p.color, lineStyle: p.lineStyle, weight: p.weight, crossSection: p.crossSection }
}

/** Re-applies (edited) library presets to every wire and rail of a document that uses them. */
export function syncPresets(doc: CadDocument, prevList: WirePreset[], next: WirePreset[]): CadDocument {
  const old = new Map(prevList.map((p) => [p.id, p]))
  const byId = new Map(next.map((p) => [p.id, p]))
  const sync = <T extends CadWire | CadPotential>(o: T): T => {
    if (!o.preset) return o
    const p = byId.get(o.preset)
    if (!p) return { ...o, preset: undefined }
    const prev = old.get(o.preset)
    const keepCs = prev && o.crossSection !== prev.crossSection
    return { ...o, color: p.color, lineStyle: p.lineStyle, weight: p.weight, crossSection: keepCs ? o.crossSection : p.crossSection }
  }
  return {
    ...doc,
    pages: doc.pages.map((pg) => pg.kind === 'schematic' ? ({ ...pg, wires: pg.wires.map(sync), potentials: pg.potentials.map(sync) }) : pg),
  }
}

export const DEFAULT_POTENTIALS: PotentialDef[] = [
  { id: 'pot-l1', name: 'L1', description: 'Außenleiter 1', presetId: 'main' },
  { id: 'pot-l2', name: 'L2', description: 'Außenleiter 2', presetId: 'main' },
  { id: 'pot-l3', name: 'L3', description: 'Außenleiter 3', presetId: 'main' },
  { id: 'pot-n', name: 'N', description: 'Neutralleiter', presetId: 'neutral' },
  { id: 'pot-pe', name: 'PE', description: 'Schutzleiter', presetId: 'pe' },
  { id: 'pot-fl1', name: 'F/L1', description: 'Außenleiter 1 nach FI', presetId: 'main' },
  { id: 'pot-fl2', name: 'F/L2', description: 'Außenleiter 2 nach FI', presetId: 'main' },
  { id: 'pot-fl3', name: 'F/L3', description: 'Außenleiter 3 nach FI', presetId: 'main' },
  { id: 'pot-fn', name: 'F/N', description: 'Neutralleiter nach FI', presetId: 'neutral' },
  { id: 'pot-lp', name: 'L+', description: 'Steuerspannung 24 V DC +', presetId: 'ctrl-ac' },
  { id: 'pot-m', name: 'M', description: 'Steuerspannung 24 V DC −', presetId: 'ctrl-dc' },
]

export const potentialDefsOf = (doc: Pick<CadDocument, 'potentialDefs'> | null | undefined) => doc?.potentialDefs ?? DEFAULT_POTENTIALS

type Concrete = Exclude<WireColor, 'auto'>

/** Fallback for potentials without a definition: strips prefixes like "F/" and matches common names. */
function heuristicColor(p: string | null): Concrete {
  if (!p) return 'black'
  const base = p.includes('/') ? p.slice(p.lastIndexOf('/') + 1) : p
  if (base === 'N' || base === 'M' || base === '0V') return 'blue'
  if (base === 'PE') return 'green'
  if (base === 'L+' || base.includes('24V')) return 'red'
  return 'black'
}

export interface ResolvedStyle {
  color: Concrete
  lineStyle: LineStyle
  weight: WireWeight
}

/** Builds a resolver for the effective style of wires/rails; "auto" pulls the potential's default preset. */
export function styleResolver(doc: Pick<CadDocument, 'potentialDefs' | 'wirePresets'> | null | undefined) {
  const presets = new Map(presetsOf(doc).map((p) => [p.id, p]))
  const byName = new Map(potentialDefsOf(doc).map((d) => [d.name, d.presetId ? presets.get(d.presetId) : undefined]))
  return (o: { color?: WireColor; lineStyle?: LineStyle; weight?: WireWeight }, potential: string | null): ResolvedStyle => {
    const preset = potential ? byName.get(potential) : undefined
    const weight = o.weight ?? preset?.weight ?? 'normal'
    if (o.color && o.color !== 'auto') return { color: o.color, lineStyle: o.lineStyle ?? 'solid', weight }
    if (preset) return { color: preset.color === 'auto' ? heuristicColor(potential) : preset.color, lineStyle: o.lineStyle ?? preset.lineStyle, weight }
    return { color: heuristicColor(potential), lineStyle: o.lineStyle ?? 'solid', weight }
  }
}

/** Potential renames between two definition lists (old name → new name). */
export function potentialRenames(prevList: PotentialDef[], next: PotentialDef[]) {
  const prev = new Map(prevList.map((d) => [d.id, d.name]))
  const renames = new Map<string, string>()
  for (const d of next) {
    const old = prev.get(d.id)
    if (old && old !== d.name) renames.set(old, d.name)
  }
  return renames
}

/** Applies potential renames to every wire and rail of a document. */
export function renamePotentials(doc: CadDocument, renames: Map<string, string>): CadDocument {
  if (!renames.size) return doc
  return {
    ...doc,
    pages: doc.pages.map((pg) => pg.kind === 'schematic' ? ({
      ...pg,
      wires: pg.wires.map((w) => (w.potential && renames.has(w.potential) ? { ...w, potential: renames.get(w.potential)! } : w)),
      potentials: pg.potentials.map((r) => (renames.has(r.name) ? { ...r, name: renames.get(r.name)! } : r)),
    }) : pg),
  }
}

export function potentialUsage(doc: CadDocument) {
  const m = new Map<string, number>()
  for (const pg of doc.pages.filter((p) => p.kind === 'schematic')) {
    for (const w of pg.wires) if (w.potential) m.set(w.potential, (m.get(w.potential) ?? 0) + 1)
    for (const r of pg.potentials) m.set(r.name, (m.get(r.name) ?? 0) + 1)
  }
  return m
}

export function presetUsage(doc: CadDocument) {
  const m = new Map<string, number>()
  for (const pg of doc.pages.filter((p) => p.kind === 'schematic')) for (const o of [...pg.wires, ...pg.potentials]) if (o.preset) m.set(o.preset, (m.get(o.preset) ?? 0) + 1)
  return m
}
