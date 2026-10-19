import { useEffect, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { backend } from '@/backend'
import { Badge } from '@/components/ui/primitives'
import { AccountMenu } from './AccountMenu'
import { AdminArea, type AdminTab } from './admin/AdminArea'
import { LoginScreen } from './LoginScreen'
import { SecurityDialog } from './SecurityDialog'
import { ImportProjectDialog } from '@/components/dialogs/ImportProjectDialog'
import { useProjectStore } from '@/stores/projectStore'
import { useAccountStore } from '@/stores/accountStore'
import { DevIdentitySwitch } from './DevIdentitySwitch'

export function AccountBoundary({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState(false)
  const [expired, setExpired] = useState(false)
  const [security, setSecurity] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [adminTab, setAdminTab] = useState<AdminTab | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { data: session, error: sessionError, isLoading } = useSWR(backend.account ? 'auth-session' : null, () => backend.account!.session(), { shouldRetryOnError: false, refreshInterval: 60_000 })
  useEffect(() => {
    const expire = () => { setExpired(true); setSecurity(false); setImportOpen(false) }
    window.addEventListener('openecad:session-expired', expire)
    return () => window.removeEventListener('openecad:session-expired', expire)
  }, [])
  const development = import.meta.env.DEV && !backend.capabilities.authentication
  const setUser = useAccountStore((s) => s.setUser)
  const user = useAccountStore((s) => s.user)
  useEffect(() => {
    if (session?.user) setUser(session.user)
    else if (preview && import.meta.env.DEV && backend.dev) setUser(backend.dev.current())
    else setUser(null)
  }, [session, preview, setUser])
  if (isLoading) return <main className="flex min-h-dvh items-center justify-center bg-app text-fg" role="status">Session wird geprüft …</main>
  if (expired || (!preview && !session?.user) || sessionError) return <LoginScreen expired={expired} connectionError={sessionError?.message} onAuthenticated={() => window.location.reload()} onPreview={development ? () => setPreview(true) : undefined} />

  async function logout() {
    const store = useProjectStore.getState()
    if ((store.dirty || Object.values(store.sessions).some((s) => s.dirty)) && !window.confirm('Nicht gespeicherte Änderungen gehen beim Abmelden verloren. Fortfahren?')) return
    setBusy(true); setError('')
    try {
      if (backend.account) await backend.account.logout()
      // Reload clears all document/history/draft stores, including in-flight requests.
      window.location.reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Abmelden fehlgeschlagen.'); setBusy(false) }
  }
  return <div className="flex h-dvh flex-col bg-app text-fg">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-3 py-1 text-xs">
      <div className="flex items-center gap-2"><span>{user?.displayName ?? 'Entwicklungsvorschau (nicht angemeldet)'}</span>{user?.roles.map((role) => <Badge key={role}>{role}</Badge>)}{development && <Badge tone="warn">Development-only · nicht angemeldet</Badge>}{development && <DevIdentitySwitch />}</div>
      <AccountMenu onSecurity={() => setSecurity(true)} onImport={() => setImportOpen(true)} onAdmin={setAdminTab} onLogout={() => void logout()} logoutLabel={development ? 'Vorschau verlassen' : 'Abmelden'} busy={busy} />
      {error && <p role="alert" className="w-full text-error">{error}</p>}
    </header>
    {adminTab && <div className="min-h-0 flex-1"><AdminArea tab={adminTab} onTab={setAdminTab} onClose={() => setAdminTab(null)} /></div>}
    <div className={adminTab ? 'hidden' : 'min-h-0 flex-1'}>{children}</div>
    <div onKeyDown={(event) => event.stopPropagation()}>
      {security && <SecurityDialog onClose={() => setSecurity(false)} />}
      {importOpen && <ImportProjectDialog onClose={() => setImportOpen(false)} />}
    </div>
  </div>
}
