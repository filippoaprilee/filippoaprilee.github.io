# TurinPipps · ricerca casa a Torino

**App:** https://filippoaprilee.github.io/turinpipps/

## Obiettivo

Ricerca affitti a Torino vicino al Politecnico, appartamenti interi con preferenza inserzionisti privati, budget iniziale 700 €/mese **più spese**, zone Cenisia, Crocetta, San Paolo, Borgo San Paolo, Cit Turin, Santa Rita e Pozzo Strada.

## Stato aggiornato al 17 novembre 2026

| Componente | Architettura | Stato |
| --- | --- | --- |
| Web app PWA | GitHub Pages, autentificazione Supabase | Pubblicata come sorgente; test E2E iOS da completare |
| Ricerche programmate | Supabase Edge Function `turinpipps-collector` + pg_cron | Attive ogni 30 minuti (ultimo controllo documentato 15/15 fonti) |
| Segnalazioni push | Supabase `turinpipps-push` + pg_cron | Backend attivo; richiede consenso e test sul dispositivo |
| Test notifiche | Supabase `turinpipps-push-test` | Invio reale su richiesta account, rate limit 60 secondi |
| Riepiloghi email | Supabase `turinpipps-mailer` + pg_cron | Richiede RESEND_API_KEY e mittente verificato |
| Console sviluppatore | `turinpipps-admin`, controllo server `role=owner` | Riservata al solo utente owner |
| Organizza | `organize-v7.js`, database `turinpipps_listing_states` | Salvati, contatti, visite, decisioni, calendario ICS |
| Installazione iPhone senza altre app | PWA GitHub Pages | Aggiungi a Home da Safari; un widget nativo richiede WidgetKit |
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

## Interfaccia v8

- Home: budget, conteggi separati, ultima scoperta, monitoraggio e scorciatoie.
- Cerca: modalità Per te come impostazione iniziale, categorie verificati/da verificare/tutti, qualità dati e ultimo avvistamento visibili.
- Mappa: sezione autonoma con soli pin da coordinate disponibili e menu dedicato.
- Organizza: salvati, contatti, visite e decisioni senza pulsanti duplicati.
- Navigazione: 5 azioni su iPhone, 3 sezioni gerarchiche su PC, niente Altro sovraccarico.
- Sviluppatore: esclusivo per account verificato filippo@maben.it e ruolo owner, anche lato backend.

## Playwright senza GitHub Actions

Il repository contiene un worker Chromium Playwright per Ubuntu, timer systemd e la Edge Function turinpipps-ingest distribuita.
**Non è ancora attivo sul VPS**: occorre configurare il token segreto condiviso e installare il servizio Ubuntu.
Guida dettagliata: [Playwright Ubuntu](vps/README.md). Il collector Supabase Cron esistente continua separatamente.

## Email da maben.it

Mittente desiderato: TurinPipps <filippo@maben.it>. Verifica maben.it su Resend, mantieni intatti gli MX aziendali e configura le due variabili segrete di Supabase.
Guida: [Setup email](SETUP_EMAIL.md).

## iPhone senza app esterne

La PWA si aggiunge alla schermata Home direttamente con Safari. La pagina [installazione iPhone](widget-iphone.html) spiega i passaggi.
Un widget iOS nativo con aggiornamento autonomo non può essere distribuito da una sola pagina GitHub Pages.
