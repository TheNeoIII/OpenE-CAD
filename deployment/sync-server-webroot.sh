#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

log() { printf '[OpenE-CAD] %s\n' "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }
trap 'log "Deployment abgebrochen (Zeile $LINENO); zentralen Deployment-Status und Backup prüfen." >&2' ERR

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
FRONTEND="$REPO_ROOT/v0-frontend"
WEBROOT_INPUT="${1:-${DEPLOY_WEBROOT:-}}"
[[ -n "$WEBROOT_INPUT" && "$WEBROOT_INPUT" = /* ]] || fail 'Absoluter Webroot als Argument oder DEPLOY_WEBROOT erforderlich.'
for tool in realpath node pnpm rsync git mktemp; do command -v "$tool" >/dev/null || fail "Werkzeug fehlt: $tool"; done
WEBROOT="$(realpath -e -- "$WEBROOT_INPUT")"
[[ -d "$WEBROOT" && ! -L "$WEBROOT_INPUT" ]] || fail 'Webroot muss ein vorhandenes Verzeichnis sein, kein Symlink.'
if [[ -n "${DEPLOY_WEBROOT:-}" ]]; then
  [[ "$WEBROOT" = "$(realpath -e -- "$DEPLOY_WEBROOT")" ]] || fail 'Argument und DEPLOY_WEBROOT unterscheiden sich.'
fi
case "$WEBROOT" in /|/srv|/var|/var/www|/home|/tmp|/etc|/usr|/opt) fail 'Unsicherer Webroot.';; esac
[[ "$WEBROOT/" != "$REPO_ROOT/"* && "$REPO_ROOT/" != "$WEBROOT/"* ]] || fail 'Repository und Webroot dürfen sich nicht überlappen.'
if [[ -n "${STORAGE_PATH:-}" ]]; then
  [[ "$STORAGE_PATH" = /* ]] || fail 'STORAGE_PATH muss absolut sein.'
  STORAGE="$(realpath -m -- "$STORAGE_PATH")"
  [[ "$STORAGE/" != "$WEBROOT/"* && "$WEBROOT/" != "$STORAGE/"* ]] || fail 'Storage und Webroot dürfen sich nicht überlappen.'
fi
[[ -w "$WEBROOT" ]] || fail 'Webroot ist nicht beschreibbar.'
[[ -z "${DEPLOY_OWNER:-}" || -n "${DEPLOY_GROUP:-}" ]] || fail 'DEPLOY_GROUP fehlt.'
[[ -z "${DEPLOY_GROUP:-}" || -n "${DEPLOY_OWNER:-}" ]] || fail 'DEPLOY_OWNER fehlt.'
if [[ -n "${DEPLOY_OWNER:-}" ]]; then
  id "$DEPLOY_OWNER" >/dev/null || fail 'DEPLOY_OWNER unbekannt.'
  getent group "$DEPLOY_GROUP" >/dev/null || fail 'DEPLOY_GROUP unbekannt.'
fi
if [[ -n "${OPENECAD_HEALTHCHECK_URL:-}" ]]; then
  command -v curl >/dev/null || fail 'curl fehlt für Healthcheck.'
  [[ "$OPENECAD_HEALTHCHECK_URL" = http://* || "$OPENECAD_HEALTHCHECK_URL" = https://* ]] || fail 'Healthcheck benötigt HTTP(S).'
fi

run_hook() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then log "$name nicht gesetzt; übersprungen."; return; fi
  log "$name wird ausgeführt (Befehl und Ausgabe werden zum Schutz von Secrets nicht geloggt)."
  (cd -- "$REPO_ROOT" && bash -Eeuo pipefail -c "${!name}") >/dev/null 2>&1 || fail "$name fehlgeschlagen; Live-Publish bzw. Abschluss abgebrochen."
}

log 'Frontend: Frozen Install, Typecheck und Production Build.'
cd -- "$FRONTEND"
EXPECTED_PNPM="$(node -p "require('./package.json').packageManager.split('@')[1]")"
[[ "$(pnpm --version)" = "$EXPECTED_PNPM" ]] || fail "pnpm-Version muss $EXPECTED_PNPM entsprechen."
pnpm install --frozen-lockfile
pnpm typecheck
# Production builds cannot select mock or Tauri through inherited deploy variables.
VITE_OPENECAD_BACKEND=http pnpm build
[[ -s "$FRONTEND/dist/index.html" ]] || fail 'Build enthält kein index.html.'
run_hook OPENECAD_BACKEND_BUILD_CMD
run_hook OPENECAD_MIGRATION_CHECK_CMD
run_hook OPENECAD_MIGRATE_CMD

STAGING="$(mktemp -d -- "${TMPDIR:-/tmp}/openecad-publish.XXXXXXXX")"
cleanup() { rm -rf -- "$STAGING"; }
trap cleanup EXIT
rsync -rlt --exclude='.*' --exclude='*.map' -- "$FRONTEND/dist/" "$STAGING/"
COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
printf 'commit=%s\nbuilt_at=%s\napplication=OpenE-CAD\n' "$COMMIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STAGING/BUILD_INFO"
RSYNC_OWNER=()
if [[ -n "${DEPLOY_OWNER:-}" ]]; then RSYNC_OWNER=(--owner --group "--chown=$DEPLOY_OWNER:$DEPLOY_GROUP"); fi
log 'Fertigen Build veröffentlichen; zentrale Backups bleiben unberührt.'
# Hidden files (including .env/.htaccess) and legacy storage directories are protected.
# --delay-updates is per-file safe, not a whole-tree atomic release switch.
rsync -rlt --delay-updates --delete-delay --chmod=D755,F644 "${RSYNC_OWNER[@]}" \
  --filter='P .*' --filter='P storage/***' --filter='P uploads/***' --filter='P assets-private/***' \
  -- "$STAGING/" "$WEBROOT/"
run_hook OPENECAD_BACKEND_RESTART_CMD
if [[ -n "${OPENECAD_HEALTHCHECK_URL:-}" ]]; then
  log 'Readiness-URL prüfen (URL wird nicht geloggt).'
  curl --fail --silent --output /dev/null --connect-timeout 5 --max-time 20 --retry 3 --retry-delay 2 --retry-connrefused "$OPENECAD_HEALTHCHECK_URL" || fail 'Readiness-Check fehlgeschlagen; zentralen Rollback prüfen.'
else
  log 'OPENECAD_HEALTHCHECK_URL nicht gesetzt; Backend-Gesundheit NICHT verifiziert.'
fi
log 'Frontend veröffentlicht. Nicht gesetzte Backend-Hooks bedeuten keine produktive Backend-Bereitschaft.'
