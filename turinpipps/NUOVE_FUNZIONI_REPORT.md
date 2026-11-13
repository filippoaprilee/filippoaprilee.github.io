# TurinPipps — automazione e nuove funzionalità (novembre 2026)

## Le novità pubblicate
- Controllo progressivo disponibilità ClickCase, senza aggirare robots.txt: 404/410 su due controlli per marcare un annuncio potenzialmente non disponibile; altri errori non dimostrano che sia scomparso.
- Report automatici intelligenti: email soltanto per appartamenti nuovi compatibili, ribassi o variazioni rilevanti. Stanze e inserzionisti sconosciuti rimangono da verificare.
- Costo mensile noto = canone + spese periodiche chiaramente dichiarate; importi non dichiarati non vengono inventati.
- TurinPipps Score 2.0 spiegabile; mappa interattiva per annunci con coordinate presenti; comparatore fino a quattro immobili.
- Gestione visite, note, metratura, zona, tipologia e percorso a piedi per singolo account Supabase con RLS.
- Invia report ora: backend Google Apps Script con verifica della sessione dell'account e permessi di invio.

## IMPORTANTE: aggiornare Code.gs
Le modifiche pubblicate su GitHub non vengono copiate automaticamente nell'editor Google Apps Script già creato.
Apri https://github.com/filippoaprilee/filippoaprilee.github.io/blob/filippoaprilee/turinpipps/google-apps-script/Code.gs
e sostituisci TUTTO il codice del file Code.gs nel tuo progetto https://script.google.com/home . Salva, poi esegui runScan per un test.
Le proprietà GITHUB_TOKEN, EMAIL_TO e ALERT_FEEDS rimangono salvate: non è necessario reinserirle.

## Configura il pulsante Invia report ora (una volta sola)
1. In Apps Script, Impostazioni progetto → Proprietà script, oltre alle proprietà esistenti aggiungi:
   - SUPABASE_PUBLISHABLE_KEY = sola chiave PUBBLICA del progetto TurinPipps già in turinpipps/auth-config.js; mai service_role o sb_secret.
   - MANUAL_REPORT_ALLOWED_EMAILS = filippoaprilee@gmail.com (puoi autorizzare altri account con virgole).
2. In Apps Script clicca Esegui il deployment → Nuovo deployment → tipo Applicazione web.
3. Descrizione: TurinPipps report manuale. Esegui come: Me. Chi ha accesso: Chiunque.
   Il codice controlla comunque il token Supabase via HTTPS, la conferma email e l'elenco autorizzati; gli accessi non autorizzati non inviano email.
4. Esegui deployment, autorizza gli scope, e copia solo la URL Web app (https://script.google.com/macros/s/ID_REALE/exec).
5. Apri https://github.com/filippoaprilee/filippoaprilee.github.io/edit/filippoaprilee/turinpipps/report-config.js e modifica soltanto la riga
   window.TURINPIPPS_REPORT_ENDPOINT = "https://script.google.com/macros/s/ID_REALE/exec";
   inserendo la URL reale, non l'esempio. Fai Commit changes. Non inserire password o token nel repository.
6. Dopo il deploy GitHub Pages, accedi con email e password su TurinPipps, apri Fonti e monitoraggio → Invia report ora.
   Si aprirà una scheda di conferma/errori. Il report viene inviato ai destinatari EMAIL_TO; un limite di 3 minuti protegge da doppio invio.
7. Controlla Apps Script → Esecuzioni e la tua casella Gmail per verificare il recapito.
8. Ogni volta che modifichi Code.gs dopo un deployment: Gestisci deployment → Modifica → Nuova versione → Esegui deployment.

Il form invia il JWT di sessione nel corpo della POST HTTPS al SOLO endpoint Script Google configurato e non lo salva su GitHub.
Il servizio è pubblicamente raggiungibile ma l'invio richiede un token Supabase valido e un account approvato.

## Report automatico
runDailyDigest salta le giornate prive di nuovi appartamenti compatibili o variazioni rilevanti di prezzo.
L'invio manuale può essere attivato anche senza novità e impedisce duplicati automatici nella stessa giornata.
Non vengono mai contattati i proprietari automaticamente.

## Email di conferma Supabase
Il template precedente caricava un'immagine esterna che appariva rotta nell'anteprima Supabase.
Il template aggiornato usa un emblema casa in HTML senza risorse esterne: occorre copiarlo NUOVAMENTE
da https://github.com/filippoaprilee/filippoaprilee.github.io/blob/filippoaprilee/turinpipps/supabase-confirmation-email.html
nel pannello Authentication → Emails → Confirm sign up e salvare. L'aggiornamento GitHub non aggiorna da solo i template Supabase.

## Icona PWA
Il file icon.svg è usato come favicon del sito e icona SVG PWA; icon-180.png è l'icona di compatibilità per iPhone.
Se vedi ancora la vecchia icona, ricarica la PWA e reinstalla la scorciatoia, ma non cancellare i dati del browser prima della sincronizzazione dei preferiti.

## Collegamenti
- App: https://filippoaprilee.github.io/turinpipps/
- Apps Script: https://script.google.com/home
- Data: https://github.com/filippoaprilee/filippoaprilee.github.io/blob/filippoaprilee/turinpipps/data/listings.json
- Supabase: https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz
