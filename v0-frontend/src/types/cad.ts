import type { Cabinet, Cable, Device, DeviceCategory, MountType, PlcIo } from './device'

/** World coordinates. 1 unit = 0.1 mm on the printed sheet. Never screen pixels. */
export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const UNITS_PER_MM = 10

export type Rotation = 0 | 90 | 180 | 270

export type PageFormat = 'A4P' | 'A4L' | 'A3P' | 'A3L'

export const PAGE_FORMATS: Record<PageFormat, { label: string; width: number; height: number }> = {
  A4P: { label: 'A4 Hochformat', width: 2100, height: 2970 },
  A4L: { label: 'A4 Querformat', width: 2970, height: 2100 },
  A3P: { label: 'A3 Hochformat', width: 2970, height: 4200 },
  A3L: { label: 'A3 Querformat', width: 4200, height: 2970 },
}

export type BuiltinSymbolKind =
  | 'breaker'
  | 'breakerN'
  | 'rcd'
  | 'rcbo'
  | 'fuseD02'
  | 'fuseD02N'
  | 'contactor'
  | 'coil'
  | 'timer'
  | 'contactNO'
  | 'contactNC'
  | 'contactCO'
  | 'terminal'
  | 'motor'
  | 'lamp'
  | 'pushbutton'
  | 'outlet'
  | 'crossMark'

/** Built-in kinds are drawn in code; project symbols use `custom:<id>`. */
export type SymbolKind = BuiltinSymbolKind | `custom:${string}`

/** Connection point in symbol-local coordinates (before rotation/translation). */
export interface CadConnectionPoint {
  id: string
  x: number
  y: number
}

/** Graphic primitive of a project symbol, in symbol-local world units (0.1 mm). */
export type SymbolShape = {
  color?: string
  strokeWidth?: number
  fillColor?: string
  /** Shapes sharing a group id are selected, moved and transformed together in the symbol editor. */
  group?: string
  /** Rotation in degrees around the shape's own centre (rect, path) or anchor (text). */
  rot?: number
} & (
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; dashed?: boolean; dash?: string; arrow?: 'start' | 'end' | 'both' }
  | { t: 'path'; x: number; y: number; w: number; h: number; d: string; sx?: number; sy?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; filled?: boolean; rx?: number; noStroke?: boolean }
  | { t: 'circle'; cx: number; cy: number; r: number; filled?: boolean }
  | { t: 'text'; x: number; y: number; text: string; size: number; anchor?: 'start' | 'middle' | 'end'; weight?: number; font?: 'inherit' }

)

/** Project-specific symbol created in the symbol editor or imported from a library file. */
export interface CustomSymbolDef {
  id: string
  label: string
  description: string
  bmkPrefix: string
  category: DeviceCategory
  mount: MountType
  pins: CadConnectionPoint[]
  shapes: SymbolShape[]
}

/** Project-level metadata and per-pole geometry changes for a built-in symbol. */
export interface SymbolOverride {
  geometry?: Partial<Record<1 | 3, Pick<CustomSymbolDef, 'shapes' | 'pins'>>>
  label?: string
  description?: string
  bmkPrefix?: string
  category?: DeviceCategory
  mount?: MountType
}

export interface CadSymbol {
  id: string
  type: 'symbol'
  kind: SymbolKind
  deviceId: string | null
  position: Point
  rotation: Rotation
  poles: 1 | 3
  pinNames?: string[]
  terminalNo?: string
  /** Reading direction of the terminal number above grouped terminals; defaults to 'rotated' (bottom to top). */
  terminalNoOrientation?: 'normal' | 'rotated'
  /** Hides the pin numbers (1, 2) when a terminal number is assigned. */
  hidePinNumbers?: boolean
  /** Rotates only the device label (BMK/function text), never the symbol graphic. */
  labelRotation?: 0 | 90
  labelSide?: 'left' | 'right' | 'custom'
  /** World-axis offset from the symbol origin; follows translation, not rotation. */
  labelOffset?: Point
  labelAnchor?: 'start' | 'end'
  /** Conductor count of outlets / cross-section marks (overrides `poles`). */
  wayCount?: number
  /** Conductor naming of outlets; from 3 conductors the two rightmost are always N and PE. */
  wayNaming?: 'numbered' | 'phases' | 'custom'
  /** Free text of a cross-section mark, e.g. "10mm²". */
  markText?: string
}

export type WireColor = `#${string}` | 'auto' | 'black' | 'blue' | 'red' | 'green' | 'gray' | 'brown' | 'orange' | 'violet'

export type LineStyle = 'solid' | 'dashed' | 'dashdot'

export type WireWeight = 'thin' | 'normal' | 'thick'

export interface CadWire {
  id: string
  type: 'wire'
  /** Orthogonal polyline in world coordinates. */
  points: Point[]
  potential: string | null
  color: WireColor
  crossSection: string
  lineStyle?: LineStyle
  weight?: WireWeight
  /** Id of the wire style preset last applied (informational). */
  preset?: string
  /** Free display text, independent of the electrical potential. */
  label?: string
  labelPos?: ConductorLabelPos
  /** Custom label position relative to the first wire point. */
  labelOffset?: Point
  labelAnchor?: TextAnchor
  }

export type ConductorLabelPos = 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom'

export type TextAnchor = 'start' | 'middle' | 'end'

/**
 * Generic graphical line (frames, borders, mechanical linkages).
 * May be diagonal. Has NO electrical meaning and never joins a network.
 */
export interface CadLine {
  id: string
  type: 'line'
  points: Point[]
  style: LineStyle
}

export interface CadWireSegment {
  wireId: string
  index: number
  a: Point
  b: Point
}

export interface CadJunction {
  id: string
  type: 'junction'
  position: Point
}

export type TextStyle = 'label' | 'note' | 'xref'

export interface CadText {
  id: string
  type: 'text'
  position: Point
  text: string
  size: number
  style: TextStyle
  xref?: { targetPageId: string; peerId: string; side: 'left' | 'right' }
  anchor: 'start' | 'middle' | 'end'
}

/** Horizontal potential rail spanning the page. */
export interface CadPotential {
  id: string
  type: 'potential'
  name: string
  y: number
  x1: number
  x2: number
  color?: WireColor
  crossSection?: string
  lineStyle?: LineStyle
  weight?: WireWeight
  preset?: string
  /** Display text on the rail; defaults to the potential name. */
  label?: string
  labelPos?: ConductorLabelPos
  /** Custom label position relative to (x1, y). */
  labelOffset?: Point
  labelAnchor?: TextAnchor
  xrefLeft?: string
  xrefRight?: string
}

export type CadObject = CadSymbol | CadWire | CadJunction | CadText | CadPotential | CadLine
export type CadObjectType = CadObject['type']

export type PageKind = 'schematic' | 'cover' | 'report'

export interface CadPage {
  id: string
  number: string
  title: string
  functionGroup: string
  format: PageFormat
  kind: PageKind
  /** For report pages: which generated report is drawn on the sheet. */
  report?: 'toc' | 'terminals' | 'spec' | 'cabinetSpec' | 'layout'
  revision: string
  updatedAt: string
  /** Editor (Bearbeiter) who last changed this page. */
  editedBy?: string
  symbols: CadSymbol[]
  wires: CadWire[]
  junctions: CadJunction[]
  texts: CadText[]
  potentials: CadPotential[]
  lines: CadLine[]
}

export interface FunctionGroup {
  id: string
  label: string
  /** Fixed group number; page numbers inside the group are `${no}.${n}`. */
  no?: number
}

export interface WirePreset {
  id: string
  label: string
  color: WireColor
  lineStyle: LineStyle
  weight: WireWeight
  crossSection: string
  }
  
  /** Project-wide potential definition; links a potential name to its default wire style. */
  export interface PotentialDef {
  id: string
  name: string
  description: string
  presetId: string | null
  }
  
  export interface CadDocument {
  sheetSchemaVersion?: number
  id: string
  projectId: string
  /** Project-specific wire style presets; falls back to the built-in defaults when absent. */
  wirePresets?: WirePreset[]
  /** Project potential definitions; falls back to the built-in defaults when absent. */
  potentialDefs?: PotentialDef[]
  customSymbols?: CustomSymbolDef[]
  symbolOverrides?: Partial<Record<BuiltinSymbolKind, SymbolOverride>>
  /** Cross references use group/sheet numbers (default) or consecutive page numbers; both add grid coordinates. */
  xrefMode?: 'group' | 'page'
  functionGroups: FunctionGroup[]
  pages: CadPage[]
  devices: Device[]
  cabinets: Cabinet[]
  cables: Cable[]
  plc: PlcIo[]
}

export interface CadSelection {
  ids: string[]
}

/** Screen-space mapping only. Changing it never touches document geometry. */
export interface CadViewportState {
  panX: number
  panY: number
  zoom: number
}
