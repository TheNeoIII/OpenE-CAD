import type { BuiltinSymbolKind, CadConnectionPoint, CadDocument, CadSymbol, CustomSymbolDef, Rect, SymbolKind, SymbolOverride, SymbolShape } from '@/types/cad'
import type { DeviceCategory, MountType } from '@/types/device'
import { builtinShapes } from './builtinShapes'
import { BUILTIN_GEOMETRY } from './builtinGeometry'
import { shapePoints } from './shapeTransform'

export interface SymbolDef {
  kind: SymbolKind
  label: string
  description: string
  bmkPrefix: string
  category: DeviceCategory
  mount: MountType
  supportsPoles: boolean
  pins: (s: Pick<CadSymbol, 'poles' | 'pinNames' | 'wayCount' | 'wayNaming'>) => CadConnectionPoint[]
  bbox: (s: Pick<CadSymbol, 'poles' | 'wayCount'>) => Rect
}

const POLE_SPACING = 100

function polePins(poles: number, names?: string[]): CadConnectionPoint[] {
  const pins: CadConnectionPoint[] = []
  for (let i = 0; i < poles; i++) {
    const x = (i - (poles - 1) / 2) * POLE_SPACING
    pins.push({ id: names?.[i * 2] ?? String(i * 2 + 1), x, y: -100 })
    pins.push({ id: names?.[i * 2 + 1] ?? String(i * 2 + 2), x, y: 100 })
  }
  return pins
}

/** Main poles numbered 1–6 plus a switched neutral pole N / N' on the right. */
function neutralPins(poles: number, names?: string[]): CadConnectionPoint[] {
  const count = poles + 1
  const pins = polePins(poles, names).map((p) => ({ ...p, x: p.x - POLE_SPACING / 2 }))
  const x = (poles - (count - 1) / 2) * POLE_SPACING
  pins.push({ id: names?.[poles * 2] ?? 'N', x, y: -100 })
  pins.push({ id: names?.[poles * 2 + 1] ?? "N'", x, y: 100 })
  return pins
}

const poleBox = (poles: number, extraLeft = 0): Rect => {
  const half = ((poles - 1) * POLE_SPACING) / 2
  return { x: -half - 50 - extraLeft, y: -100, w: half * 2 + 100 + extraLeft, h: 200 }
}

/** Conductor names of an outlet; from 3 conductors the two rightmost are always N and PE. */
export function outletPinNames(s: Pick<CadSymbol, 'poles' | 'pinNames' | 'wayCount' | 'wayNaming'>): string[] {
  const count = Math.max(1, s.wayCount ?? s.poles)
  if (s.wayCount == null && !s.wayNaming) return Array.from({ length: count }, (_, i) => s.pinNames?.[i] ?? String(i + 1))
  const phases = count >= 3 ? count - 2 : count
  const generated = Array.from({ length: count }, (_, i) => (i >= phases ? (i === phases ? 'N' : 'PE') : s.wayNaming === 'phases' ? (phases === 1 ? 'L' : `L${i + 1}`) : String(i + 1)))
  return s.wayNaming === 'custom' ? generated.map((g, i) => (i < phases ? s.pinNames?.[i] || g : g)) : generated
}

const twoPin =
  (a: string, b: string) =>
  (s: Pick<CadSymbol, 'pinNames'>): CadConnectionPoint[] => [
    { id: s.pinNames?.[0] ?? a, x: 0, y: -100 },
    { id: s.pinNames?.[1] ?? b, x: 0, y: 100 },
  ]

/** Built-in symbol definitions. Use `symbolDef()` at call sites so project overrides and custom symbols apply. */
export const SYMBOLS: Record<BuiltinSymbolKind, SymbolDef> = {
  breaker: {
    kind: 'breaker',
    label: 'Leitungsschutzschalter',
    description: 'LS / Motorschutzschalter, 1- oder 3-polig',
    bmkPrefix: 'F',
    category: 'Schutzgerät',
    mount: 'rail',
    supportsPoles: true,
    pins: (s) => polePins(s.poles, s.pinNames),
    bbox: (s) => poleBox(s.poles, 30),
  },
  breakerN: {
    kind: 'breakerN',
    label: 'LS-Schalter mit N',
    description: 'Leitungsschutzschalter 1+N oder 3+N, Neutralleiter mitschaltend',
    bmkPrefix: 'F',
    category: 'Schutzgerät',
    mount: 'rail',
    supportsPoles: true,
    pins: (s) => neutralPins(s.poles, s.pinNames),
    bbox: (s) => poleBox(s.poles + 1, 30),
  },
  rcd: {
    kind: 'rcd',
    label: 'FI-Schutzschalter',
    description: 'Fehlerstromschutzschalter (RCD) 1+N oder 3+N',
    bmkPrefix: 'F',
    category: 'Schutzgerät',
    mount: 'rail',
    supportsPoles: true,
    pins: (s) => neutralPins(s.poles, s.pinNames),
    bbox: (s) => poleBox(s.poles + 1, 230),
  },
  rcbo: {
    kind: 'rcbo',
    label: 'FI-LS-Schalter',
    description: 'FI/LS-Kombination (RCBO) 1+N oder 3+N',
    bmkPrefix: 'F',
    category: 'Schutzgerät',
    mount: 'rail',
    supportsPoles: true,
    pins: (s) => neutralPins(s.poles, s.pinNames),
    bbox: (s) => poleBox(s.poles + 1, 230),
  },
  fuseD02: {
    kind: 'fuseD02',
    label: 'Sicherungslasttrenner D02',
    description: 'NEOZED D02, N durchgeführt',
    bmkPrefix: 'F',
    category: 'Schutzgerät',
    mount: 'rail',
    supportsPoles: true,
    pins: (s) => neutralPins(s.poles, s.pinNames),
    bbox: (s) => poleBox(s.poles + 1, 30),
  },
  fuseD02N: {
    kind: 'fuseD02N',
    label: 'Sicherungslasttrenner D02 mit N',
    description: 'NEOZED D02, N mitschaltend',
    bmkPrefix: 'F',
    category: 'Schutzgerät',
    mount: 'rail',
    supportsPoles: true,
    pins: (s) => neutralPins(s.poles, s.pinNames),
    bbox: (s) => poleBox(s.poles + 1, 30),
  },
  contactor: {
    kind: 'contactor',
    label: 'Schütz (Hauptkontakte)',
    description: 'Leistungsschütz, Hauptstrombahnen',
    bmkPrefix: 'K',
    category: 'Schütz',
    mount: 'rail',
    supportsPoles: true,
    pins: (s) => polePins(s.poles, s.pinNames),
    bbox: (s) => poleBox(s.poles, 30),
  },
  coil: {
    kind: 'coil',
    label: 'Relais-/Schützspule',
    description: 'Spule A1/A2',
    bmkPrefix: 'K',
    category: 'Relais',
    mount: 'rail',
    supportsPoles: false,
    pins: twoPin('A1', 'A2'),
    bbox: () => ({ x: -50, y: -100, w: 100, h: 200 }),
  },
  timer: {
    kind: 'timer',
    label: 'Zeitschaltuhr',
    description: 'Schaltuhr mit Versorgung L/N, Kontakte separat',
    bmkPrefix: 'K',
    category: 'Relais',
    mount: 'rail',
    supportsPoles: false,
    pins: twoPin('L', 'N'),
    bbox: () => ({ x: -70, y: -100, w: 100, h: 200 }),
  },
  contactNO: {
    kind: 'contactNO',
    label: 'Schließer',
    description: 'Hilfskontakt, Schließer',
    bmkPrefix: 'K',
    category: 'Relais',
    mount: 'rail',
    supportsPoles: false,
    pins: twoPin('13', '14'),
    bbox: () => ({ x: -50, y: -100, w: 100, h: 200 }),
  },
  contactNC: {
    kind: 'contactNC',
    label: 'Öffner',
    description: 'Hilfskontakt, Öffner',
    bmkPrefix: 'K',
    category: 'Relais',
    mount: 'rail',
    supportsPoles: false,
    pins: twoPin('21', '22'),
    bbox: () => ({ x: -50, y: -100, w: 100, h: 200 }),
  },
  contactCO: {
    kind: 'contactCO',
    label: 'Wechsler',
    description: 'Hilfskontakt, Umschalter',
    bmkPrefix: 'K',
    category: 'Relais',
    mount: 'rail',
    supportsPoles: false,
    pins: (s) => [
      { id: s.pinNames?.[0] ?? '11', x: 0, y: 100 },
      { id: s.pinNames?.[1] ?? '12', x: -50, y: -100 },
      { id: s.pinNames?.[2] ?? '14', x: 50, y: -100 },
    ],
    bbox: () => ({ x: -60, y: -100, w: 120, h: 200 }),
  },
  terminal: {
    kind: 'terminal',
    label: 'Klemme',
    description: 'Reihenklemme',
    bmkPrefix: 'X',
    category: 'Klemme',
    mount: 'rail',
    supportsPoles: false,
    pins: (s) => [
      { id: s.pinNames?.[0] ?? '1', x: 0, y: -50 },
      { id: s.pinNames?.[1] ?? '2', x: 0, y: 50 },
    ],
    bbox: () => ({ x: -30, y: -50, w: 60, h: 100 }),
  },
  motor: {
    kind: 'motor',
    label: 'Drehstrommotor',
    description: 'Motor 3~ mit PE',
    bmkPrefix: 'M',
    category: 'Motor',
    mount: 'field',
    supportsPoles: false,
    pins: () => [
      { id: 'U', x: -100, y: -150 },
      { id: 'V', x: 0, y: -150 },
      { id: 'W', x: 100, y: -150 },
      { id: 'PE', x: 200, y: -150 },
    ],
    bbox: () => ({ x: -120, y: -150, w: 340, h: 270 }),
  },
  lamp: {
    kind: 'lamp',
    label: 'Leuchtmelder / Leuchte',
    description: 'Meldeleuchte X1/X2',
    bmkPrefix: 'H',
    category: 'Meldegerät',
    mount: 'door',
    supportsPoles: false,
    pins: twoPin('X1', 'X2'),
    bbox: () => ({ x: -50, y: -100, w: 100, h: 200 }),
  },
  pushbutton: {
    kind: 'pushbutton',
    label: 'Taster',
    description: 'Drucktaster, Schließer',
    bmkPrefix: 'S',
    category: 'Befehlsgerät',
    mount: 'door',
    supportsPoles: false,
    pins: twoPin('13', '14'),
    bbox: () => ({ x: -120, y: -100, w: 170, h: 200 }),
  },
  outlet: {
    kind: 'outlet',
    label: 'Abgang / Endabschluss',
    description: 'Führt Leiter zu einem Abgangspfeil zusammen (1- oder 3-polig)',
    bmkPrefix: 'W',
    category: 'Klemme',
    mount: 'field',
    supportsPoles: true,
    pins: (s) => {
      const names = outletPinNames(s)
      return names.map((id, i) => ({ id, x: (i - (names.length - 1) / 2) * POLE_SPACING, y: -100 }))
    },
    bbox: (s) => {
      const count = Math.max(1, s.wayCount ?? s.poles)
      const half = ((count - 1) * POLE_SPACING) / 2 + 40
      return { x: -half, y: -100, w: half * 2, h: 170 }
    },
  },
  crossMark: {
    kind: 'crossMark',
    label: 'Querschnittsangabe',
    description: 'Querstrich über mehrere Leiter mit Querschnitts-/Schienentext',
    bmkPrefix: 'W',
    category: 'Klemme',
    mount: 'field',
    supportsPoles: false,
    pins: () => [],
    bbox: (s) => {
      const half = ((Math.max(1, s.wayCount ?? 4) - 1) * POLE_SPACING) / 2 + 40
      return { x: -half, y: -20, w: half * 2, h: 40 }
    },
  },
}

export const BUILTIN_SYMBOL_KINDS = Object.keys(SYMBOLS) as BuiltinSymbolKind[]

export const CUSTOM_PREFIX = 'custom:'
export const isCustomKind = (kind: SymbolKind): kind is `custom:${string}` => kind.startsWith(CUSTOM_PREFIX)
export const customKind = (id: string) => `${CUSTOM_PREFIX}${id}` as SymbolKind

export function shapesBounds(shapes: SymbolShape[], pins: CadConnectionPoint[]): Rect {
  const xs: number[] = []
  const ys: number[] = []
  for (const p of pins) xs.push(p.x), ys.push(p.y)
  for (const s of shapes) for (const p of shapePoints(s)) xs.push(p.x), ys.push(p.y)
  if (!xs.length) return { x: -50, y: -50, w: 100, h: 100 }
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(Math.max(...xs) - x, 20), h: Math.max(Math.max(...ys) - y, 20) }
}

function customDef(kind: SymbolKind, c: CustomSymbolDef | undefined): SymbolDef {
  if (!c) {
    return { kind, label: 'Unbekanntes Symbol', description: 'Symbol fehlt in der Projektbibliothek', bmkPrefix: 'X', category: 'Klemme', mount: 'rail', supportsPoles: false, pins: () => [], bbox: () => ({ x: -50, y: -50, w: 100, h: 100 }) }
  }
  const box = shapesBounds(c.shapes, c.pins)
  return {
    kind,
    label: c.label,
    description: c.description,
    bmkPrefix: c.bmkPrefix,
    category: c.category,
    mount: c.mount,
    supportsPoles: false,
    pins: (s) => c.pins.map((p, i) => ({ ...p, id: s.pinNames?.[i] ?? p.id })),
    bbox: () => box,
  }
}

const geometryOf = (kind: BuiltinSymbolKind, poles: number, o: SymbolOverride | undefined) =>
  o?.geometry?.[poles as 1 | 3] ?? BUILTIN_GEOMETRY[kind]?.[poles as 1 | 3]

function withOverride(def: SymbolDef, o: SymbolOverride | undefined): SymbolDef {
  const kind = def.kind as BuiltinSymbolKind
  if (!o && !BUILTIN_GEOMETRY[kind]) return def
  const { poleLabels: _poleLabels, poleMeta: _poleMeta, geometry: _geometry, ...meta } = o ?? {}
  const clean = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined && v !== '')) as SymbolOverride
  return {
    ...def, ...clean,
    pins: (s) => geometryOf(kind, s.poles, o)?.pins.map((p, i) => ({ ...p, id: s.pinNames?.[i] ?? p.id })) ?? def.pins(s),
    bbox: (s) => {
      const geometry = geometryOf(kind, s.poles, o)
      return geometry ? shapesBounds(geometry.shapes, geometry.pins) : def.bbox(s)
    },
  }
}

let customById = new Map<string, CustomSymbolDef>()
let overrides: Partial<Record<BuiltinSymbolKind, SymbolOverride>> = {}
const defCache = new Map<SymbolKind, SymbolDef>()
let variants: SymbolVariant[] = []
const variantIndex = new Map<string, SymbolVariant>()

/** Resolved definition for any symbol kind, including project overrides and custom symbols. */
export function symbolDef(kind: SymbolKind): SymbolDef {
  return defCache.get(kind) ?? (isCustomKind(kind) ? customDef(kind, undefined) : SYMBOLS[kind as BuiltinSymbolKind] ?? customDef(kind, undefined))
}

export const customSymbolOf = (kind: SymbolKind) => (isCustomKind(kind) ? customById.get(kind.slice(CUSTOM_PREFIX.length)) : undefined)
export const symbolOverrideOf = (kind: BuiltinSymbolKind) => overrides[kind]
/** Library version a newly placed instance is based on; existing instances keep theirs. */
export const currentSymbolVersion = (kind: SymbolKind): number =>
  (isCustomKind(kind) ? customSymbolOf(kind)?.version : overrides[kind as BuiltinSymbolKind]?.version) ?? 1

export function symbolShapes(kind: SymbolKind, poles: 1 | 3, ways?: number): SymbolShape[] {
  if (isCustomKind(kind)) return customSymbolOf(kind)?.shapes ?? []
  if (kind === 'crossMark' || (kind === 'outlet' && ways != null)) return builtinShapes(kind, poles, kind === 'crossMark' ? ways ?? 4 : ways)
  return geometryOf(kind as BuiltinSymbolKind, poles, overrides[kind as BuiltinSymbolKind])?.shapes ?? builtinShapes(kind, poles)
}

/** Syncs the module registry with the open document; called by the document store on every change. */
export function setProjectSymbols(doc: Pick<CadDocument, 'customSymbols' | 'symbolOverrides'> | null) {
  customById = new Map((doc?.customSymbols ?? []).map((s) => [s.id, s]))
  overrides = doc?.symbolOverrides ?? {}
  defCache.clear()
  for (const k of BUILTIN_SYMBOL_KINDS) defCache.set(k, withOverride(SYMBOLS[k], overrides[k]))
  for (const c of customById.values()) defCache.set(customKind(c.id), customDef(customKind(c.id), c))
  variants = [...BUILTIN_SYMBOL_KINDS, ...[...customById.keys()].map(customKind)].flatMap(variantsOf)
  variantIndex.clear()
  for (const v of variants) variantIndex.set(v.key, v)
}

/** A concrete placeable entry: symbol kind plus pole count, e.g. "FI 3+N". */
export interface SymbolVariant {
  key: string
  kind: SymbolKind
  poles: 1 | 3
  label: string
  /** Pole filter bucket in the picker. */
  group: '1' | '3'
}

export const variantKey = (kind: SymbolKind, poles: 1 | 3) => `${kind}:${symbolDef(kind).supportsPoles ? poles : 1}`

const DEFAULT_POLE_LABELS: Partial<Record<BuiltinSymbolKind, [string, string]>> = {
  breakerN: ['LS-Schalter 1+N', 'LS-Schalter 3+N'],
  rcd: ['FI-Schutzschalter 1+N', 'FI-Schutzschalter 3+N'],
  rcbo: ['FI-LS 1+N', 'FI-LS 3+N'],
  fuseD02: ['D02 1-polig, N durchgeführt', 'D02 3-polig, N durchgeführt'],
  fuseD02N: ['D02 1+N, N geschaltet', 'D02 3+N, N geschaltet'],
}

/** List name of a built-in pole variant: the saved name if any, otherwise the factory name. */
function builtinPoleLabel(kind: BuiltinSymbolKind, poles: 1 | 3): string {
  const o = overrides[kind]
  const saved = o?.poleLabels?.[poles] ?? (o?.label && o.geometry?.[poles] ? o.label : undefined)
  if (saved) return saved
  const preset = DEFAULT_POLE_LABELS[kind]
  if (preset) return preset[poles === 3 ? 1 : 0]
  return `${SYMBOLS[kind].label} ${poles}-polig`
}

function variantsOf(kind: SymbolKind): SymbolVariant[] {
  const def = symbolDef(kind)
  const make = (poles: 1 | 3, label: string, group: '1' | '3' = poles === 3 ? '3' : '1'): SymbolVariant => ({ key: variantKey(kind, poles), kind, poles, label, group })
  if (!isCustomKind(kind) && def.supportsPoles) {
    const k = kind as BuiltinSymbolKind
    return [make(1, builtinPoleLabel(k, 1)), make(3, builtinPoleLabel(k, 3))]
  }
  return [make(1, def.label, kind === 'motor' ? '3' : '1')]
}

/** All placeable variants for the open project (built-in and custom). */
export const symbolVariants = () => variants
export const variantByKey = (key: string) => variantIndex.get(key)
export const variantLabel = (kind: SymbolKind, poles: 1 | 3) => variantIndex.get(variantKey(kind, poles))?.label ?? symbolDef(kind).label

export type SymbolMeta = Pick<SymbolDef, 'label' | 'description' | 'bmkPrefix' | 'category' | 'mount'>

/** Metadata of one concrete list entry; pole variants of a built-in symbol each keep their own settings. */
export function symbolMeta(kind: SymbolKind, poles: 1 | 3): SymbolMeta {
  const def = symbolDef(kind)
  const base: SymbolMeta = { label: def.label, description: def.description, bmkPrefix: def.bmkPrefix, category: def.category, mount: def.mount }
  if (isCustomKind(kind) || !def.supportsPoles) return base
  const own = overrides[kind as BuiltinSymbolKind]?.poleMeta?.[poles] ?? {}
  const clean = Object.fromEntries(Object.entries(own).filter(([, v]) => v !== undefined)) as Partial<SymbolMeta>
  return { ...base, ...clean, label: variantLabel(kind, poles) }
}

setProjectSymbols(null)

export const DEFAULT_FAVORITES = ['breaker:3', 'rcd:3', 'breakerN:1', 'contactor:3', 'coil:1', 'terminal:1']

/** Best-matching schematic symbol for an article from the parts list; null when no symbol fits. */
export function articleVariant(a: { category: DeviceCategory; description: string }): SymbolVariant | null {
  const d = a.description.toLowerCase()
  const four = /\b4p\b|3p\+n|3\+n|4-polig/.test(d)
  const three = /\b3p\b|3-polig/.test(d)
  const pick = (kind: SymbolKind, poles: 1 | 3) => variantByKey(variantKey(kind, poles)) ?? null
  if (/fi-ls|fi\/ls|\brcbo\b/.test(d)) return pick('rcbo', four ? 3 : 1)
  if (/fi-|fehlerstrom|\brcd\b/.test(d)) return pick('rcd', four ? 3 : 1)
  if (/\bd02\b|neozed/.test(d)) return pick('fuseD02', three ? 3 : 1)
  if (/zeitschaltuhr|schaltuhr/.test(d)) return pick('timer', 1)
  if (/ls-schalter|leitungsschutz/.test(d)) return /\+n/.test(d) ? pick('breakerN', four ? 3 : 1) : pick('breaker', three ? 3 : 1)
  if (/motorschutz|hauptschalter|lasttrenn/.test(d)) return pick('breaker', 3)
  if (/sicherungseinsatz/.test(d)) return pick('breaker', 1)
  switch (a.category) {
    case 'Schütz':
      return pick('contactor', /\b2s\b/.test(d) ? 1 : 3)
    case 'Relais':
      return pick('coil', 1)
    case 'Klemme':
      return pick('terminal', 1)
    case 'Befehlsgerät':
      return pick('pushbutton', 1)
    case 'Meldegerät':
    case 'Leuchte':
      return pick('lamp', 1)
    case 'Motor':
      return pick('motor', 1)
    default:
      return null
  }
}
