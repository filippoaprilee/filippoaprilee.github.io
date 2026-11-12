# TurinPipps · ricerca affitti Torino

App: https://filippoaprilee.github.io/turinpipps/

**Obiettivo:** affitti da privati a Torino vicino al Politecnico (Crocetta, Cenisia, San Paolo, Borgo San Paolo, Cit Turin, Santa Rita, Pozzo Strada), massimo 700 €/mese di canone esclusi gli oneri.

## Stato verificato (12/11/2026)

| Componente | Stato |
| --- | --- |
| GitHub Pages + PWA iPhone | Pubblicata |
| Archivio pubblicato | 14 schede ereditate, da riconfermare con i proprietari |
| GitHub Actions: raccolta | Workflow pronto, runner bloccato PRIMA degli step |
| Subito e Immobiliare: avvisi | Codice IMAP pronto, ricerca email/secret da configurare |
| GitHub Actions: report SMTP | Workflow pronto, runner bloccato e SMTP secret assenti |
| Utenti e preferiti individuali | Codice Supabase e SQL RLS pronti, progetto da collegare |
| Messaggi ai proprietari | Nessun invio automatico implementato |

Le due automazioni ChatGPT preesistenti sono state disattivate. Nessun report verrà più generato o inviato da GPT.

## 1. Sbloccare il runner GitHub Actions

Anche il job minimale che stampa un semplice echo fallisce prima del primo step:
https://github.com/filippoaprilee/filippoaprilee.github.io/actions/runs/43190082048

Le prime esecuzioni TurinPipps fallite:
- https://github.com/filippoaprilee/filippoaprilee.github.io/actions/runs/43235025880
- https://github.com/filippoaprilee/filippoaprilee.github.io/actions/runs/43235120066

Controlla impostazioni personali GitHub -> Billing and licensing -> Overview, Usage, Budgets and alerts; poi Repository -> Settings -> Actions -> General. Se è tutto regolare e il runner non viene ancora assegnato, apri un ticket https://support.github.com/ allegando i link. Il problema di permessi o fatturazione dell'account NON si risolve modificando il workflow. Al momento non è conosciuta la causa precisa.

## 2. Configurare email automatiche GitHub

Apri https://github.com/filippoaprilee/filippoaprilee.github.io/settings/secrets/actions e aggiungi i tre **Repository secrets**:

- TURINPIPPS_EMAIL_TO: filippoaprilee@gmail.com (o più indirizzi separati da virgole, fino a 20).
- TURINPIPPS_SMTP_USER: indirizzo della casella autorizzata a inviare.
- TURINPIPPS_SMTP_PASSWORD: password per app SMTP o altra credenziale autorizzata.

Facoltativamente nelle **Repository variables**:
- TURINPIPPS_SMTP_HOST: smtp.gmail.com (predefinito).
- TURINPIPPS_SMTP_PORT: 465 (SSL; alternativa 587 STARTTLS).

Il workflow è in .github/workflows/turinpipps-report.yml.
La programmazione include i cambi d'ora legale e controlla le **19:00 Europe/Rome**. Ogni destinatario riceve una email individuale senza vedere gli altri. Lo stato dell'ultimo report realmente inviato è conservato in turinpipps/data/report_status.json senza email o password. Non vengono inviati messaggi ai proprietari.

**Non incollare password o token nel repository, nelle issue o nelle chat.** Gmail richiede in genere una password per app con verifica in due passaggi, se disponibile sul tuo account.

## 3. Acquisire Subito e Immobiliare.it automaticamente

Per rispettare le regole dei siti, l'app **non effettua scraping diretto non autorizzato** dei loro annunci. Legge invece gli avvisi ufficiali che i portali inviano via email.

1. Accedi a Subito, cerca appartamenti in affitto a Torino, filtra “da privati” e massimo 700 €, limita i quartieri, quindi usa **Salva ricerca / Avvisami via email**.
2. Accedi a Immobiliare.it, imposta la ricerca con i quartieri, canone massimo e altri filtri, poi fai **Salva ricerca** e abilita email di notifica.
3. Puoi aggiungere altre ricerche ufficiali (Idealista, Casa.it) sulla stessa casella.
4. Apri i Repository secrets GitHub e aggiungi:
   - TURINPIPPS_IMAP_HOST = imap.gmail.com (se casella Gmail)
   - TURINPIPPS_IMAP_USER = email che riceve gli avvisi
   - TURINPIPPS_IMAP_PASSWORD = password per app IMAP autorizzata

Il workflow di raccolta è in .github/workflows/turinpipps-collect.yml: 05:12, 11:12, 17:12 e 23:12 UTC. Il modulo turinpipps/alerts_ingest.py legge via IMAP in sola lettura fino agli ultimi 120 messaggi e importa i link immobiliari diretti. Gli avvisi con proprietario, zona o canone non verificati vanno nella lista “Da verificare”, non nella lista compatibili. L'app non manda messaggi ai proprietari.

## 4. Account e preferiti personali gratuiti

GitHub Pages è un sito statico. Non ha un backend sicuro per gestire registrazione, password e dati utente individuali. TurinPipps utilizza Supabase Auth con Postgres e regole RLS per dati isolati per utente.

1. Crea un progetto **Free** in https://supabase.com/dashboard.
2. In **SQL Editor** esegui il file turinpipps/supabase_schema.sql.
3. In **Authentication -> Providers** abilita Email con conferma email.
4. In **Authentication -> URL Configuration** inserisci come Site URL e Redirect URL consentito: https://filippoaprilee.github.io/turinpipps/
5. Recupera il Project URL e la sola publishable/anon key.
6. Modifica turinpipps/auth-config.js con i due valori pubblici.

NON inserire mai chiavi service_role, segreti o password nei file GitHub pubblici. La registrazione, la sincronizzazione di preferiti/note e il recupero password funzioneranno solo dopo questi collegamenti. Senza Supabase, l'app rimane utilizzabile in modalità ospite con salvataggio locale sul dispositivo.

Supabase ha piano gratuito con quote, e può sospendere progetti Free dopo periodi di inattività.

## 5. PWA iPhone

In Safari apri https://filippoaprilee.github.io/turinpipps/ -> Condividi -> Aggiungi alla schermata Home. La web app include splash screen, spinner, icone Font Awesome, paginazione, CSV, preferiti, note e cache offline degli annunci pubblici. Non è un'app nativa dell'App Store.

## Prossimi miglioramenti

- Calcolo distanza reale dal Politecnico solo su indirizzi o coordinate verificati.
- Storico dei canoni quando le fonti riportano variazioni attendibili.
- Totale mensile canone + spese note, con indicazione del deposito.
- Cronologia esiti delle fonti e verifica annunci scaduti.
- Filtro disponibilità, contratto e numero stanze, e digest settimanale.
