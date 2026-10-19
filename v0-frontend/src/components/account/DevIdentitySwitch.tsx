import { backend } from '@/backend'
import { useAccountStore } from '@/stores/accountStore'

/** Development-only: lets v0/dev previews render as Mock Admin or Mock User. Not authentication. */
export function DevIdentitySwitch() {
  const user = useAccountStore((s) => s.user)
  const setUser = useAccountStore((s) => s.setUser)
  const dev = backend.dev
  if (!import.meta.env.DEV || !dev) return null
  return (
    <label className="flex items-center gap-1.5 rounded border border-dashed border-warn/60 px-1.5 py-0.5 text-warn">
      <span>Mock-Identität</span>
      <select
        aria-label="Development-only Mock-Identität wählen"
        className="h-6 rounded border border-line bg-panel-2 px-1 text-xs text-fg"
        value={user?.id ?? ''}
        onChange={(event) => setUser(dev.switchTo(event.target.value))}
      >
        {dev.identities().map((identity) => (
          <option key={identity.id} value={identity.id}>
            {identity.roles.includes('admin') ? 'Mock Admin' : 'Mock User'} ({identity.displayName})
          </option>
        ))}
      </select>
    </label>
  )
}
