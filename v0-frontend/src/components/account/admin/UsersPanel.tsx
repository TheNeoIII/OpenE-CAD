import { useState } from 'react'
import useSWR from 'swr'
import { UserPlus } from 'lucide-react'
import { backend } from '@/backend'
import { adminGuard, type AdminActionResult, type AdminUser } from '@/backend/admin'
import type { AccountStatus } from '@/backend/auth'
import type { Role } from '@/backend/permissions'
import { Badge, Button, Checkbox, Field, Input, Select, Spinner } from '@/components/ui/primitives'
import { useAccountStore } from '@/stores/accountStore'

const STATUS: Record<AccountStatus, { label: string; tone: 'ok' | 'neutral' | 'error' }> = {
  active: { label: 'Aktiv', tone: 'ok' },
  disabled: { label: 'Deaktiviert', tone: 'neutral' },
  locked: { label: 'Gesperrt', tone: 'error' },
}

const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export function UsersPanel() {
  const admin = backend.admin!
  const { data: users, error, isLoading, mutate } = useSWR('admin-users', () => admin.listUsers())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const selected = users?.find((u) => u.id === selectedId) ?? null

  if (isLoading) return <div className="flex items-center gap-2 p-4 text-[12px] text-muted" role="status"><Spinner />Benutzer werden geladen …</div>
  if (error || !users) return <p role="alert" className="p-4 text-[12px] text-error">{error?.message ?? 'Benutzer konnten nicht geladen werden.'}</p>

  return <div className="flex h-full min-h-0 flex-col lg:flex-row">
    <section className="min-h-0 flex-1 overflow-auto" aria-label="Benutzerliste">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="text-[12px] text-muted">{users.length} Konten · keine öffentliche Selbstregistrierung</p>
        <Button size="sm" variant="primary" icon={UserPlus} onClick={() => { setCreating(true); setSelectedId(null) }}>Benutzer anlegen</Button>
      </div>
      <table className="w-full border-collapse text-[12px]">
        <thead className="sticky top-0 bg-panel text-left text-[11px] text-muted">
          <tr>{['Anzeigename', 'Benutzername', 'E-Mail', 'Rolle', '2FA', 'Passkeys', 'Status', 'Letzter Login'].map((h) => <th key={h} scope="col" className="border-b border-line px-3 py-1.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {users.map((u) => <tr key={u.id} aria-selected={u.id === selectedId} className={`cursor-pointer border-b border-line hover:bg-panel-2 ${u.id === selectedId ? 'bg-panel-2' : ''}`} onClick={() => { setSelectedId(u.id); setCreating(false) }}>
            <td className="px-3 py-1.5"><button type="button" className="text-left font-medium text-fg hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedId(u.id); setCreating(false) }}>{u.displayName}</button></td>
            <td className="px-3 py-1.5 font-mono text-fg-2">{u.username}</td>
            <td className="px-3 py-1.5 text-fg-2">{u.email}</td>
            <td className="px-3 py-1.5"><Badge tone={u.roles.includes('admin') ? 'accent' : 'neutral'}>{u.roles.includes('admin') ? 'admin' : 'user'}</Badge></td>
            <td className="px-3 py-1.5">{u.totpEnabled ? <Badge tone="ok">TOTP</Badge> : <span className="text-muted">—</span>}</td>
            <td className="px-3 py-1.5 tabular-nums text-fg-2">{u.passkeyCount || '—'}</td>
            <td className="px-3 py-1.5"><Badge tone={STATUS[u.status].tone}>{STATUS[u.status].label}</Badge>{u.mustChangePassword && <Badge tone="warn" className="ml-1">PW-Wechsel</Badge>}</td>
            <td className="px-3 py-1.5 tabular-nums text-fg-2">{dateTime(u.lastLoginAt)}</td>
          </tr>)}
        </tbody>
      </table>
    </section>
    {(creating || selected) && <aside className="w-full shrink-0 overflow-auto border-t border-line bg-panel lg:w-96 lg:border-l lg:border-t-0" aria-label={creating ? 'Benutzer anlegen' : 'Benutzer bearbeiten'}>
      {creating ? <CreateUserForm onDone={(id) => { setCreating(false); setSelectedId(id); void mutate() }} onCancel={() => setCreating(false)} />
        : selected && <UserDetail key={selected.id} user={selected} users={users} onChanged={() => void mutate()} />}
    </aside>}
  </div>
}

function CreateUserForm({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ username: '', displayName: '', email: '', role: 'user' as Role })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { onDone((await backend.admin!.createUser(form)).id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Anlegen fehlgeschlagen.') } finally { setBusy(false) }
  }
  return <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3 p-4">
    <h2 className="text-[13px] font-semibold text-fg">Benutzer anlegen</h2>
    <Field label="Benutzername" htmlFor="nu-username"><Input id="nu-username" required autoComplete="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
    <Field label="Anzeigename" htmlFor="nu-name"><Input id="nu-name" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></Field>
    <Field label="E-Mail" htmlFor="nu-email"><Input id="nu-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
    <Field label="Rolle" htmlFor="nu-role"><Select id="nu-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="user">user</option><option value="admin">admin</option></Select></Field>
    <p className="text-[11.5px] text-muted">Das Initialpasswort bzw. der Einladungslink wird ausschließlich vom Rust-Server erzeugt. Beim ersten Login ist ein Passwortwechsel erforderlich.</p>
    {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
    <div className="flex gap-2"><Button type="submit" variant="primary" disabled={busy}>Anlegen</Button><Button onClick={onCancel}>Abbrechen</Button></div>
  </form>
}

function UserDetail({ user, users, onChanged }: { user: AdminUser; users: AdminUser[]; onChanged: () => void }) {
  const actorId = useAccountStore((s) => s.user?.id)
  const { data: detail, mutate } = useSWR(['admin-user', user.id], () => backend.admin!.getUser(user.id))
  const [form, setForm] = useState({ displayName: user.displayName, email: user.email, role: (user.roles.includes('admin') ? 'admin' : 'user') as Role, mustChangePassword: user.mustChangePassword })
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const disableBlocked = adminGuard(users, actorId, user, { disable: true })
  const demoteBlocked = user.roles.includes('admin') && form.role === 'user' ? adminGuard(users, actorId, user, { demote: true }) : null

  async function act(action: () => Promise<AdminActionResult | unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true); setNotice(null)
    try {
      const result = await action()
      const message = result && typeof result === 'object' && 'message' in result ? String((result as AdminActionResult).message) : 'Gespeichert.'
      setNotice({ tone: 'ok', text: message })
      onChanged(); void mutate()
    } catch (cause) { setNotice({ tone: 'error', text: cause instanceof Error ? cause.message : 'Aktion fehlgeschlagen.' }) } finally { setBusy(false) }
  }

  return <div className="flex flex-col gap-4 p-4">
    <div><h2 className="text-[13px] font-semibold text-fg">{user.displayName}</h2><p className="font-mono text-[11.5px] text-muted">{user.username} · angelegt {dateTime(user.createdAt)}</p></div>
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => backend.admin!.updateUser(user.id, form)) }}>
      <Field label="Anzeigename" htmlFor="eu-name"><Input id="eu-name" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></Field>
      <Field label="E-Mail" htmlFor="eu-email"><Input id="eu-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Rolle" htmlFor="eu-role" hint={demoteBlocked ?? undefined}><Select id="eu-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="user">user</option><option value="admin">admin</option></Select></Field>
      <Checkbox id="eu-mcp" checked={form.mustChangePassword} onChange={(v) => setForm({ ...form, mustChangePassword: v })} label="Passwortwechsel beim nächsten Login erzwingen" />
      <div><Button type="submit" variant="primary" size="sm" disabled={busy || !!demoteBlocked}>Änderungen speichern</Button></div>
    </form>

    <section className="flex flex-col gap-2 border-t border-line pt-3" aria-label="Kontostatus">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Kontostatus</h3>
      <div className="flex flex-wrap gap-2">
        {user.status === 'disabled'
          ? <Button size="sm" disabled={busy} onClick={() => void act(() => backend.admin!.enableUser(user.id))}>Aktivieren</Button>
          : <Button size="sm" variant="danger" disabled={busy || !!disableBlocked} title={disableBlocked ?? undefined} onClick={() => void act(() => backend.admin!.disableUser(user.id), `${user.displayName} deaktivieren? Daten und Besitz bleiben erhalten.`)}>Deaktivieren</Button>}
        {user.status === 'locked' && <Button size="sm" disabled={busy} onClick={() => void act(() => backend.admin!.unlockUser(user.id))}>Login-Sperre aufheben</Button>}
      </div>
      {disableBlocked && user.status !== 'disabled' && <p className="text-[11.5px] text-muted">{disableBlocked}</p>}
      <p className="text-[11.5px] text-muted">Konten werden deaktiviert statt gelöscht; Projekt- und Symbolbesitz bleiben erhalten.</p>
    </section>

    <section className="flex flex-col gap-2 border-t border-line pt-3" aria-label="Sicherheit">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sicherheit</h3>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void act(() => backend.admin!.requestPasswordReset(user.id, true), 'Passwort-Reset anstoßen? Der Server erzeugt einen einmaligen Link.')}>Passwort-Reset vorbereiten</Button>
        <Button size="sm" disabled={busy || !user.totpEnabled} onClick={() => void act(() => backend.admin!.resetTotp(user.id), 'TOTP für dieses Konto zurücksetzen?')}>TOTP zurücksetzen</Button>
        <Button size="sm" disabled={busy} onClick={() => void act(() => backend.admin!.revokeSessions(user.id), 'Alle Sitzungen dieses Kontos widerrufen?')}>Sitzungen widerrufen{detail ? ` (${detail.activeSessions})` : ''}</Button>
      </div>
      <h4 className="mt-1 text-[11.5px] font-medium text-fg-2">Passkeys</h4>
      {!detail ? <Spinner /> : detail.passkeys.length === 0 ? <p className="text-[11.5px] text-muted">Keine Passkeys registriert.</p>
        : <ul className="flex flex-col gap-1">{detail.passkeys.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 rounded-sm border border-line px-2 py-1 text-[12px]"><span>{p.name}<span className="ml-2 text-[11px] text-muted">zuletzt {dateTime(p.lastUsedAt)}</span></span><Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => backend.admin!.removePasskey(user.id, p.id), `Passkey „${p.name}" entfernen?`)}>Entfernen</Button></li>)}</ul>}
    </section>
    {notice && <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`text-[12px] ${notice.tone === 'error' ? 'text-error' : 'text-ok'}`}>{notice.text}</p>}
  </div>
}
