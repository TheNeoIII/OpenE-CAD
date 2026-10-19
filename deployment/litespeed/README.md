# OpenE-CAD: Linux + LiteSpeed

Produktionsziel: React/TypeScript/Vite → same-origin `/api` → lokaler Rust-Webservice → Engineering Core → MariaDB/MySQL und privater Storage. Der Rust-Webservice ist noch nicht implementiert; ein erfolgreicher Frontend-Deploy allein ist keine betriebsbereite Installation.

## Zuständigkeiten und Aufruf

`/srv/repos.sh` verwaltet Deploy Key, Clone, Fetch, Fast-Forward-only, Dirty-Tree-Prüfung, Lock, Webroot, Backup und Deployment-Status. Keine dieser Aufgaben wird hier dupliziert. Modus **Repository-eigenes Deployment-Script**, Pfad `deployment/sync-server-webroot.sh`, erstes Argument Webroot; zusätzlich `DEPLOY_WEBROOT`, optional zusammen `DEPLOY_OWNER`/`DEPLOY_GROUP`. Das Script funktioniert unabhängig vom Arbeitsverzeichnis. Ein vorhandener, dedizierter, beschreibbarer Webroot ist erforderlich. Repository/Storage dürfen ihn weder enthalten noch darin liegen. Symlink-Webroots werden nicht unterstützt.

Voraussetzungen: Bash, Node passend zu Vite 8, exakt die pnpm-Version aus `v0-frontend/package.json`, Git (nur Commit-Lesen), rsync, coreutils; für Ownership `id/getent`, für Healthcheck curl. Build unter einem möglichst unprivilegierten Deployment-Account ausführen; keine von außen änderbaren Hooks als root ausführen.

Ablauf: frozen install → typecheck → production build → optional Rust build → optional migration check → optional migration → fertigen Build veröffentlichen → optional restart → optional readiness. Fehler stoppen mit Exitcode ungleich null. Kein fehlerhafter/halber dist-Build wird veröffentlicht. `BUILD_INFO` enthält Commit, UTC-ISO-Buildzeit und Anwendung. `rsync --delay-updates --delete-delay` ist **keine vollständige atomare Umschaltung**: bei Publish-/Restart-/Readiness-Fehlern das zentrale Backup nutzen; es erfolgt kein zweites Backup- oder Rollback-System. Migrationen müssen abwärtskompatibel sein, da das alte Backend bis zum Restart läuft.

Optionale, ausschließlich administrator-kontrollierte Hooks aus `/srv/<repo>/deploy-secrets.env` (vom zentralen Script exportiert):
- `OPENECAD_BACKEND_BUILD_CMD`
- `OPENECAD_MIGRATION_CHECK_CMD`
- `OPENECAD_MIGRATE_CMD`
- `OPENECAD_BACKEND_RESTART_CMD`
- `OPENECAD_HEALTHCHECK_URL`: später Rust `/api/readiness`, über konfigurierten VHost oder Loopback; nie auf `index.html` richten.

Nicht gesetzte Hooks werden klar als übersprungen gemeldet. Hook-Befehle und deren Ausgabe werden nicht geloggt (Secrets); Fehler anhand geschützter Service-Logs untersuchen. Keine Fake-Migration oder automatische destruktive DB-Aktion. Kein Domain-/Portdefault. `VITE_OPENECAD_API_BASE=/api` ist der Standard. Frontend-Variablen sind öffentlich; niemals DB-/Auth-Secrets mit `VITE_` prefixen.

## VHost-Konfiguration

1. Document root ausschließlich auf den fertigen Webroot setzen, niemals auf das Git-Repository. Kein Verzeichnislisting.
2. Rust-Service nur an `127.0.0.1:<konfigurierter Port>` binden; Firewall verhindert direkten öffentlichen Zugriff. LiteSpeed External App/Proxy Context für **`/api/` und `/api` vor dem SPA-Rewrite** anlegen; URI `/api/...` unverändert weiterleiten, einschließlich Cookies, CSRF-Header und Fehlerstatus. Forwarded-Headers vom Client entfernen und vertrauenswürdig neu setzen; Rust vertraut ausschließlich dem konfigurierten Proxy, sonst ist IP-Limiting umgehbar. Requestgrößen und Timeouts begrenzen.
3. Unbekannte Nicht-API-Routen auf `/index.html` umschreiben. API-Fehler niemals in HTML oder `200` umwandeln. Fehlende Assets sollen 404 liefern. `.htaccess.example` ist nur ein optionales Rewrite-Beispiel; Proxy im VHost konfigurieren. Script überschreibt vorhandene `.htaccess` nicht.
4. HTTPS/TLS im LiteSpeed-VHost terminieren. Domain, APP_URL, WebAuthn RP-ID und Origin später konfigurieren; keine geratenen Werte verwenden.
5. Storage außerhalb des Webroots; kein Alias, kein öffentlicher Symlink. `.env`, Source-Dateien, Source Maps, Git-Metadaten und Backups nie ausliefern. Script schützt vorhandene Dotfiles sowie Altverzeichnisse storage/uploads/assets-private vor Löschung; solche Altbestände sind **nicht zulässig öffentlich** und müssen administrativ außerhalb des Webroots migriert werden.
6. Response-Header am VHost setzen: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, bei HTTPS `Strict-Transport-Security: max-age=63072000`, für die authentifizierte App `X-Frame-Options: SAMEORIGIN`. Permissions-Policy auf tatsächlich benötigte Funktionen begrenzen. CSP zuerst report-only prüfen; Assets und API same-origin erlauben. Nicht über HTML-Meta ersetzen.
7. `index.html` und `BUILD_INFO` nicht langfristig cachen, gehashte `/assets/` immutable. `/api` und Auth-Antworten `Cache-Control: no-store`.

Betrieb: DB und Storage konsistent sichern, Restore regelmäßig prüfen; privilegierte Deploy-Zugänge von Runtime-Accounts trennen. Readiness muss DB, Migrationen und Storage prüfen, Health nur den Prozess. Keinen immer-grünen Ersatzendpunkt einrichten.
