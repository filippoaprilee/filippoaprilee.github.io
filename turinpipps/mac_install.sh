#!/bin/bash
# Install two free LaunchAgents. This only runs while the Mac is on & signed in.
set -euo pipefail
BASE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(git -C "$BASE" rev-parse --show-toplevel)"
[ "$(git -C "$ROOT" branch --show-current)" = "filippoaprilee" ] || { echo "Serve il branch filippoaprilee" >&2; exit 1; }
CFGDIR="$HOME/Library/Application Support/TurinPipps"
CFG="$CFGDIR/config.env"
LOGS="$HOME/Library/Logs/TurinPipps"
mkdir -p "$CFGDIR" "$LOGS" "$HOME/Library/LaunchAgents"
chmod 700 "$CFGDIR"
umask 077
echo "TurinPipps: configurazione dell'automazione Mac."
echo "Useremo una password per app Gmail, salvata SOLO nel Portachiavi macOS."
read -r -p "Email Gmail mittente/IMAP [filippoaprilee@gmail.com]: " EMAIL
EMAIL="${EMAIL:-filippoaprilee@gmail.com}"
read -r -p "Destinatari report (email separate da virgola) [$EMAIL]: " RECIPIENTS
RECIPIENTS="${RECIPIENTS:-$EMAIL}"
read -r -s -p "Password PER APP Gmail (non la password principale): " APPPASS
echo
[ -n "$APPPASS" ] || { echo "Password per app non fornita" >&2; exit 1; }
/usr/bin/security add-generic-password -U -a "$EMAIL" -s turinpipps-gmail -w "$APPPASS" >/dev/null
unset APPPASS
python3 - "$CFG" "$EMAIL" "$RECIPIENTS" <<'PY'
import shlex,sys,os
path,email,recipients=sys.argv[1:]
with open(path,"w",encoding="utf-8") as f:
  f.write("TURINPIPPS_SMTP_HOST=smtp.gmail.com\n")
  f.write("TURINPIPPS_SMTP_PORT=465\n")
  f.write("TURINPIPPS_IMAP_HOST=imap.gmail.com\n")
  f.write("TURINPIPPS_IMAP_PORT=993\n")
  f.write("TURINPIPPS_SMTP_USER="+shlex.quote(email)+"\n")
  f.write("TURINPIPPS_EMAIL_TO="+shlex.quote(recipients)+"\n")
os.chmod(path,0o600)
PY
if ! GIT_TERMINAL_PROMPT=0 git -C "$ROOT" push --dry-run origin HEAD:filippoaprilee >/dev/null 2>&1; then
  echo "Impossibile verificare i permessi Git push. Autorizza GitHub sul Mac e riesegui lo script." >&2
  exit 1
fi
python3 - "$BASE/mac_agent.sh" "$ROOT" "$LOGS" "$HOME/Library/LaunchAgents" <<'PY'
import os,plistlib,sys
script,root,logs,dest=sys.argv[1:]
for name,arg,schedule in [
  ("it.turinpipps.scan","scan",{"StartInterval":21600}),
  ("it.turinpipps.report","report",{"StartCalendarInterval":{"Hour":19,"Minute":0}})]:
  data={"Label":name,"ProgramArguments":["/bin/bash",script,arg],
        "WorkingDirectory":root,"RunAtLoad":arg=="scan",
        "StandardOutPath":logs+"/"+arg+".log",
        "StandardErrorPath":logs+"/"+arg+"-error.log",**schedule}
  path=os.path.join(dest,name+".plist")
  with open(path,"wb") as f:plistlib.dump(data,f)
PY
UID="$(id -u)"
for name in it.turinpipps.scan it.turinpipps.report; do
  P="$HOME/Library/LaunchAgents/$name.plist"
  /bin/launchctl bootout "gui/$UID" "$P" >/dev/null 2>&1 || true
  /bin/launchctl bootstrap "gui/$UID" "$P"
done
echo "Avviati: ricerca ogni 6 ore; report ogni giorno alle 19:00 Europe/Rome."
echo "Log: $LOGS; il Mac deve essere acceso con accesso utente effettuato."
