# TurinPipps 3.0 · radar, velocità e interfaccia

## Modifiche predisposte su branch di sviluppo

- Navigazione e interfaccia responsive riorganizzate, marchio SVG e icona iPhone aggiornati, logo sempre visibile su sidebar desktop e barra mobile.
- "Radar casa": ricerca estesa Google, Bing, DuckDuckGo; ricerca di **post dei gruppi Facebook pubblicamente indicizzati** da Google, senza login automatico. Le ricerche esterne aprono i rispettivi siti e non importano direttamente annunci nell'archivio.
- Scansione server pianificata ogni 2 ore (invece di 6) nel file Google Apps Script; la nuova funzione raccoglie fino a 20 feed Google Alerts e 8 ricerche pubbliche Bing RSS in parallelo. Disponibilità e prezzo restano da confermare alla fonte. I portali con login, CAPTCHA o divieto di scraping sono rispettati.
- Dati front-end (annunci/diagnostica/report) richiesti in parallelo anziché in sequenza; ridotto ritardo minimo di schermata iniziale da 2500 a 480 ms.
- Classificazione prudenziale: annunci riservati a categorie specifiche di locatari, segnalati come potenzialmente non disponibili o datati oltre 75 giorni non compaiono automaticamente tra i compatibili.
- Onboarding con selezione budget e quartieri; radar utilizzabile come ospite; aggiunta manuale sempre visibile.
- Manifest PWA con scorciatoie a Radar, Salvati e Visite; cache service worker versionata; badge app soltanto sui sistemi che lo supportano.

## Importantissimo: come attivare

Il branch `turinpipps-v3-radar-ux` **non è ancora distribuito** su GitHub Pages. Prima dell'unione con `filippoaprilee`, verificare la nuova UI e l'account Supabase con test desktop e mobile.

**Google Apps Script è una copia separata**: unire il branch di GitHub NON aggiorna automaticamente il progetto Apps Script in esecuzione.

Per abilitare la raccolta:
1. Aprire il progetto Google Apps Script "TurinPipps Agent" già attivo.
2. Copiare l'intero file `turinpipps/google-apps-script/Code.gs` del branch aggiornato nell'editor Apps Script esistente. Conservare le *Script Properties* già configurate (in particolare `GITHUB_TOKEN`, `ALERT_FEEDS`, `EMAIL_TO`) **senza pubblicarle**.
3. Salvare e lanciare **una volta** `installTurinPipps()` per sostituire solo i trigger `runScan` e `runDailyDigest` con quelli nuovi. Autorizzare i permessi necessari e controllare le esecuzioni.
4. Eseguire una scansione manuale `runScan()` e verificare che il registro `turinpipps/data/diagnostics.json` mostri i feed riusciti, gli errori e il numero di link; non assumere un numero minimo di annunci. Se Bing restituisce risultati non XML, disattivare la ricerca Bing con Script Property `ENABLE_BING_RSS=false`.
5. Verificare nell'app annunci, confronto, preferiti, visite, login, logout, report e filtro "solo studentesse" su desktop e Safari iPhone prima del merge.
6. Se il test è superato, unire il PR alla branch pubblicata.

## Limitazioni esplicite

**Facebook:** gli annunci nei gruppi privati, contenuti non indicizzati e Marketplace soggetto a login non possono essere cercati automaticamente senza un accesso autorizzato, né è garantita la visualizzazione dei risultati senza login. Il radar apre ricerche esterne di contenuti Facebook indicizzati, non fa scraping Facebook.

**iPhone:** un sito PWA non può installare veri widget WidgetKit per Home Screen/Lock Screen come un'app iOS nativa. Le scorciatoie del manifest e il badge PWA non sono widget nativi e dipendono dal supporto del sistema. Notifiche push web su PWA aggiunta alla Home richiedono consenso utente e un servizio push lato server, non incluso in questa release.

**Prezzi e disponibilità:** Bing RSS non è una API ufficiale con copertura garantita. Ogni nuovo risultato indicizzato rimane da verificare prima di definirlo compatibile o attualmente disponibile.

**Sicurezza:** GitHub Pages contiene soltanto dati di annuncio pubblici. Account e stato privato restano su Supabase con accesso per utente. Non inserire token GitHub, credenziali mail, Service Role Supabase o password nei file pubblici.

## Checklist di collaudo

- Test sintattico JS di `index.html`, `experience-v3.js`, `Code.gs`.
- Primo accesso ospite, account registrato e utente di ritorno.
- Onboarding personalizza budget/zone e aggiorna correttamente le sezioni.
- Aggiunta annuncio visibile anche con filtri avanzati nascosti.
- Browser Google/Bing/DuckDuckGo/Facebook apre ricerca per zona/termine senza popup impliciti.
- Score e classificazione: affitto solo per studentesse non viene trattato come pienamente compatibile.
- Dati di login, preferiti e note non devono finire nel cache storage pubblico.
- Scansione riuscita visibile nei log Apps Script; nessuna email inviata a proprietari.
- Report manuale conserva la pagina originale e mostra uno stato confermato solo dopo il registro backend.
- Installazione iPhone: manifest, icona, scorciatoie ove supportate, esperienza standalone.
