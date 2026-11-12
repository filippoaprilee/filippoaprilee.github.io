#!/bin/bash
# Fallback gratuito: esegui da macOS, senza Docker/Cloudflare/Tailscale.
# Pubblica solo torino-casa/data/*.json, mai credenziali.
set -euo pipefail
BASE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(git -C "$BASE" rev-parse --show-toplevel)"
BRANCH="$(git -C "$ROOT" branch --show-current)"
if [ "$BRANCH" != "filippoaprilee" ]; then
  echo "ERRORE: usare il branch filippoaprilee (branch attuale: $BRANCH)" >&2; exit 1
fi
REMOTE="$(git -C "$ROOT" remote get-url origin)"
case "$REMOTE" in
  https://github.com/filippoaprilee/filippoaprilee.github.io|https://github.com/filippoaprilee/filippoaprilee.github.io.git|git@github.com:filippoaprilee/filippoaprilee.github.io.git) ;;
  *) echo "ERRORE: repository remoto inatteso: $REMOTE" >&2; exit 1;;
esac
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export GIT_TERMINAL_PROMPT=0
CFG="$HOME/Library/Application Support/CasaRadar/config.env"
if [ -f "$CFG" ]; then
  set -a
  . "$CFG"
  set +a
fi
if [ -n "${CASARADAR_IMAP_USER:-}" ]; then
  PASS="$(/usr/bin/security find-generic-password -a "$CASARADAR_IMAP_USER" -s "casaradar-imap" -w 2>/dev/null || true)"
  if [ -n "$PASS" ]; then export CASARADAR_IMAP_PASSWORD="$PASS"; fi
  unset PASS
fi
if [ -n "${CASARADAR_TELEGRAM_CHAT_ID:-}" ]; then
  TOKEN="$(/usr/bin/security find-generic-password -a "$CASARADAR_TELEGRAM_CHAT_ID" -s "casaradar-telegram" -w 2>/dev/null || true)"
  if [ -n "$TOKEN" ]; then export CASARADAR_TELEGRAM_TOKEN="$TOKEN"; fi
  unset TOKEN
fi
cd "$ROOT"
git pull --ff-only --quiet origin filippoaprilee
python3 "$BASE/collector.py"
python3 "$BASE/alerts_ingest.py"
python3 "$BASE/notify_telegram.py"
git add -- torino-casa/data/listings.json torino-casa/data/diagnostics.json
if [ -f "$BASE/data/notified.json" ]; then git add -- torino-casa/data/notified.json; fi
if ! git diff --cached --quiet; then
  git -c user.name="CasaRadar Mac Agent" -c user.email="casaradar@users.noreply.github.com" commit -qm "CasaRadar: aggiornamento automatico dal Mac"
  git push origin filippoaprilee
  echo "CasaRadar: dati aggiornati online"
else
  echo "CasaRadar: nessuna modifica ai dati"
fi
