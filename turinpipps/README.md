# TurinPipps · ricerca casa a Torino

**App:** https://filippoaprilee.github.io/turinpipps/

## Obiettivo

Ricerca affitti a Torino vicino al Politecnico, appartamenti interi con preferenza inserzionisti privati, budget iniziale 700 €/mese **più spese**, zone Cenisia, Crocetta, San Paolo, Borgo San Paolo, Cit Turin, Santa Rita e Pozzo Strada.

## Stato al 16 novembre 2026

| Componente | Architettura | Stato |
| --- | --- | --- |
| Web app PWA | GitHub Pages, autentificazione Supabase | Pubblicata come sorgente; test E2E iOS da completare |
| Ricerche programmate | Supabase Edge Function `turinpipps-collector` + pg_cron | Attive ogni 30 minuti (ultimo controllo documentato 15/15 fonti) |
| Segnalazioni push | Supabase `turinpipps-push` + pg_cron | Backend attivo; richiede consenso e test sul dispositivo |
| Test notifiche | Supabase `turinpipps-push-test` | Invio reale su richiesta account, rate limit 60 secondi |
| Riepiloghi email | Supabase `turinpipps-mailer` + pg_cron | Richiede RESEND_API_KEY e mittente verificato |
| Console sviluppatore | `turinpipps-admin`, controllo server `role=owner` | Riservata al solo utente owner |
| Organizza | `organize-v7.js`, database `turinpipps_listing_states` | Salvati, contatti, visite, decisioni, calendario ICS |
| Widget iPhone senza Xcode | Scriptable + Supabase `turinpipps-widget` | Script disponibile e guida installazione |
| GitHub Actions programmati | Nessuno | Entrambi i workflow legacy **eliminati** |
| Playwright | Codice facoltativo in `collector_playwright.py` | Non in esecuzione sul backend; non serve per le scansioni Supabase |

**Distinzione importante:** il servizio automatico `pages build and deployment` appartiene alla pubblicazione GitHub Pages e rimane distinto dai due runner programmati rimossi. Non lo si deve disattivare se si desidera continuare a pubblicare la web app su GitHub Pages.

## Utilizzo

- **Panoramica:** annunci potenzialmente compatibili, dati incompleti, stato scansioni e azioni principali.
- **Cerca:** annunci e filtri. I motori esterni sono in un pannello separato; eventuali indicizzazioni non dimostrano disponibilità né identità del proprietario.
- **Organizza:** percorso case salvate → contatti → visite → decisioni. I dati dell'account usano Supabase Auth e policy RLS personali.
- **Confronta / Preferiti:** confronto fra immobili e raccolta personale.
- **Notifiche / Profilo:** opzioni email, push, dati account, widget iPhone.
- **Sviluppatore:** esclusivamente ruolo `owner`, verifica JWT e ruolo lato Edge Function.

## Collegamenti utili

- **Widget iPhone senza Xcode:** https://filippoaprilee.github.io/turinpipps/widget-iphone.html
- **Guida email Resend:** [SETUP_EMAIL.md](SETUP_EMAIL.md)
- **Architettura dettagliata:** [ARCHITETTURA_V5.md](ARCHITETTURA_V5.md)
- **Sorgente widget Scriptable:** [ios/scriptable/TurinPipps-Radar.js](ios/scriptable/TurinPipps-Radar.js)
- **Script Python/Playwright facoltativo:** [collector_playwright.py](collector_playwright.py)

## Automazioni: niente GPT, niente runner di raccolta GitHub

Sono operativi tre job Supabase Cron: raccolta annunci ogni 30 minuti, notifiche Web Push ogni 10 minuti e riepiloghi email ogni ora (soggetti alla configurazione del provider).

I portali con blocchi di accesso, CAPTCHA, contenuti privati o divieti robots.txt non vengono aggirati. Il backend acquisisce solo informazioni pubbliche o da fonti autorizzate. Playwright non si esegue automaticamente in Supabase Edge Functions: per usare Chromium occorre un host esterno, non un runner GitHub. La presenza del file Python non equivale a un servizio attivo.

L'invio delle email ai proprietari rimane manuale. Le email automatiche agli utenti registrati sono facoltative e richiedono conferma dell'indirizzo e consenso ai riepiloghi.

## Test

Controlli statici e regressione: `node turinpipps/tests/classification.test.cjs`. I test non sono più lanciati su GitHub Actions, perché l'account GitHub impedisce l'esecuzione dei workflow personalizzati.
