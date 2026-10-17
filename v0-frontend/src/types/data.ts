export type DataViewId = 'devices' | 'articles' | 'terminals' | 'cables' | 'plc' | 'connections'

export interface DataColumn {
  key: string
  label: string
  width: number
  type: 'text' | 'number' | 'select'
  editable?: boolean
  mono?: boolean
  options?: string[]
}

export type CellValue = string | number | null

export interface DataRow {
  id: string
  /** Set when the row mirrors a shared project device. */
  deviceId?: string
  issue?: 'error' | 'warning'
  cells: Record<string, CellValue>
}

export interface DataTable {
  view: DataViewId
  columns: DataColumn[]
  rows: DataRow[]
}
