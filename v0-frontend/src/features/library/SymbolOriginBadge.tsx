import { useCallback } from 'react'
import type { DirectoryUser } from '@/backend/admin'
import { useCurrentUser } from '@/stores/accountStore'
import { useUserDirectory } from '@/stores/userDirectoryStore'
import type { CustomSymbolDef } from '@/types/cad'
import { cn } from '@/utils/cn'
import { shortName, symbolOrigin, type SymbolOrigin } from './symbolOwnership'

export type OriginFilter = 'all' | 'system' | 'mine' | 'others' | `user:${string}`

export interface ResolvedOrigin extends SymbolOrigin {
  /** "SYSTEM", "M. Krüger" or "Nicht zugeordnet". */
  label: string
  mine: boolean
}

export function resolveOrigin(custom: CustomSymbolDef | undefined, users: DirectoryUser[], meId: string | null): ResolvedOrigin {
  const origin = symbolOrigin(custom)
  if (origin.scope === 'system') return { ...origin, label: 'SYSTEM', mine: false }
  const mine = !!meId && origin.ownerUserId === meId
  const owner = origin.ownerUserId ? users.find((u) => u.id === origin.ownerUserId) : undefined
  const label = owner ? shortName(owner.displayName) : origin.ownerUserId ? 'Unbekannter Benutzer' : 'Nicht zugeordnet'
  return { ...origin, label, mine }
}

/** Display-only resolver; authorization uses canEditSymbol and the server. */
export function useSymbolOriginResolver() {
  const users = useUserDirectory()
  const meId = useCurrentUser()?.id ?? null
  return useCallback((custom: CustomSymbolDef | undefined) => resolveOrigin(custom, users, meId), [users, meId])
}

export function matchesOriginFilter(origin: ResolvedOrigin, filter: OriginFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'system') return origin.scope === 'system'
  if (filter === 'mine') return origin.mine
  if (filter === 'others') return origin.scope !== 'system' && !origin.mine
  return origin.scope !== 'system' && origin.ownerUserId === filter.slice(5)
}

export function SymbolOriginBadge({ origin, className }: { origin: ResolvedOrigin; className?: string }) {
  const system = origin.scope === 'system'
  return (
    <span
      title={system ? 'Systemsymbol – nur Administratoren dürfen es ändern' : origin.mine ? 'Ihr eigenes Symbol' : `Benutzersymbol von ${origin.label}`}
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1 py-px text-[9.5px] leading-tight font-semibold tracking-wide',
        system ? 'bg-accent-soft text-accent' : origin.mine ? 'bg-ok/15 text-ok' : 'bg-panel-2 text-fg-2',
        className,
      )}
    >
      {system ? 'SYSTEM' : origin.mine ? 'MEIN' : origin.label}
    </span>
  )
}

/** Owner filter options built from the visible symbols, so empty owners are not listed. */
export function OriginFilterSelect({ value, onChange, owners, className }: { value: OriginFilter; onChange: (v: OriginFilter) => void; owners: { id: string; label: string }[]; className?: string }) {
  return (
    <select aria-label="Nach Herkunft filtern" value={value} onChange={(e) => onChange(e.target.value as OriginFilter)} className={className}>
      <option value="all">Alle Herkünfte</option>
      <option value="system">System</option>
      <option value="mine">Meine Symbole</option>
      <option value="others">Andere Benutzer</option>
      {owners.length > 0 && (
        <optgroup label="Besitzer">
          {owners.map((o) => (
            <option key={o.id} value={`user:${o.id}`}>
              {o.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

export function ownerOptions(origins: ResolvedOrigin[]): { id: string; label: string }[] {
  const seen = new Map<string, string>()
  for (const o of origins) if (o.scope !== 'system' && o.ownerUserId && !seen.has(o.ownerUserId)) seen.set(o.ownerUserId, o.label)
  return [...seen].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, 'de'))
}
