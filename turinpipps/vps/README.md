# TurinPipps Playwright · server Ubuntu, senza GitHub Actions

## Architettura

- **GitHub:** conserva il codice, ospita la PWA. GitHub Pages non esegue Python né Chromium.
- **Supabase Cron:** continua le scansioni già funzionanti ogni 30 minuti, anche se il worker esterno è fermo.
- **Ubuntu con systemd:** esegue `collector_playwright.py` con Playwright Chromium, su pagine pubbliche autorizzate.
- **Edge Function `turinpipps-ingest`:** riceve via HTTPS gli annunci dal worker, autentica con un token server, normalizza, deduplica e conserva i dati già raccolti.

Il codice pronto all'installazione **non implica che il server sia stato raggiunto o che il servizio sia stato attivato**. Per attivarlo occorre una sessione SSH sul computer Ubuntu e un Secret condiviso, generato da te una sola volta.

## Installazione sicura

Utilizza un server Ubuntu 22.04+ su cui puoi usare `sudo`. Se usi un VPS su cui sono installati altri servizi importanti, verifica prima spazio libero, RAM (Chromium richiede memoria disponibile) e backup. Questo installer crea **solo** un account di servizio, `/opt/turinpipps`, `/var/lib/turinpipps`, `/etc/turinpipps` e due unità systemd con nomi `turinpipps-playwright.*`; l'installazione delle dipendenze browser può aggiungere pacchetti di sistema.

### Passaggio 1 — segreto condiviso

Nel terminale SSH:

```bash
openssl rand -hex 32
```

Copia il risultato **solo** nei due luoghi seguenti, senza committarlo e senza inviarlo in chat:

1. [Supabase → Edge Function Secrets](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/settings/functions) → crea `TURINPIPPS_WORKER_TOKEN` con quel valore.
2. Sul VPS:
   ```bash
   sudo install -d -m 0700 /etc/turinpipps
   sudo nano /etc/turinpipps/worker.env
   ```
   Contenuto del file:
   ```dotenv
   TURINPIPPS_WORKER_TOKEN=IL_TUO_TOKEN_PRIVATO
   TURINPIPPS_INGEST_URL=https://akgnxjwkrnuckgxscjdz.supabase.co/functions/v1/turinpipps-ingest
   ```
   Poi:
   ```bash
   sudo chmod 600 /etc/turinpipps/worker.env
   ```

### Passaggio 2 — installa componenti

```bash
sudo apt-get update
sudo apt-get install -y git python3 python3-venv python3-pip ca-certificates
git clone --branch filippoaprilee --single-branch https://github.com/filippoaprilee/filippoaprilee.github.io.git ~/turinpipps-install
less ~/turinpipps-install/turinpipps/vps/install.sh
sudo bash ~/turinpipps-install/turinpipps/vps/install.sh
```

Il programma prepara l'ambiente Python isolato, installa Chromium e registra un timer systemd **ogni due ore**. Non installa Docker né richiede GitHub Actions.

### Passaggio 3 — prova reale e diagnostica

```bash
sudo systemctl start turinpipps-playwright.service
sudo systemctl status turinpipps-playwright.service --no-pager
sudo journalctl -u turinpipps-playwright.service -n 120 --no-pager
sudo systemctl list-timers turinpipps-playwright.timer --all
```

**Prova superata** soltanto quando il log mostra una pagina pubblica renderizzata via Chromium e una risposta di upload Supabase confermata. I nuovi collegamenti compariranno nella tabella `public.turinpipps_discovered_listings` e le esecuzioni in `public.turinpipps_scan_runs`.

### Aggiornamenti futuri

```bash
sudo git -C /opt/turinpipps pull --ff-only
sudo systemctl start turinpipps-playwright.service
```

## Limiti delle fonti

Il worker **rispetta robots.txt** e utilizza solo gli indici pubblici autorizzati di ClickCase. Non bypassa login Facebook, CAPTCHA, blocchi IP o restrizioni tecniche di Subito/Immobiliare. Gli altri portali restano consultabili tramite Google Alerts e ricerca web pubblica, dove consentito. Non promettere che Playwright trovi appartamenti anche quando la fonte non pubblica risultati.

Il token non deve comparire in log, query URL, file GitHub o messaggi. Il server di ingestione rifiuta senza il Secret un upload non autorizzato. Il backend non cancella immobili precedenti in caso di errore del worker.
