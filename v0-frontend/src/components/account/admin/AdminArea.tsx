import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { backend } from '@/backend'
import { can, type Permission } from '@/backend/permissions'
import { Badge, Button, Empty, Tabs } from '@/components/ui/primitives'
import { useAccountStore } from '@/stores/accountStore'
import { AuditPanel } from './AuditPanel'
import { SystemLibraryPanel } from './SystemLibraryPanel'
import { SystemStatusPanel } from './SystemStatusPanel'
import { UsersPanel } from './UsersPanel'

export type AdminTab = 'users' | 'audit' | 'library' | 'status'

const TAB_PERMISSION: Record<AdminTab, Permission> = { users: 'user.manage', audit: 'audit.read', library: 'library.manageSystem', status: 'user.manage' }
const TAB_LABEL: Record<AdminTab, string> = { users: 'Benutzer', audit: 'Audit-Log', library: 'Systembibliothek', status: 'Systemstatus' }

/** App-level administration. UI gating only — the Rust server authorizes every admin request. */
export function AdminArea({ tab, onTab, onClose }: { tab: AdminTab; onTab: (tab: AdminTab) => void; onClose: () => void }) {
  const user = useAccountStore((s) => s.user)
  const tabs = (Object.keys(TAB_PERMISSION) as AdminTab[]).filter((t) => can(user, TAB_PERMISSION[t]))
  const allowed = tabs.includes(tab)

  return <main className="flex h-full min-h-0 flex-col bg-app" aria-labelledby="admin-title">
    <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-3 py-2">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onClose}>Zurück zum Editor</Button>
      <h1 id="admin-title" className="text-[13px] font-semibold text-fg">Administration</h1>
      {backend.kind === 'mock' && <Badge tone="warn">Development-only Mock · keine echte Sicherheit</Badge>}
    </header>
    {tabs.length > 0 && <Tabs label="Administrationsbereiche" value={allowed ? tab : tabs[0]} onChange={onTab} tabs={tabs.map((t) => ({ value: t, label: TAB_LABEL[t] }))} className="bg-panel" />}
    <div className="min-h-0 flex-1 overflow-auto">
      {!allowed ? <Empty icon={ShieldAlert} title="Kein Zugriff">Für diesen Bereich fehlt die Berechtigung. Der Server lehnt entsprechende Anfragen unabhängig von der Oberfläche ab.</Empty>
        : tab === 'users' ? <UsersPanel />
        : tab === 'audit' ? <AuditPanel />
        : tab === 'library' ? <SystemLibraryPanel />
        : <SystemStatusPanel />}
    </div>
  </main>
}
