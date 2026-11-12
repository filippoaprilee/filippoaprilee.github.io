# TurinPipps — modalità automatica senza GitHub Actions

Il runner GitHub dell'account è bloccato per fatturazione. Il messaggio ufficiale è **"The job was not started because your account is locked due to a billing issue"**. Non è un errore di Python, YAML, quota gratuita o permessi `GITHUB_TOKEN`. Vedi https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account.

## La soluzione senza Mac acceso e senza ChatGPT

Il file `Code.gs` in questa cartella contiene un agente autonomo su **Google Apps Script** collegato al tuo account Gmail esistente:
- Controlla fonti pubbliche consentite e legge fino a 20 feed RSS Google Alerts, SENZA acquisire email di avviso in Gmail.
- Ogni 6 ore prova ad aggiornare gli annunci e la diagnostica della web app su GitHub con la REST API.
- Invia direttamente con Gmail una email riepilogativa circa alle ore 19:00 Europe/Rome ai destinatari configurati.
- Non invia messaggi ai proprietari e non accede agli account dei portali.
- Nessun costo di hosting per un uso personale entro le quote Google; le esecuzioni sono soggette a quote, rete, autorizzazioni e disponibilità di Gmail/GitHub.
- L'installazione del trigger richiede una sola autorizzazione iniziale dell'utente.

### Configurazione: una volta sola

1. Apri https://github.com/settings/personal-access-tokens e genera un **fine-grained personal access token**:
   - Resource owner: `filippoaprilee`
   - Repository access: **Only select repositories** → `filippoaprilee.github.io`
   - Repository permissions: **Contents → Read and write** (Metadata → Read è automatico)
   - Scadenza: scegli secondo la tua politica, per esempio 90 giorni o il massimo consentito. **Alla scadenza dovrai rinnovarlo**.
   - Non copiare il token in chat né nei file di TurinPipps.
2. Vai su https://script.google.com/home/projects/create usando `filippoaprilee@gmail.com`, assegna al progetto il nome **TurinPipps Agent**.
3. Apri https://github.com/filippoaprilee/filippoaprilee.github.io/blob/filippoaprilee/turinpipps/google-apps-script/Code.gs e copia tutto il codice in **Editor → Code.gs** (sostituisci il contenuto iniziale), poi **Salva**.
4. In Apps Script apri **Project Settings → Script Properties → Add script property** e crea:
   - `GITHUB_TOKEN` → il token GitHub ristretto a questo repository;
   - `EMAIL_TO` → `filippoaprilee@gmail.com`, oppure più email separate da virgola;
   - `ALERT_FEEDS` → URL dei feed RSS Google Alerts (fino a 20, separati da virgole o nuove righe).
5. Dall'editor seleziona la funzione `installTurinPipps`, premi **Run** e autorizza Gmail, script triggers e richieste HTTPS esterne con il tuo account.
6. Seleziona `sendTestEmail` → **Run**: controlla che la mail di prova sia arrivata.
7. Seleziona `runScan` → **Run**: verifica in **Executions** il risultato, e controlla i file `turinpipps/data/listings.json` e `turinpipps/data/diagnostics.json` nel repository.

Da quel momento i controlli ed email sono pianificati automaticamente *da Google*, non da ChatGPT né dai GitHub-hosted runner. I trigger Apps Script sono approssimativi (non garantiscono il minuto esatto).

**Sicurezza:** il PAT è conservato nelle Script Properties del progetto privato, non nelle pagine pubbliche. Non mettere mai nella web app pubblica PAT, Gmail password, service_role o chiavi segrete. Limita chi può accedere al progetto Apps Script.

## Subito, Immobiliare.it e altre fonti senza spam email

Apri la **[pagina di configurazione interattiva TurinPipps](https://filippoaprilee.github.io/turinpipps/alert-setup.html)**. Contiene 14 ricerche precompilate e pulsanti **Copia ricerca**.

1. Apri https://www.google.com/alerts e incolla una ricerca.
2. Espandi **Mostra opzioni**; imposta **Fonti = Web**, **Lingua = Italiano**, **Regione = Italia**, **Quantità = Tutti i risultati**.
3. In **Invia tramite**, seleziona **Feed RSS**, **NON il tuo indirizzo Gmail**. Premi **Crea avviso**.
4. Dopo la creazione apri l'icona RSS dell'avviso e copia l'URL del feed (inizia con `https://www.google.com/alerts/feeds/`).
5. Ripeti per le ricerche desiderate e inserisci tutti gli URL nella **Script Property `ALERT_FEEDS`** (uno per riga o separati da virgole). In Apps Script esegui `runScan` per una verifica iniziale.

Il sistema esamina feed RSS, li confronta con gli annunci già pubblicati e importa soltanto link direttamente riconosciuti dei portali. Gli annunci con dati non confermati rimangono **Da verificare**. Gli alert NON generano email; l'unica mail programmata è il riepilogo quotidiano TurinPipps.

Google Alerts può perdere contenuti, lavorare con ritardo o non indicizzare annunci accessibili solo tramite login. Non sono presenti account automatici su Subito, Immobiliare.it o Facebook, e non viene aggirato alcun controllo dei portali.

## Per chi vuole usare il Mac al posto di Apps Script

Sono presenti `turinpipps/mac_install.sh` e `turinpipps/mac_agent.sh`: usano `launchd`, Keychain e Git per aggiornare la stessa web app e inviare il digest con SMTP. Il Mac deve restare acceso e con sessione avviata. È una soluzione alternativa a Google Apps Script; **non installarle entrambe** se vuoi evitare invii o aggiornamenti duplicati.

## GitHub billing lock

La documentazione ufficiale GitHub dice che anche un'autorizzazione fallita della carta per un abbonamento o una prova può bloccare Actions su GitHub Free, **pur mostrando quota residua e zero fatturato**.

- Vai a https://github.com/settings/billing → **Payment information** e verifica eventuali carte o autorizzazioni rifiutate.
- Verifica anche **Budgets and alerts** per limiti bloccanti.
- Se la pagina Billing non mostra nessun pagamento o blocco da sanare, contatta https://support.github.com e allega il run `43246222475` e la riga esatta di errore.
- La versione GitHub Actions rimane nel repository; una volta ripristinato l'account potrai riattivare i suoi schedule e disinstallare i trigger Google Apps Script, senza sovrapporli.
