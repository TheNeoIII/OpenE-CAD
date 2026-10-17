import type { CadConnectionPoint, CadSymbol, Rect, SymbolKind } from '@/types/cad'
import type { DeviceCategory, MountType } from '@/types/device'

export interface SymbolDef {
  kind: SymbolKind
  label: string
  description: string
  bmkPrefix: string
  category: DeviceCategory
  mount: MountType
  supportsPoles: boolean
  pins: (s: Pick<CadSymbol, 'poles' | 'pinNames'>) => CadConnectionPoint[]
  bbox: (s: Pick<CadSymbol, 'poles'>) => Rect
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

const twoPin =
  (a: string, b: string) =>
  (s: Pick<CadSymbol, 'pinNames'>): CadConnectionPoint[] => [
    { id: s.pinNames?.[0] ?? a, x: 0, y: -100 },
    { id: s.pinNames?.[1] ?? b, x: 0, y: 100 },
  ]

export const SYMBOLS: Record<SymbolKind, SymbolDef> = {
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
    bbox: (s) => poleBox(s.poles + 1, 130),
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
    pins: (s) =>
      Array.from({ length: s.poles }, (_, i) => ({
        id: s.pinNames?.[i] ?? String(i + 1),
        x: (i - (s.poles - 1) / 2) * POLE_SPACING,
        y: -100,
      })),
    bbox: (s) => {
      const half = ((s.poles - 1) * POLE_SPACING) / 2 + 40
      return { x: -half, y: -100, w: half * 2, h: 170 }
    },
  },
}

export const SYMBOL_KINDS = Object.keys(SYMBOLS) as SymbolKind[]

/** A concrete placeable entry: symbol kind plus pole count, e.g. "FI 3+N". */
export interface SymbolVariant {
  key: string
  kind: SymbolKind
  poles: 1 | 3
  label: string
  /** Pole filter bucket in the picker. */
  group: '1' | '3'
}

export const variantKey = (kind: SymbolKind, poles: 1 | 3) => `${kind}:${SYMBOLS[kind].supportsPoles ? poles : 1}`

function variantsOf(kind: SymbolKind): SymbolVariant[] {
  const def = SYMBOLS[kind]
  const make = (poles: 1 | 3, label: string, group: '1' | '3' = poles === 3 ? '3' : '1'): SymbolVariant => ({ key: variantKey(kind, poles), kind, poles, label, group })
  if (kind === 'breakerN') return [make(1, 'LS-Schalter 1+N'), make(3, 'LS-Schalter 3+N')]
  if (kind === 'rcd') return [make(1, 'FI-Schutzschalter 1+N (2-polig)'), make(3, 'FI-Schutzschalter 3+N (4-polig)')]
  if (def.supportsPoles) return [make(1, `${def.label} 1-polig`), make(3, `${def.label} 3-polig`)]
  return [make(1, def.label, kind === 'motor' ? '3' : '1')]
}

export const SYMBOL_VARIANTS: SymbolVariant[] = SYMBOL_KINDS.flatMap(variantsOf)

const VARIANT_BY_KEY = new Map(SYMBOL_VARIANTS.map((v) => [v.key, v]))
export const variantByKey = (key: string) => VARIANT_BY_KEY.get(key)
export const variantLabel = (kind: SymbolKind, poles: 1 | 3) => VARIANT_BY_KEY.get(variantKey(kind, poles))?.label ?? SYMBOLS[kind].label

export const DEFAULT_FAVORITES = ['breaker:3', 'rcd:3', 'breakerN:1', 'contactor:3', 'coil:1', 'terminal:1']

/** Best-matching schematic symbol for an article from the parts list; null when no symbol fits. */
export function articleVariant(a: { category: DeviceCategory; description: string }): SymbolVariant | null {
  const d = a.description.toLowerCase()
  const four = /\b4p\b|3p\+n|3\+n|4-polig/.test(d)
  const three = /\b3p\b|3-polig/.test(d)
  const pick = (kind: SymbolKind, poles: 1 | 3) => variantByKey(variantKey(kind, poles)) ?? null
  if (/fi-|fehlerstrom|\brcd\b/.test(d)) return pick('rcd', four ? 3 : 1)
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
