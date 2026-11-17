#!/usr/bin/env bash
# Installazione isolata su Ubuntu 22.04+ senza modificare i servizi esistenti.
set -euo pipefail
if [[ "${EUID}" -ne 0 ]]; then echo "Usa sudo bash install.sh"; exit 2; fi
if [[ ! -r /etc/turinpipps/worker.env ]]; then
 cat <<'TEXT'
Prima crea il file root-only /etc/turinpipps/worker.env:
TURINPIPPS_WORKER_TOKEN=<generato con openssl rand -hex 32>
TURINPIPPS_INGEST_URL=https://akgnxjwkrnuckgxscjdz.supabase.co/functions/v1/turinpipps-ingest
Il token deve essere anche un Secret della Edge Function Supabase.
TEXT
 exit 3
fi
if ! grep -q '^TURINPIPPS_WORKER_TOKEN=' /etc/turinpipps/worker.env; then
 echo "Variabile TURINPIPPS_WORKER_TOKEN mancante."; exit 3
fi
id turinpipps >/dev/null 2>&1 || useradd --system --home-dir /var/lib/turinpipps --create-home --shell /usr/sbin/nologin turinpipps
install -d -o turinpipps -g turinpipps -m 0750 /var/lib/turinpipps
install -d -m 0755 /opt
if [[ ! -d /opt/turinpipps/.git ]]; then
 git clone --branch filippoaprilee --single-branch --depth 1 https://github.com/filippoaprilee/filippoaprilee.github.io.git /opt/turinpipps
else
 git -C /opt/turinpipps pull --ff-only
fi
python3 -m venv /opt/turinpipps/venv
/opt/turinpipps/venv/bin/python -m pip install --disable-pip-version-check -r /opt/turinpipps/turinpipps/vps/requirements.txt
PLAYWRIGHT_BROWSERS_PATH=/opt/turinpipps/.playwright /opt/turinpipps/venv/bin/python -m playwright install --with-deps chromium
install -m 0644 /opt/turinpipps/turinpipps/vps/turinpipps-playwright.service /etc/systemd/system/turinpipps-playwright.service
install -m 0644 /opt/turinpipps/turinpipps/vps/turinpipps-playwright.timer /etc/systemd/system/turinpipps-playwright.timer
chmod 600 /etc/turinpipps/worker.env
systemctl daemon-reload
systemctl enable --now turinpipps-playwright.timer
echo "Timer attivo. Per prova reale:"
echo "  sudo systemctl start turinpipps-playwright.service"
echo "  sudo journalctl -u turinpipps-playwright.service -n 100 --no-pager"
echo "  sudo systemctl list-timers turinpipps-playwright.timer --all"
