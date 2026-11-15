# TurinPipps 5 — Architettura operativa

Stato verificato: 15 novembre 2026. Repository: filippoaprilee/filippoaprilee.github.io, branch di pubblicazione filippoaprilee.

## App

- PWA: https://filippoaprilee.github.io/turinpipps/
- iPhone panoramica rapida: /turinpipps/today.html
- Frontend: index.html (logica esistente), experience-v3/v4/v5.js e CSS di supporto.
- Navigazione: Panoramica, Cerca casa (Radar), Preferiti, Confronti, Visite, Notifiche, Profilo, Preferenze; Console sviluppatore visibile solo agli amministratori riconosciuti dal server.
- Auth: Supabase Auth, chiave publishable pubblica; user_id ottenuto da sessione verificata, non da parametri client.

## Dati (unico archivio autorevole)

- public.turinpipps_discovered_listings: elenco pubblico verificato nella forma disponibile; la fonte è SEMPRE da consultare per disponibilità e contratto.
- public.turinpipps_scan_runs: storico controlli e sorgenti.
- public.turinpipps_profiles: un profilo per auth.users, creato da trigger dopo la registrazione; email confermata prima di inviare report.
- public.turinpipps_preferences: preferenze di ricerca individuali.
- public.turinpipps_listing_states e manual_listings: preferiti, note, stati e inserimenti personali.
- public.turinpipps_notification_inbox: centro notifiche per utente.
- public.turinpipps_push_subscriptions e push_deliveries: dispositivi e audit invii.
- public.turinpipps_email_dispatches: log conferme/errori/rate limit dei report.
- public.turinpipps_staff e admin_actions: ruoli controllati dal server e log modifiche.
- GitHub Pages data/listings.json resta un fallback e non deve prevalere sul record Supabase.

La classificazione è tripartita: potenzialmente compatibili, da verificare, esclusi. Lo score di compatibilità non è una garanzia di attendibilità. Sono distinti first_seen, last_seen, published_at, last_verified_at, price_verified_at, expired_at, availability_status, verification_level.

## Automazioni indipendenti da ChatGPT

1. Supabase pg_cron: turinpipps-v3-collector ogni 30 minuti, in funzione.
2. Supabase pg_cron: turinpipps-v5-web-push ogni 10 minuti; consegna solo ai dispositivi iscritti, zero sottoscrizioni al momento dei test.
3. Supabase pg_cron: turinpipps-v5-user-mail ogni ora; invia nella finestra 08:00–10:59 ora di Roma a tutti gli utenti con email verificata e digest attivo, rispettando frequenza giornaliera/settimanale e deduplicazione dei periodi.
4. GitHub Actions turinpipps-collect.yml: Python BeautifulSoup4/Playwright ogni 2 ore **PREVISTO MA NON OPERATIVO**. Le ultime esecuzioni risultano failure senza step avviati. Controllare le impostazioni Actions e la fatturazione runner del repository. Il codice Python non elude login, CAPTCHA o robots.txt.

### Abilitare i riepiloghi email reali

La funzione turinpipps-mailer è pubblicata, ma senza credenziali del provider restituirà esplicitamente errore 503. Impostare i secret Supabase Edge Function RESEND_API_KEY e TURINPIPPS_MAIL_FROM, con dominio/indirizzo mittente verificato presso Resend (o sostituire il driver con provider HTTP equivalente).

Non mettere mai la chiave API nel repository, nel browser, in Google Sheets o in un file statico. Fino a quel momento **non risulta confermato alcun invio automatico ai nuovi utenti**. Gli utenti possono modificare la frequenza e disattivare i riepiloghi dal Profilo.

### iOS Push

- Browser iOS 16.4+; installare TurinPipps sulla schermata Home, aprire da icona e premere «Attiva notifiche sul dispositivo».
- La chiave pubblica VAPID è in push-config.js; la privata è conservata in Supabase Vault con una RPC accessibile solo a service_role.
- Il Service Worker presenta la notifica e apre il Radar o il centro notifiche.
- Il backend turinpipps-push usa Web Push con VAPID; invia solo eventi successivi alla sottoscrizione.
- Non sono ancora stati completati i test end-to-end su dispositivo reale.

### Widget iPhone nativo

Sorgenti SwiftUI + WidgetKit in ios/TurinPipps. **Non ancora compilati, firmati o installati**. Una PWA non può installare autonomamente widget nativi. Il widget sorgente legge solo un archivio pubblico con budget predefinito: richiede ulteriore integrazione account per personalizzazione.

## Amministrazione e sicurezza

- Endpoint turinpipps-admin: richiede access token utente validato dal servizio Auth e ruolo owner/admin nella tabella staff.
- Può consultare utenti, postazioni, report, scansioni, e modificare frequenze/disattivare dispositivi, con audit admin_actions.
- Non concedere ruoli admin da user_metadata. Non pubblicare SUPABASE_SERVICE_ROLE_KEY.
- Tabelle utente con RLS, accesso soltanto per user_id di sessione. RPC VAPID privata revocata a anon/authenticated.
- È ancora consigliata l'attivazione di Supabase Auth leaked password protection.
- Privacy: inserire informativa trasparente sulla periodicità dei report prima della registrazione e consentire opt-out; verificare adempimenti applicabili.

## Test e limiti

- Static JS sintattico, JSON manifest, asset, rotte, classificazione di base: superati durante la revisione.
- RLS policy e cron verificati sul database.
- Mancano test Safari iPhone, flusso email con provider reale, una consegna push con dispositivo iscritto, compilazione Xcode WidgetKit e un run GitHub Python riuscito.
- Nessun lavoro di questa applicazione viene programmato tramite ChatGPT Automations.
