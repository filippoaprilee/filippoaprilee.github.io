# Raccolta pubblica Python (facoltativa)

Il sistema **di produzione** è già automatizzato da Supabase (scansione ogni 30 minuti). Questo script è un collector alternativo a riga di comando per fonti che consentono accesso automatico, utile per diagnosi, ampliamenti autorizzati e test.

```bash
python -m pip install -r tools/requirements.txt
python -m playwright install chromium
python tools/public_collector.py --output annunci_pubblici.json
```

Per leggere **tutte le voci effettivamente contenute nei feed Google Alerts**, inserire gli URL personali in `alerts.txt` locale (uno per riga), quindi:

```bash
python tools/public_collector.py --rss-file alerts.txt --output annunci_pubblici.json
```

Gli URL Google Alerts sono personali e non vanno caricati su GitHub. Lo script **non** cambia le impostazioni Google Alerts («Solo i risultati migliori» va modificato separatamente nell'account) né pubblica automaticamente le schede nel database. Non aggira robots.txt, login, CAPTCHA o limitazioni dei portali. L'output contiene solo URL e metadati pubblici, **non** disponibilità confermate. 
