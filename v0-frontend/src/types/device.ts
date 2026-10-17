export type MountType = 'rail' | 'door' | 'field'

export type DeviceCategory =
  | 'Schutzgerät'
  | 'Schütz'
  | 'Relais'
  | 'Befehlsgerät'
  | 'Meldegerät'
  | 'Klemme'
  | 'Motor'
  | 'Leuchte'

export interface Placement {
  cabinetId: string
  row: number
  order: number
}

/** Shared device instance. Schematic symbols and cabinet placements reference the same id. */
export interface Device {
  id: string
  bmk: string
  function: string
  location: string
  distributor: string
  category: DeviceCategory
  articleId: string | null
  manufacturer: string
  articleNo: string
  type: string
  ratedCurrent: number | null
  ac3Power: number | null
  coilVoltage: string
  auxContacts: string
  widthTE: number
  dimensions: string
  mount: MountType
  placement: Placement | null
  /** Tripping characteristic of circuit breakers (B, C, D, K, Z). */
  characteristic?: string
  /** Nominal current of the execution in A; falls back to the article's rated current. */
  nominalCurrent?: number | null
  /** Rated residual current of RCDs in mA. */
  residualCurrent?: number | null
}

export interface Article {
  id: string
  manufacturer: string
  articleNo: string
  type: string
  description: string
  category: DeviceCategory
  ratedCurrent: number | null
  ac3Power: number | null
  coilVoltage: string
  auxContacts: string
  widthTE: number
  dimensions: string
  price: number
}

export interface Cabinet {
  id: string
  name: string
  description: string
  rows: number
  rowCapacityTE: number
}

export interface Cable {
  id: string
  bmk: string
  type: string
  cores: string
  from: string
  to: string
  length: number
}

export interface PlcIo {
  id: string
  address: string
  symbol: string
  direction: 'E' | 'A'
  deviceBmk: string
  comment: string
}
