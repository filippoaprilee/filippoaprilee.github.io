# TurinPipps — guida attivazione (12 novembre 2026)

## 0. Stato verificato
- L'interfaccia PWA è su https://filippoaprilee.github.io/turinpipps/.
- Le fonti pubbliche gestite dal collector e la lettura degli avvisi sono predisposte su GitHub Actions, **ma il runner non parte** (fallisce prima degli step). Anche un workflow composto soltanto da `echo` presenta lo stesso problema.
- Il sito GitHub Pages si pubblica correttamente, ma Pages e Actions utilizzano job diversi.
- Non inserire mai password, service_role, token o chiavi amministrative nei file pubblici.

## 1. Solo TRE repository secret per Gmail (SMTP + IMAP)
Account Gmail destinatario iniziale e mittente suggerito: `filippoaprilee@gmail.com`.
1. Visita https://myaccount.google.com/security e attiva **Verifica in due passaggi**, se non è già attiva.
2. Apri https://myaccount.google.com/apppasswords, accedi e crea la password per l'app chiamata `TurinPipps GitHub`. Se il menu non appare, potrebbe non essere disponibile per il tipo di account o per Advanced Protection. Non utilizzare la password normale di Google.
3. Apri https://github.com/filippoaprilee/filippoaprilee.github.io/settings/secrets/actions, scheda **Secrets**, sezione **Repository secrets** e fai clic su **New repository secret**.
4. Crea esattamente:

| Nome secret | Valore da inserire |
| --- | --- |
| `TURINPIPPS_EMAIL_TO` | `filippoaprilee@gmail.com` oppure più email separate da virgole, fino a 20 |
| `TURINPIPPS_SMTP_USER` | `filippoaprilee@gmail.com` |
| `TURINPIPPS_SMTP_PASSWORD` | la password per app appena creata in Google (16 caratteri, **non** la password principale) |

Per ognuno fai clic su **Add secret**. Lo stesso accesso Gmail viene riutilizzato per leggere gli avvisi IMAP. Non servono altri tre secret IMAP se i messaggi vengono ricevuti nella stessa casella.

Le impostazioni predefinite sono SMTP `smtp.gmail.com:465` SSL e IMAP `imap.gmail.com:993` SSL. Se usi un altro provider, servono variabili e credenziali coerenti con quel provider.

Il report è programmato alle **19:00 Europe/Rome**; per più indirizzi viene mandato un messaggio separato a ciascuno. GitHub Actions deve funzionare e la casella SMTP deve essere autorizzata. Non vengono inviate email ai proprietari.

## 2. Abilitazione runner GitHub
1. Apri https://github.com/filippoaprilee/filippoaprilee.github.io/settings/actions e lascia **Allow all actions and reusable workflows**.
2. Puoi lasciare **Read repository contents and packages permissions** come impostazione predefinita: gli YAML TurinPipps chiedono esplicitamente `permissions: contents: write`, che è più mirato.
3. Dalle schermate di Billing inviate risultano quote gratuite Actions ancora disponibili, ma questo non prova che non esistano altri blocchi di esecuzione.
4. Apri il workflow di test https://github.com/filippoaprilee/filippoaprilee.github.io/actions/runs/43190082048 e controlla il rerun. Se ancora fallisce con **0 step** e runner non assegnato, contatta https://support.github.com allegando ID job e screenshot. Un workflow non può correggere da solo l'accesso ai runner dell'account.
5. Quando il test minimo è verde, apri https://github.com/filippoaprilee/filippoaprilee.github.io/actions e avvia manualmente **TurinPipps - raccolta annunci** e **TurinPipps - report email giornaliero** con **Run workflow** per verificare i log. Il report non invia fuori dalla finestra delle 19:00 a meno di usare i flag di test via codice.

## 3. Annunci di Subito e Immobiliare.it
La versione gratuita **non** entra automaticamente negli account dei portali e non aggira divieti di scraping. L'acquisizione tramite avvisi ufficiali è automatica *dopo* una configurazione iniziale di una o più ricerche salvate. È necessario che i portali inviino le notifiche alla casella IMAP collegata.
1. In Subito salva una ricerca di appartamenti in affitto a Torino con filtro privati, massimo 700 € e quartieri appropriati, e abilita gli avvisi.
2. In Immobiliare.it salva la ricerca con gli stessi vincoli e abilita le notifiche email; verifica singolarmente l'identità di privato quando il portale la indica.
3. Puoi aggiungere Idealista/Casa.it dove consentono gli avvisi. Da quel momento il workflow GitHub, quando operativo, leggerà periodicamente la casella **in sola lettura**.
4. Tutti gli annunci con privato, prezzo o zona non verificati restano in **Da verificare**. Gli annunci non vengono trasformati arbitrariamente in privati.
**Non esiste nel progetto un sistema che crei automaticamente account e ricerche salvate su portali di terzi senza autenticazione/autorizzazione.**

## 4. Account Supabase: progetto già esistente
Il progetto che hai aperto si chiama **TurinPipps**, ID `akgnxjwkrnuckgxscjdz`. Il public Project URL è già compilato in `turinpipps/auth-config.js`.
1. Apri https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/sql, premi **New query**, incolla il contenuto di https://github.com/filippoaprilee/filippoaprilee.github.io/blob/filippoaprilee/turinpipps/supabase_schema.sql e fai **Run**. Questo crea tre tabelle con RLS per isolamento dei dati per utente.
2. In https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/providers assicurati che Email sia abilitato, con **Confirm email** attivo.
3. In https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/url-configuration inserisci:
   - **Site URL:** `https://filippoaprilee.github.io/turinpipps/`
   - **Redirect URLs:** aggiungi esattamente `https://filippoaprilee.github.io/turinpipps/` e salva.
4. Vai in https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/settings/api-keys e copia **solo** la publishable key (`sb_publishable_...`) o la legacy anon key se necessaria.
5. Apri https://github.com/filippoaprilee/filippoaprilee.github.io/edit/filippoaprilee/turinpipps/auth-config.js, inseriscila come valore stringa di `publishableKey`, e premi **Commit changes**. Non aggiungere service_role, secret key o password.
6. Attendi la pubblicazione su GitHub Pages. Apri l'app in una finestra privata e prova **Crea account**; conferma la mail e accedi. I dati di un account non devono essere visibili da un altro account.

## 5. Nuovo avvio PWA
- Splash professionale con spinner animato, preparazione effettiva dei dati e controllo sessione Supabase, durata minima circa 2,5 secondi e fallback se l'autenticazione non risponde.
- Alla prima visita (quando Supabase è configurato) propone **Crea account**, **Accedi**, o **Continua come ospite**.
- Dopo il login, `persistSession:true` e `autoRefreshToken:true` mantengono la sessione quando possibile; Supabase può richiedere nuovo accesso se la sessione viene revocata o scade.
- Preferiti, note, stato contattato e preferenze vengono sincronizzati solo dopo che lo schema e la publishable key sono configurati.

## 6. Test operativi richiesti
Prima di dichiarare completato: runner `echo` riuscito, workflow raccolta completato, workflow report SMTP completato, mail arrivata, SQL e RLS applicati, registrazione + conferma funzionanti e test tra due account separati.