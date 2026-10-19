import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, FileUp, KeyRound, LogOut, ScrollText, Server, Shield, Users, Library } from 'lucide-react'
import { can } from '@/backend/permissions'
import { useAccountStore } from '@/stores/accountStore'
import type { AdminTab } from './admin/AdminArea'

interface Props {
  onSecurity: () => void
  onImport: () => void
  onAdmin: (tab: AdminTab) => void
  onLogout: () => void
  logoutLabel: string
  busy: boolean
}

export function AccountMenu({ onSecurity, onImport, onAdmin, onLogout, logoutLabel, busy }: Props) {
  const user = useAccountStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const isAdmin = can(user, 'user.manage')
  const canAudit = can(user, 'audit.read')
  const canLibrary = can(user, 'library.manageSystem')

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])

  const run = (action: () => void) => () => { setOpen(false); action() }
  const item = 'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] text-fg-2 hover:bg-panel-2 hover:text-fg focus-visible:bg-panel-2 focus-visible:outline-none disabled:opacity-50'

  return <div ref={ref} className="relative">
    <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((v) => !v)} className="flex h-6 items-center gap-1.5 rounded-sm border border-line bg-panel-2 px-2 text-[12px] text-fg hover:border-accent">
      <span className="flex size-4 items-center justify-center rounded-full bg-accent-soft text-[9px] font-bold text-accent" aria-hidden>{(user?.displayName ?? '?').slice(0, 1)}</span>
      <span className="max-w-40 truncate">{user?.displayName ?? 'Konto'}</span>
      <ChevronDown className="size-3 text-muted" aria-hidden />
    </button>
    {open && <div id={menuId} role="menu" aria-label="Kontomenü" className="absolute right-0 top-7 z-50 w-60 rounded-md border border-line bg-panel p-1 shadow-lg">
      {user && <div className="border-b border-line px-2 pb-2 pt-1"><div className="truncate text-[12px] font-medium text-fg">{user.displayName}</div><div className="truncate text-[11px] text-muted">{user.username}{user.email ? ` · ${user.email}` : ''}</div></div>}
      <div className="py-1">
        <button role="menuitem" type="button" className={item} onClick={run(onSecurity)}><KeyRound className="size-3.5" aria-hidden />Konto & Sicherheit</button>
        <button role="menuitem" type="button" className={item} onClick={run(onImport)}><FileUp className="size-3.5" aria-hidden />Projekt importieren</button>
      </div>
      {(isAdmin || canAudit) && <div className="border-t border-line py-1" role="group" aria-label="Administration">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted"><Shield className="size-3" aria-hidden />Administration</div>
        {isAdmin && <button role="menuitem" type="button" className={item} onClick={run(() => onAdmin('users'))}><Users className="size-3.5" aria-hidden />Benutzer</button>}
        {canAudit && <button role="menuitem" type="button" className={item} onClick={run(() => onAdmin('audit'))}><ScrollText className="size-3.5" aria-hidden />Audit-Log</button>}
        {canLibrary && <button role="menuitem" type="button" className={item} onClick={run(() => onAdmin('library'))}><Library className="size-3.5" aria-hidden />Systembibliothek</button>}
        {isAdmin && <button role="menuitem" type="button" className={item} onClick={run(() => onAdmin('status'))}><Server className="size-3.5" aria-hidden />Systemstatus</button>}
      </div>}
      <div className="border-t border-line pt-1">
        <button role="menuitem" type="button" className={item} disabled={busy} onClick={run(onLogout)}><LogOut className="size-3.5" aria-hidden />{logoutLabel}</button>
      </div>
    </div>}
  </div>
}
