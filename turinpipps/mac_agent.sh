#!/bin/bash
# TurinPipps unattended runner for macOS: no Docker, cloud tunnel, or ChatGPT.
set -euo pipefail
BASE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(git -C "$BASE" rev-parse --show-toplevel)"
MODE="${1:-scan}"
[ "$MODE" = scan ] || [ "$MODE" = report ] || { echo "Usage: mac_agent.sh scan|report"; exit 2; }
[ "$(git -C "$ROOT" branch --show-current)" = filippoaprilee ] || { echo "Branch Git non corretto" >&2; exit 1; }
ORIGIN="$(git -C "$ROOT" remote get-url origin)"
case "$ORIGIN" in
  https://github.com/filippoaprilee/filippoaprilee.github.io|https://github.com/filippoaprilee/filippoaprilee.github.io.git|git@github.com:filippoaprilee/filippoaprilee.github.io.git) ;;
  *) echo "Remote GitHub non autorizzato: $ORIGIN" >&2; exit 1 ;;
esac
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export GIT_TERMINAL_PROMPT=0
CFG="$HOME/Library/Application Support/TurinPipps/config.env"
[ -f "$CFG" ] && { set -a; . "$CFG"; set +a; }
if [ -n "${TURINPIPPS_SMTP_USER:-}" ]; then
  MAILPASS="$(/usr/bin/security find-generic-password -s "turinpipps-gmail" -a "$TURINPIPPS_SMTP_USER" -w 2>/dev/null || true)"
  [ -n "$MAILPASS" ] && export TURINPIPPS_SMTP_PASSWORD="$MAILPASS" TURINPIPPS_IMAP_PASSWORD="$MAILPASS"
  unset MAILPASS
  export TURINPIPPS_IMAP_USER="$TURINPIPPS_SMTP_USER"
fi
cd "$ROOT"
git pull --ff-only --quiet origin filippoaprilee
if [ "$MODE" = scan ]; then
  python3 "$BASE/collector.py"
  python3 "$BASE/alerts_ingest.py"
  git add -- turinpipps/data/listings.json turinpipps/data/diagnostics.json
else
  if [ -z "${TURINPIPPS_SMTP_PASSWORD:-}" ] || [ -z "${TURINPIPPS_EMAIL_TO:-}" ]; then
    echo "Gmail per report non configurato: esegui mac_install.sh" >&2; exit 3
  fi
  python3 "$BASE/email_report.py"
  [ ! -f "$BASE/data/report_status.json" ] || git add -- turinpipps/data/report_status.json
fi
if ! git diff --cached --quiet; then
  git -c user.name="TurinPipps Mac" -c user.email="turinpipps@users.noreply.github.com" commit -qm "TurinPipps: update from local scheduler"
  git push origin HEAD:filippoaprilee
  echo "TurinPipps $MODE: aggiornamento pubblicato"
else
  echo "TurinPipps $MODE: nessuna variazione"
fi
