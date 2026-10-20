import { uid } from '@/utils/format'

/** Copies an object and its owned records without sharing mutable data or identities. */
export function cloneOwnedObject<T extends { id: string; ports?: { id: string }[]; fields?: { id: string }[] }>(object: T, prefix = 'object'): T {
  const copy = structuredClone(object)
  copy.id = uid(prefix)
  if (copy.ports) copy.ports = copy.ports.map((port) => ({ ...port, id: uid('port') }))
  if (copy.fields) copy.fields = copy.fields.map((field) => ({ ...field, id: uid('field') }))
  return copy
}
