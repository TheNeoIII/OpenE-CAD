# Web API — React ↔ Rust

Status: verbindlicher **Client-Vertragsentwurf**, kein implementierter Rust-Webserver. Der neue HTTP-Adapter nutzt diesen Vertrag; erreichbare Endpunkte, produktive Authentifizierung und Datenpersistenz sind noch zu implementieren. Entwicklungsmodus bietet Mock-CAD-Daten und eine explizit ungeschützte UI-Vorschau, keine simulierte Authentifizierung. Keine produktiven Default-Konten oder -Passwörter.

## Grenze und Transport

UI → `OpenEcadBackend` → `HttpOpenEcadBackend` → same-origin `/api` → Rust Web API → Engineering Core → MariaDB/Storage. Keine fetch-Aufrufe in UI-Komponenten, keine SQL-/DB-Credentials im Frontend. `VITE_OPENECAD_API_BASE` erlaubt einen alternativen Same-Origin-Pfad; absolute URLs werden bewusst abgewiesen. Production wählt immer HTTP, Development standardmäßig Mock-CAD (mit `VITE_OPENECAD_BACKEND=http` echten Server testen). Tauri ist deferred und wird im Web-Entrypoint nicht importiert.

JSON-Requests/Responses, UTF-8; DTOs entsprechen den bestehenden TypeScript-Typen unter `v0-frontend/src/types/` und `src/backend/auth.ts`. Rust validiert alle Felder, Größen, Referenzen, IDs und Berechtigungen unabhängig vom Client. Persistente IDs UUIDv7; Mock-IDs sind nur Entwicklungsdaten. Jedes Projekt-/Dokument-/Dateiobjekt muss serverseitig auf den Session-Benutzer und dessen Rechte geprüft werden (auch GET, Duplicate, Export, DataTable). Rollen zunächst admin/user, additive Rollen später möglich; Rollenanzeige im Client ist keine Autorisierung.

Erfolg: GET/PUT/POST 200 mit direktem DTO (create optional 201), Lösch-/Void-Aktionen 204 ohne Body. Fehler: `{ "error": { "code": "...", "message": "..." } }`; 400 Validierung, 401 keine Session, 403 CSRF/Rechte, 404 unbekannt/nicht zugänglich, 409 Konflikt, 413 zu groß, 429 gesperrt/Rate Limit, 501 noch nicht implementiert, 503 nicht bereit. Keine Stacktraces, SQL oder Account-Existenz offenlegen. 429 liefert `Retry-After` in Sekunden; Sperrdauer wird nur vom Server vorgegeben. Der Client meldet Netzwerkfehler und HTML-SPA-Antworten als Fehler, nutzt 30s Timeout, keine automatischen Mutation-Retries und keine Redirects. Lang laufende Export-/Import-Jobs benötigen später einen eigenen Jobvertrag statt längerer synchroner Requests.

## Implementierte Adapter-Zuordnung (Server noch ausstehend)

Alle Pfade relativ zu `/api`:

| Methode / Pfad | Input | Output / Backend-Methode |
|---|---|---|
| GET /projects | — | Project[] / listProjects |
| GET /project-templates | — | ProjectTemplate[] / listTemplates |
| POST /projects | NewProjectInput | Project / createProject |
| GET /projects/:id | — | {project, document} / openProject |
| PUT /projects/:id | {project} | Project / updateProject |
| PUT /projects/:id/document | {project, document, expectedRevision} | {savedAt, stateRevision} / saveProject, atomar; 409 `PROJECT_REVISION_CONFLICT` bei veralteter Revision |
| POST /projects/:id/duplicate | {name} | Project / duplicateProject |
| POST /projects/:id/archive | {archived: boolean} | Project / archiveProject (nur active ↔ archived) |
| POST /projects/:id/trash | — | Project / trashProject (Status `deleted`, `deletedAt` gesetzt) |
| POST /projects/:id/restore | — | Project / restoreProject (nur Admin, nur aus Papierkorb) |
| DELETE /projects/:id | — | 204 / purgeProject (nur Admin, nur aus Papierkorb) |
| GET /documents/:id/pages/:pageId | — | CadPage / getPage |
| PUT /documents/:id/pages/:pageId/objects | {objects: CadObject[]} | 204 / updateObjects |
| GET /articles?query=... | optional query | Article[] / listArticles |
| POST /documents/:id/validate | {document} | ValidationResult[] / validateProject |
| POST /data-tables | {view, document: CadDocument \| null} | DataTable / getDataTable |
| POST /export | {document, options: ExportOptions} | {fileName} / exportDocuments |

Document-ID und Project-ID sind nicht stillschweigend identisch: Validierung folgt deshalb dem bestehenden dokumentbasierten Interface. Entwürfe werden mitgegeben, damit Prüfungen/Tabellen/Export ungespeicherte Änderungen abbilden. Server prüft Projektbezug des Dokuments. `articles` benötigt kein Dokument, alle anderen Datenansichten eines. Export liefert nach aktuellem Interface nur einen Dateinamen, noch keinen Download; später kontrollierter Downloadvertrag nötig. Kein Dateipfad darf hier als öffentlich verfügbare URL interpretiert werden. Save ersetzt Projekt und Dokument in einer Transaktion und prüft `expectedRevision` gegen die gespeicherte `stateRevision` (optimistische Sperre). Lebenszyklus, Konfliktverhalten und Audit-Ereignisse: siehe [PROJECT_LIFECYCLE.md](PROJECT_LIFECYCLE.md). Collaboration (Echtzeit) bleibt false.

## Authentifizierung

`OpenEcadBackend.account` bündelt ausschließlich serverseitige Account-Aufrufe.

| Methode / Pfad | Input | Antwort |
|---|---|---|
| GET /auth/session | Cookie optional | AuthSession `{user: null \| {id,displayName,roles}, csrfToken, expiresAt: null \| ISO8601}` |
| POST /auth/login | {identifier,password} | LoginResult (s.u.) |
| POST /auth/totp/verify | {code} | LoginResult |
| POST /auth/recovery/verify | {code} | LoginResult |
| POST /auth/logout | — | 204; Session widerrufen, Cookie löschen |
| GET /account/security | Session | `{totpEnabled,passkeys:[{id,name,createdAt}],features:{passwordChange,totp,passkeys,recoveryCodes}}` |

LoginResult: `{status:'authenticated',session:AuthSession}` oder `{status:'second_factor_required',methods:['totp','recovery']}` (mindestens ein unterstützter Faktor). Ein Faktor-Challenge ist eine kurzlebige, begrenzte, serverseitige Pre-Auth-Session im HttpOnly-Cookie, **keine** authentifizierte Session. Passwortprüfung allein darf bei aktiviertem zweiten Faktor niemals Projektrechte geben. TOTP/Recovery nur mit gültiger Challenge; Challenge nach Erfolg/Timeout invalidieren. Nach Erfolg Session-ID und CSRF-Token rotieren. Ein neuer Login kann eine Challenge ersetzen.

GET session liefert auch anonym einen servergebundenen CSRF-Token und Pre-Auth-Cookie (200, user:null); bei abgelaufener Session entsprechend anonym. Alle mutierenden Requests einschließlich Login, Logout und Faktorprüfung benötigen `X-CSRF-Token`; Token nur im Arbeitsspeicher, Session-ID ausschließlich im Cookie. Rust prüft Token **und** vertrauenswürdigen Origin, lehnt fehlende/fremde Origins ab und erlaubt kein unkontrolliertes Credential-CORS. Cookies HttpOnly, SameSite=Lax oder strenger, Secure in Production, Path=/api (bei anderem Base-Pfad anpassen), begrenzte konfigurierbare Lebenszeit. Auth-Responses no-store; Logs enthalten weder Credentials, Tokens noch Faktor-Secrets. Der Client schließt bei 401 den Editor; nach erneuter Anmeldung/Logout werden durch Neuladen auch alle Dokument-/History-/Draft-Caches geleert. Backend muss trotz UI-Gate jeden Request autorisieren.

## Noch nicht implementierte WebAuthn-/Kontoverwaltung

Passkey-Schaltfläche erklärt den fehlenden Server, keine vorgetäuschte Authenticator-Interaktion. Kontoverwaltung ist bewusst deaktiviert, auch wenn ein späterer Server Featureflags liefert. Zuerst Rust-Implementierung, dann Browser-WebAuthn mit echten Challenges und Reauth-Vertrag ergänzen:

- POST /auth/passkeys/options/register → kurzlebige Challenge + PublicKeyCredentialCreationOptions; authentifizierte/erneut geprüfte Session.
- POST /auth/passkeys/register → Attestation, ClientData und Challenge prüfen; Credential-ID/Public Key speichern, nie private Schlüssel.
- POST /auth/passkeys/options/authenticate → Challenge + PublicKeyCredentialRequestOptions; keine Account-Enumeration.
- POST /auth/passkeys/authenticate → Assertion, Origin/RP-ID, Challenge, User Verification und Signatur prüfen; Session rotieren.
- GET /account/passkeys, DELETE /account/passkeys/:id → mehrere Passkeys pro Benutzer, Besitzprüfung, Reauth/CSRF bei Löschung; letzter Loginweg darf nicht unbeabsichtigt entfallen.

Diese Pfade sind reservierte Zielverträge, werden vom Adapter noch nicht aufgerufen. Binärdaten später einheitlich Base64URL; Challenge-ID, TTL, Counter-/Backup-Policy und unterstützte Browser festlegen. Passwortänderung, TOTP-Setup (QR/Secret + Bestätigung), Deaktivierung, Recovery-Code-Neuausstellung und aktive Sessions benötigen eigene überprüfte Reauth-Verträge; hier keine spekulativen Endpunkte.

## Sicherheit und Betrieb (Rust-Pflichten)

Argon2id mit individuellem Salt und überprüften Parametern; niemals Klartext oder Hashes an React. Zufällige, kryptographisch starke Session-IDs, Hash der ID serverseitig, Ablauf/Widerruf serverautoritativ. Kein Auth-Token in localStorage. Optionales TOTP-Secret verschlüsseln, Schlüssel außerhalb der DB; verwendete Zeitfenster gegen Replay schützen. Recovery Codes zufällig, nur gehasht, einmalig anzeigen und atomar verbrauchen.

Konfigurierbare Konto- **und** IP-Begrenzung, temporäre Sperre über AUTH_MAX_FAILED_ATTEMPTS/AUTH_LOCKOUT_SECONDS und separate IP-Policy. Atomare Zähler, begrenzte Challenges, Zähler nach Erfolg zurücksetzen/abbauen, Audit-Ereignisse ohne Geheimnisse. Identische öffentliche Fehler für unbekannten Benutzer/falsches Passwort, keine Sperrentscheidung im Client. Nur vertrauenswürdige Proxy-IP-Header auswerten. Benutzeranlage ausschließlich durch Admin (Bootstrap-Verfahren noch festzulegen), keine Registrierung.

GET /health: Prozess erreichbar (200), keine Fake-DB-Prüfung. GET /readiness: 200 erst bei DB-Verbindung, passendem Migrationsstand, nutzbarem privaten Storage und Betriebsbereitschaft; sonst 503, keine sensiblen Verbindungsdetails. Beide erst mit realem Rust-Service implementieren. Geplanter POST /import wird erst mit Staging-/Mapping-/Bestätigungssemantik aus [IMPORT_ARCHITECTURE.md](IMPORT_ARCHITECTURE.md) konkretisiert; derzeit kein Request und kein Parser.
