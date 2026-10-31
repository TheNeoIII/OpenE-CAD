import type { CadConnection, CadConnectionType } from '@/types/cad'

export const CONNECTION_TYPE_PRESETS = {
  generic: { stroke: '#374151', strokeWidth: 3, style: 'solid' },
  cable: { stroke: '#111827', strokeWidth: 4, style: 'solid' },
  network: { stroke: '#2563eb', strokeWidth: 3, style: 'solid' },
  bus: { stroke: '#7c3aed', strokeWidth: 4, style: 'solid' },
  power: { stroke: '#dc2626', strokeWidth: 4, style: 'solid' },
  signal: { stroke: '#ea580c', strokeWidth: 3, style: 'dashed' },
} satisfies Record<CadConnectionType, Pick<CadConnection, 'stroke' | 'strokeWidth' | 'style'>>

export function connectionTypePatch(connection: CadConnection, patch: Partial<CadConnection>): Partial<CadConnection> {
  return patch.connectionType && patch.connectionType !== connection.connectionType
    ? { ...CONNECTION_TYPE_PRESETS[patch.connectionType], ...patch }
    : patch
}
