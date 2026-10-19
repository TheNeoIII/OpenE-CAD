import { useState, type FormEvent } from 'react'
import { Fingerprint, LockKeyhole, ArrowRight, CircuitBoard } from 'lucide-react'
import { backend } from '@/backend'
import type { LoginResult } from '@/backend/auth'
import { ApiError } from '@/backend/HttpOpenEcadBackend'
import { Button, Field, Input } from '@/components/ui/primitives'

export function LoginScreen({ onAuthenticated, onPreview, expired = false, connectionError }: {
  onAuthenticated: () => void
  onPreview?: () => void
  expired?: boolean
  connectionError?: string
}) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [method, setMethod] = useState<'totp' | 'recovery'>('totp')
  const [methods, setMethods] = useState<('totp' | 'recovery')[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [previewFactor, setPreviewFactor] = useState(false)

  function accept(result: LoginResult) {
    if (result.status === 'authenticated') onAuthenticated()
    else { setMethods(result.methods); setMethod(result.methods[0] ?? 'totp') }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !backend.account) return
    setBusy(true); setError('')
    try {
      if (methods) accept(await backend.account.verifySecondFactor(method, code))
      else accept(await backend.account.login(identifier.trim(), password))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Anmeldung fehlgeschlagen.'
      setError(cause instanceof ApiError && cause.retryAfterSeconds ? `${message} Erneut in ${cause.retryAfterSeconds} Sekunden versuchen (Servervorgabe).` : message)
    } finally { setPassword(''); setCode(''); setBusy(false) }
  }
  const factor = methods !== null || previewFactor
  return <main className="flex min-h-dvh items-center justify-center bg-app p-6 text-fg">
    <div className="w-full max-w-md">
      <header className="mb-8 flex items-center gap-3"><CircuitBoard className="size-9 text-accent" aria-hidden /><div><div className="text-xl font-semibold tracking-tight">OpenE-CAD</div><div className="text-xs text-muted">Electrical engineering · Self-hosted</div></div></header>
      <section className="rounded-xl border border-line bg-panel p-6 shadow-xl">
        <LockKeyhole className="mb-5 size-6 text-accent" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">{factor ? 'Identität bestätigen' : 'Willkommen zurück'}</h1>
        <p className="mb-6 mt-2 text-sm text-muted">{factor ? 'Zweiten Faktor für die Anmeldung eingeben.' : 'Melden Sie sich an Ihrer OpenE-CAD-Instanz an.'}</p>
        {onPreview && <p className="mb-4 rounded-md border border-line bg-app p-3 text-xs text-warn">Development-only: UI-Vorschau ohne Authentifizierung. Keine echten Zugangsdaten eingeben.</p>}
        {expired && <p role="alert" className="mb-4 text-sm text-warn">Die Session ist abgelaufen. Bitte erneut anmelden. Nicht gespeicherte Änderungen bleiben bis zum Neuladen nur im Arbeitsspeicher.</p>}
        {(error || connectionError) && <p role="alert" className="mb-4 text-sm text-error">{error || connectionError}</p>}
        <form onSubmit={submit} className="flex flex-col gap-4" onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
        }}>
          {factor ? <>
            <Field label={method === 'totp' ? 'Authenticator-Code' : 'Recovery Code'} htmlFor="login-code"><Input id="login-code" className="h-10" autoComplete="one-time-code" inputMode={method === 'totp' ? 'numeric' : 'text'} value={code} onChange={(e) => setCode(e.target.value)} required /></Field>
            {(!methods || methods.length > 1) && <Button variant="ghost" onClick={() => { setMethod(method === 'totp' ? 'recovery' : 'totp'); setCode('') }}>{method === 'totp' ? 'Recovery Code verwenden' : 'Authenticator verwenden'}</Button>}
          </> : <>
            <Field label="Benutzername oder E-Mail" htmlFor="login-identifier"><Input id="login-identifier" className="h-10" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required maxLength={254} /></Field>
            <Field label="Passwort" htmlFor="login-password"><Input id="login-password" className="h-10" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          </>}
          <Button type="submit" variant="primary" className="h-10" icon={ArrowRight} disabled={busy || !backend.account}>{busy ? 'Wird geprüft …' : factor ? 'Bestätigen' : 'Anmelden'}</Button>
        </form>
        <Button icon={Fingerprint} className="mt-3 h-10 w-full" onClick={() => setError('Passkey-Anmeldung ist vorbereitet, aber noch nicht verfügbar. Die Rust-WebAuthn-Implementierung fehlt.')}>Mit Passkey anmelden</Button>
        {onPreview && <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4"><Button onClick={() => setPreviewFactor(!previewFactor)}>{previewFactor ? 'Zur Login-Vorschau' : 'TOTP / Recovery UI ansehen'}</Button><Button variant="primary" onClick={onPreview}>Editor-Vorschau öffnen (ungeschützt)</Button></div>}
      </section>
      <p className="mt-5 text-center text-xs leading-relaxed text-muted">Keine öffentliche Registrierung. Benutzerkonten werden durch Ihre Administration angelegt.</p>
    </div>
  </main>
}
