import useSWR from 'swr'
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react'
import { backend } from '@/backend'
import { Dialog } from '@/components/ui/Dialog'
import { Badge, Button } from '@/components/ui/primitives'

export function SecurityDialog({ onClose }: { onClose: () => void }) {
  const { data, error, isLoading, mutate } = useSWR(backend.account ? 'account-security' : null, () => backend.account!.security(), { shouldRetryOnError: false })
  return <Dialog title="Konto & Sicherheit" description="Sicherheitsentscheidungen werden ausschließlich vom Server getroffen." onClose={onClose}>
    <div className="flex flex-col gap-5 text-sm">
      <p className="rounded-md border border-line bg-app p-3 text-muted">Verwaltungsabläufe sind vorbereitet, aber noch nicht implementiert. Es werden keine Passwörter, TOTP-Secrets oder Recovery Codes lokal gespeichert oder simuliert.</p>
      {isLoading && <p role="status">Kontostatus wird geladen …</p>}
      {error && <div role="alert">{error.message}<Button onClick={() => void mutate()}>Erneut laden</Button></div>}
      <section className="space-y-2"><h3 className="flex items-center gap-2 font-semibold"><KeyRound className="size-4" aria-hidden />Passwort</h3><p className="text-xs text-muted">Passwortänderung mit erneuter serverseitiger Identitätsprüfung.</p><Button disabled>Passwort ändern · geplant</Button></section>
      <section className="space-y-2 border-t border-line pt-4"><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" aria-hidden />Zwei-Faktor-Authentifizierung <Badge>{data ? data.totpEnabled ? 'Aktiv' : 'Inaktiv' : 'Status unbekannt'}</Badge></h3><p className="text-xs text-muted">Geplant: Secret / QR-Code, Bestätigungscode, Aktivieren und Deaktivieren. Recovery Codes werden einmalig angezeigt und serverseitig gehasht sowie nach Verwendung invalidiert.</p><div className="flex flex-wrap gap-2"><Button disabled>TOTP einrichten · geplant</Button><Button disabled>TOTP deaktivieren · geplant</Button><Button disabled>Recovery Codes generieren · geplant</Button></div></section>
      <section className="space-y-2 border-t border-line pt-4"><h3 className="flex items-center gap-2 font-semibold"><Fingerprint className="size-4" aria-hidden />Passkeys</h3><p className="text-xs text-muted">Mehrere Passkeys pro Konto vorgesehen. Private Schlüssel verlassen den Authenticator nicht.</p>{data?.passkeys.map((key) => <div key={key.id} className="flex justify-between gap-3"><span>{key.name}</span><Button disabled>Entfernen · geplant</Button></div>)}<Button disabled>Passkey hinzufügen · geplant</Button></section>
      <p className="text-xs text-muted">Aktive Sessions und deren Widerruf sind für eine spätere Erweiterung vorgesehen.</p>
    </div>
  </Dialog>
}
