# TurinPipps — attivazione automatica senza email di Google Alerts

**Obiettivo:** molte ricerche su Google Alerts, nessuna email singola, raccolta automatica da Apps Script ogni 6 ore, un solo riepilogo TurinPipps alle 19:00 (Europe/Rome). Non serve registrarsi a Subito o Immobiliare.it per ricevere risultati Google indicizzati, ma Google non indicizza tutto e le inserzioni sono sempre da verificare.

## 1 — Crea il token GitHub (solo la prima volta)

Vai su https://github.com/settings/personal-access-tokens/new e compila:
- **Token name:** `TurinPipps Agent`
- **Description:** `Aggiorna solo i dati pubblici degli annunci TurinPipps tramite Google Apps Script`
- **Resource owner:** `filippoaprilee` (già selezionato)
- **Expiration:** 90 giorni, oppure il limite più lungo consentito e compatibile con le tue esigenze. **Quando scade, l'automazione si ferma finché non viene sostituito nelle Script Properties.**
- **Repository access:** seleziona **Only select repositories**, poi soltanto `filippoaprilee.github.io`. Non selezionare *Public repositories*: in quella modalità il token è di sola lettura.
- **Permissions → Repository permissions → Add permissions → Contents:** `Read and write`. Metadata: `Read` automatico. Nessuna permission Account necessaria.
- Premi **Generate token**, copia subito il valore in un luogo privato. Non incollarlo in questa chat, in Gmail o nel repository.

## 2 — Crea un progetto Google Apps Script

1. Apri https://script.google.com/home/projects/create usando `filippoaprilee@gmail.com`.
2. Rinomina il progetto `TurinPipps Agent`.
3. Cancella il codice iniziale `function myFunction() { ... }`.
4. Apri https://github.com/filippoaprilee/filippoaprilee.github.io/blob/filippoaprilee/turinpipps/google-apps-script/Code.gs , clicca sull'icona **Copy raw file**, incolla tutto nell'editor `Code.gs` e salva.
5. Apri **Project Settings** (ingranaggio a sinistra), scorri fino a **Script Properties**, poi **Add script property**. Crea:

| Property | Value |
|---|---|
| `GITHUB_TOKEN` | il token appena generato (segreto) |
| `EMAIL_TO` | `filippoaprilee@gmail.com` (altri destinatari separati da virgola) |
| `ALERT_FEEDS` | gli URL RSS effettivi di Google Alerts, separati da **una nuova riga** (fino a 20) |

6. Salva le proprietà. Non inserire il token nei file pubblici.
7. Nell'editor scegli la funzione `installTurinPipps` dal menu in alto, fai clic su **Run** e autorizza Google Apps Script ad accedere a Gmail, Google Maps, URL Fetch e triggers. È un progetto controllato da te: valuta con attenzione i permessi.
8. Esegui `sendTestEmail`, poi `runScan`; apri **Executions** per verificare eventuali errori. La sola presenza dello script non dimostra che stia funzionando.

## 3 — Crea fino a 20 alert senza messaggi nella posta

Apri https://www.google.com/alerts. Per **ogni** ricerca:
1. Incolla la query dalla tabella sottostante nella casella di ricerca.
2. Apri **Mostra opzioni**.
3. Scegli frequenza **Al massimo una volta al giorno** (oppure **Non appena disponibili** se l'opzione esiste per i feed).
4. Lingua: **italiano**; Regione: **Italia**; Quantità: **Tutti i risultati**.
5. Nel menu **Invia tramite** scegli **Feed RSS** anziché il tuo indirizzo email.
6. Premi **Crea avviso**; sotto **I miei avvisi** apparirà l'icona RSS vicino all'avviso. Aprila e copia l'URL del feed, che inizia con `https://www.google.com/alerts/feeds/`.
7. Ripeti per le altre query. Incolla **tutti gli URL dei feed** nel valore di Script Property `ALERT_FEEDS`, uno per riga, poi salva.
8. Non utilizzare **email** per questi avvisi, così non riceverai notifiche separate. Resterà unicamente l'email giornaliera TurinPipps.

### Le 12 query consigliate

**Subito**
```
site:subito.it/appartamenti/ "Torino" "privato" "affitto"
site:subito.it/appartamenti/ "Torino" "Crocetta" "affitto"
site:subito.it/appartamenti/ "Torino" "Cenisia" "affitto"
site:subito.it/appartamenti/ "Torino" "San Paolo" "affitto"
site:subito.it/appartamenti/ "Torino" "Politecnico" "affitto"
site:subito.it/appartamenti/ "Torino" "bilocale" "privato"
```

**Immobiliare.it**
```
site:immobiliare.it/annunci/ "Torino" "privato" "affitto"
site:immobiliare.it/annunci/ "Torino" "Crocetta" "bilocale"
site:immobiliare.it/annunci/ "Torino" "Cenisia" "affitto"
site:immobiliare.it/annunci/ "Torino" "San Paolo" "affitto"
site:immobiliare.it/annunci/ "Torino" "Politecnico" "privato"
site:immobiliare.it/annunci/ "Torino" "700" "affitto"
```

Le parole **privato**, **700** e **affitto** nei risultati sono solo indizi. L'app considera l'inserzionista e il prezzo **da verificare** finché non sono confermati dalla fonte. Gli alert Google potrebbero includere agenzie, vecchie inserzioni, annunci incompleti o nessun risultato.

## 4 — Comportamento delle automazioni

- **Ogni 6 ore:** legge i feed RSS configurati, acquisisce solo URL riconosciuti di singole inserzioni, legge eventuali pagine pubbliche consentite, mantiene lo storico dei prezzi quando verifica una nuova cifra sulla pagina originale, aggiorna l'archivio GitHub.
- **Circa alle 19:00:** invia **un unico report TurinPipps** al giorno dal tuo Gmail ai destinatari specificati. Google Apps Script non garantisce il minuto esatto.
- **Percorsi a piedi:** Google Apps Script Maps calcola distanze e tempi esclusivamente dove esiste un indirizzo civico verificabile.
- **Duplicati:** la PWA segnala possibili ripetizioni basate su via, quartiere e metratura; la corrispondenza non è certa.
- **Annunci datati:** segnalati per ricontrollo; non sono dichiarati chiusi automaticamente.
- **Nessun messaggio ai proprietari.**

## 5 — Blocchi e risoluzione problemi

- Se Google Apps Script non riesce ad aggiornare i JSON, controlla `GITHUB_TOKEN`, repository selezionato e `Contents: Read and write` e la scadenza del token.
- Se il test Gmail funziona ma non ci sono annunci, controlla `ALERT_FEEDS` e i messaggi in `Executions`. Non promettiamo che gli alert Google trovino ogni annuncio.
- Se GitHub Actions rimane bloccato con `The job was not started because your account is locked due to a billing issue`, il codice non lo può sbloccare. Contatta https://support.github.com con run ID `43246222475`. Dalle schermate è un account GitHub Free, fatturato 0 $, quota inclusa disponibile e nessun metodo di pagamento.
- Non eseguire sia trigger Apps Script sia workflow GitHub programmati per lo stesso digest: se GitHub sblocca Actions, scegli un solo sistema per evitare invii duplicati.

## 6 — Login Google e Apple

La pagina TurinPipps include già **Continua con Google** e **Continua con Apple**. L'utente vede il proprio marchio, i pulsanti e le schermate di autorizzazione dei provider, ma account e sessioni vengono gestiti in sicurezza da Supabase Auth (non da un sistema di password artigianale in GitHub Pages).

**Google OAuth (richiede una configurazione una tantum):**
1. In https://console.cloud.google.com/ crea o seleziona un progetto Google Cloud (la configurazione OAuth per il sito non richiede l'acquisto di un hosting); apri **Google Auth Platform → Branding** e imposta TurinPipps, origine e contatto sviluppatore.
2. In **Clients** crea un **OAuth client ID** di tipo **Web application**.
3. Tra gli **Authorized redirect URIs** inserisci `https://akgnxjwkrnuckgxscjdz.supabase.co/auth/v1/callback`. Tra gli **Authorized JavaScript origins** inserisci `https://filippoaprilee.github.io`.
4. Copia **Client ID** e **Client Secret** (quest'ultimo è privato) in https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/providers → Google, abilita il provider e salva.
5. In https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/url-configuration lascia `https://filippoaprilee.github.io/turinpipps/` come Site URL e Redirect URL consentito. Poi prova **Continua con Google** dall'app.

**Apple OAuth** richiede la configurazione nel programma Apple Developer, con Services ID, chiave e redirect. La configurazione web potrebbe richiedere un'iscrizione Apple Developer a pagamento. Non è stata attivata. Il pulsante non diventerà funzionante senza credenziali valide. Non condividere private key in chat o GitHub.

Per la password tradizionale resta la conferma di Supabase Auth. Con login Google/Apple la verifica dell'identità avviene attraverso il provider e non serve una seconda email di conferma di TurinPipps.


## 7 — Email di conferma in stile TurinPipps

Se vuoi mantenere anche la registrazione con email/password, l'email di verifica non può essere inviata in modo sicuro dal solo browser GitHub Pages: deve essere inviata e verificata da un servizio di autenticazione, che nel progetto resta Supabase Auth. Puoi però sostituire integralmente il **testo, il marchio e il mittente** visibili all'utente:

1. Apri https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/templates .
2. Scegli **Confirm sign up**, inserisci come oggetto `TurinPipps | Conferma il tuo account`.
3. Copia il contenuto di `turinpipps/email-templates/confirm-signup.html` nel template HTML e salva. **Non eliminare `{{ .ConfirmationURL }}`**.
4. Per mostrare un mittente TurinPipps anziché il mittente tecnico Supabase devi anche configurare un servizio SMTP personalizzato in **Authentication → SMTP Settings**, con un indirizzo mittente controllato da te. Non inserire password nel repository pubblico.
5. Il server SMTP predefinito di Supabase è solo per test e può inviare esclusivamente a indirizzi autorizzati; per permettere registrazioni di altri utenti serve SMTP personalizzato. Non disattivare la conferma email per risolvere questo problema.

Il login Google/Apple, quando il provider è effettivamente configurato, usa la verifica del provider e non richiede una seconda mail di conferma. **Apple web OAuth richiede un account Apple Developer e le credenziali appropriate, che possono avere un costo annuo**; non abbiamo attivato né pagato il provider Apple.

## 8 — Verifiche eseguite sul database

Il 12/11/2026 il progetto Supabase `akgnxjwkrnuckgxscjdz` risulta `ACTIVE_HEALTHY`. Sono già presenti `turinpipps_listing_states`, `turinpipps_manual_listings` e `turinpipps_preferences`, tutte con RLS attiva e quattro policy ciascuna. Non rieseguire uno script SQL distruttivo solo per creare le stesse tabelle.

Le funzioni private di gestione dati sono separate per `auth.uid()`. L'event trigger `public.rls_auto_enable()` non è più eseguibile dai ruoli `anon` e `authenticated` dopo la correzione dei privilegi.

## 9 — Novità app

L'app dispone di avvisi per annunci oltre 60 giorni, indizi di duplicati, storico prezzi da osservazioni verificate, misurazione del percorso a piedi dal Politecnico solo dove esiste un indirizzo con civico, login Google e Apple (interfaccia predisposta), icone Font Awesome, iPhone home screen icon e avvio con spinner.

**Importante:** la UI e i file sono pubblicati su GitHub, ma nessun feed RSS Google Alerts è collegato a Script Properties e non sono stati eseguiti i trigger di Apps Script. Il login Google/Apple deve essere configurato nei provider: la presenza dei pulsanti non garantisce l'accesso.
