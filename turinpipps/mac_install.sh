#!/bin/bash
# Attiva l'esecuzione automatica locale di CasaRadar ogni 6 ore.
# Richiede macOS con Python3, git e credenziali git autorizzate al push.
set -euo pipefail
BASE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(git -C "$BASE" rev-parse --show-toplevel)"
[ "$(git -C "$ROOT" branch --show-current)" = "filippoaprilee" ] || { echo "Branch Git sbagliato"; exit 1; }
# Evita di creare un task che non puo' pubblicare sul repository.
if ! GIT_TERMINAL_PROMPT=0 git -C "$ROOT" push --dry-run origin HEAD:filippoaprilee >/dev/null 2>&1; then
  echo "Git sul Mac non e' ancora autorizzato a scrivere su GitHub." >&2
  echo "Accedi al tuo account GitHub con GitHub Desktop o gh auth login, poi riesegui l'installazione." >&2
  exit 1
fi
PLIST="$HOME/Library/LaunchAgents/it.casaradar.torino.scan.plist"
LOGS="$HOME/Library/Logs/CasaRadar"
mkdir -p "$HOME/Library/LaunchAgents" "$LOGS"
python3 - "$PLIST" "$BASE/mac_update.sh" "$LOGS" "$ROOT" <<'PY'
import plistlib,sys
path,script,logs,root=sys.argv[1:]
values={"Label":"it.casaradar.torino.scan",
"ProgramArguments":["/bin/bash",script],
"WorkingDirectory":root,
"RunAtLoad":True,
"StartInterval":21600,
"StandardOutPath":logs+"/scan.log",
"StandardErrorPath":logs+"/error.log",
"ProcessType":"Background"}
with open(path,"wb") as f:plistlib.dump(values,f)
PY
/bin/launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
/bin/launchctl bootstrap "gui/$(id -u)" "$PLIST"
/bin/launchctl enable "gui/$(id -u)/it.casaradar.torino.scan"
echo "CasaRadar installato. Frequenza: ogni 6 ore quando il Mac e' acceso e l'utente ha effettuato l'accesso."
echo "Log: $LOGS/scan.log e $LOGS/error.log"
echo "Per testare subito: bash '$BASE/mac_update.sh'"
echo "Per configurare gli avvisi e Telegram: bash '$BASE/mac_setup_integrations.sh'"
