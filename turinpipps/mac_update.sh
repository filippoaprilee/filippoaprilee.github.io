#!/bin/bash
# Fallback gratuito: esegui da macOS, senza Docker/Cloudflare/Tailscale.
# Pubblica solo turinpipps/data/*.json, mai credenziali.
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
CFG="$HOME/Library/Application Support/TurinPipps/config.env"
if [ -f "$CFG" ]; then
  set -a
  . "$CFG"
  set +a
fi
if [ -n "${TURINPIPPS_IMAP_USER:-}" ]; then
  PASS="$(/usr/bin/security find-generic-password -a "$TURINPIPPS_IMAP_USER" -s "turinpipps-imap" -w 2>/dev/null || true)"
  if [ -n "$PASS" ]; then export TURINPIPPS_IMAP_PASSWORD="$PASS"; fi
  unset PASS
fi
if [ -n "${TURINPIPPS_TELEGRAM_CHAT_ID:-}" ]; then
  TOKEN="$(/usr/bin/security find-generic-password -a "$TURINPIPPS_TELEGRAM_CHAT_ID" -s "turinpipps-telegram" -w 2>/dev/null || true)"
  if [ -n "$TOKEN" ]; then export TURINPIPPS_TELEGRAM_TOKEN="$TOKEN"; fi
  unset TOKEN
fi
cd "$ROOT"
git pull --ff-only --quiet origin filippoaprilee
python3 "$BASE/collector.py"
python3 "$BASE/alerts_ingest.py"
python3 "$BASE/notify_telegram.py"
git add -- turinpipps/data/listings.json turinpipps/data/diagnostics.json
if [ -f "$BASE/data/notified.json" ]; then git add -- turinpipps/data/notified.json; fi
if ! git diff --cached --quiet; then
  git -c user.name="TurinPipps Mac Agent" -c user.email="turinpipps@users.noreply.github.com" commit -qm "TurinPipps: aggiornamento automatico dal Mac"
  git push origin filippoaprilee
  echo "TurinPipps: dati aggiornati online"
else
  echo "TurinPipps: nessuna modifica ai dati"
fi
