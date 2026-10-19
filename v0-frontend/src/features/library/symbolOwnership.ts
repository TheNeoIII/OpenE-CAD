import { can } from '@/backend/permissions'
import type { CustomSymbolDef, SymbolScope } from '@/types/cad'

interface Subject {
  id: string
  roles: readonly string[]
  permissions: readonly string[]
  status?: string
}

export interface SymbolOrigin {
  scope: SymbolScope
  ownerUserId: string | null
  /** True for built-in standard symbols (no CustomSymbolDef). */
  builtin: boolean
}

/**
 * Built-in standard symbols are always `system`. Custom symbols from before
 * ownership existed carry no scope; they are treated as user symbols without
 * an owner, so only `symbol.editAny` may change them until an admin assigns one.
 */
export function symbolOrigin(custom: CustomSymbolDef | undefined): SymbolOrigin {
  if (!custom) return { scope: 'system', ownerUserId: null, builtin: true }
  return { scope: custom.scope ?? 'user', ownerUserId: custom.scope === 'system' ? null : custom.ownerUserId ?? null, builtin: false }
}

/** Presentation check only; the server re-authorizes every library mutation. */
export function canEditSymbol(user: Subject | null | undefined, origin: SymbolOrigin): boolean {
  if (origin.scope === 'system') return can(user, 'symbol.editSystem')
  if (can(user, 'symbol.editAny')) return true
  return !!user && origin.ownerUserId === user.id && can(user, 'symbol.editOwn')
}

/** Built-in symbols cannot be deleted at all, only reset. */
export function canDeleteSymbol(user: Subject | null | undefined, origin: SymbolOrigin): boolean {
  return !origin.builtin && canEditSymbol(user, origin)
}

export function canDuplicateSymbol(user: Subject | null | undefined): boolean {
  return can(user, 'symbol.create')
}

export function canImportSystemSymbols(user: Subject | null | undefined): boolean {
  return can(user, 'symbol.editSystem') && can(user, 'library.manageSystem')
}

/** Metadata for a newly created, duplicated or imported symbol. */
export function newSymbolProvenance(user: Subject | null | undefined, scope: SymbolScope = 'user', derivedFromSymbolId?: string): Pick<CustomSymbolDef, 'scope' | 'ownerUserId' | 'createdByUserId' | 'updatedByUserId' | 'createdAt' | 'updatedAt' | 'version' | 'derivedFromSymbolId'> {
  const now = new Date().toISOString()
  const actor = user?.id ?? null
  return {
    scope,
    ownerUserId: scope === 'system' ? null : actor,
    createdByUserId: actor,
    updatedByUserId: actor,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...(derivedFromSymbolId ? { derivedFromSymbolId } : {}),
  }
}

/** Every saved change to a library definition is logically a new version. */
export function nextSymbolVersion(user: Subject | null | undefined, previous: number | undefined) {
  return { version: (previous ?? 1) + 1, updatedByUserId: user?.id ?? null, updatedAt: new Date().toISOString() }
}

/** "Max Krüger" → "M. Krüger"; single names stay unchanged. */
export function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length < 2) return displayName.trim()
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}
