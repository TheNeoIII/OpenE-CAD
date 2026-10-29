import type { CadConnectionEndpoint, CadObject, CadPage } from '@/types/cad'
import { cloneOwnedObject } from '@/features/drawing/clone'
import { resolveConnectionEndpoint } from './connections'

export function prepareConnectionCopy(page: CadPage, objects: readonly CadObject[]): CadObject[] {
  const owners = new Set(objects.filter((o) => o.type === 'diagramBlock').map((o) => o.id))
  const endpoint = (e: CadConnectionEndpoint): CadConnectionEndpoint => {
    if (e.kind === 'point' || owners.has(e.objectId)) return e
    const point = resolveConnectionEndpoint(page, e)
    return point ? { kind: 'point', point } : e
  }
  return structuredClone(objects.map((o) => o.type === 'connection' ? { ...o, start: endpoint(o.start), end: endpoint(o.end) } : o))
}

export function cloneConnectionGraph(objects: readonly CadObject[]): CadObject[] {
  const clones = objects.map((o) => cloneOwnedObject(o, o.type))
  const owners = new Map<string, { id: string; ports: Map<string, string> }>()
  objects.forEach((o, index) => {
    const copy = clones[index]
    if (o.type === 'diagramBlock' && copy.type === 'diagramBlock') owners.set(o.id, { id: copy.id, ports: new Map((o.ports ?? []).map((p, i) => [p.id, copy.ports![i].id])) })
  })
  const endpoint = (e: CadConnectionEndpoint): CadConnectionEndpoint => {
    if (e.kind === 'point') return e
    const owner = owners.get(e.objectId)
    return owner ? { kind: 'port', objectId: owner.id, portId: owner.ports.get(e.portId) ?? e.portId } : e
  }
  return clones.map((o) => o.type === 'connection' ? { ...o, start: endpoint(o.start), end: endpoint(o.end) } : o)
}

export function clonePageConnections(page: CadPage) {
  const copies = cloneConnectionGraph([...(page.diagramBlocks ?? []), ...(page.connections ?? [])])
  return { diagramBlocks: copies.filter((o) => o.type === 'diagramBlock'), connections: copies.filter((o) => o.type === 'connection') }
}
