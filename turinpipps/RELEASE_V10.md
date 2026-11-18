# TurinPipps v10 — rilascio UX, affidabilità e organizzazione
Data: 18 novembre 2026 · Repository: `filippoaprilee/filippoaprilee.github.io` · branch: `filippoaprilee`

## Obiettivo

Rendere TurinPipps una PWA di ricerca casa semplice, leggibile e gratuita, senza riscrivere il progetto né perdere le funzioni già operative.

## Interfaccia

- `experience-v10.js` + `experience-v10.css` costruiscono sopra l'interfaccia consolidata, senza sostituire autenticazione, preferiti, raccolta o notifiche.
- Nuova Home compatta con budget, totale dei riferimenti unici **nel frontend**, scoperte negli ultimi sette giorni, riferimenti con canone compatibile, salvati e prossima azione.
- Nuova navigazione desktop e mobile con Home, Cerca, Mappa, Salvati, Contatti e visite, Confronta, Profilo, Impostazioni, Notifiche e Monitoraggio.
- Ricerca: filtri principali, opzionali per prezzo noto e prime rilevazioni negli ultimi sette giorni; i dati mancanti non comportano più l'esclusione silenziosa dai risultati.
- Le schede separano **match preliminare personale** da **affidabilità delle informazioni**. La presenza di un canone o di un link raggiungibile non garantisce proprietà, disponibilità né contratto.
- Schede con gerarchia visiva: canone e titolo, punteggi esplicativi, indicazione di rischio, sorgente, dettagli verificabili apribili, valutazione privata e costi.
- Mobile: menu breve a cinque destinazioni, card a colonna singola, controlli più grandi e tastiera/contrasto rispettati.
- Il redesign diventa attivo soltanto dopo l'inizializzazione: il vecchio layout rimane come fallback se il modulo v10 non si carica.

## Match

Il match è un punteggio **orientativo** su 100: canone (36), quartiere (22), tipologia (12), percorso a piedi datato e documentato (20), superficie (10). I fattori sconosciuti sono visibili come mancanti, non convertiti in dati reali.

L'affidabilità è un indicatore distinto basato su evidenze disponibili. Non esiste una validazione automatica del titolo di proprietà o della disponibilità.

## Dati privati e costi

Migrazione applicata su Supabase: `turinpipps_v10_private_evaluation_and_costs`.

Sono state **aggiunte colonne**, senza nuove tabelle applicative, a `public.turinpipps_listing_states`:
- `verification_checks jsonb`: 6 controlli personali (locatore, disponibilità, spese, contratto, foto, visita);
- `cost_plan jsonb`: stime private di condominio, utenze, riscaldamento, internet, TARI, deposito in mensilità, altri costi iniziali;
- `reply_received boolean` e `replied_at timestamptz`: gestione risposte.

La RLS per utente e l'associazione `user_id` non sono state allargate. I dati privati non certificano gli annunci pubblici.

Il simulatore calcola un costo mensile **stimato** e il potenziale esborso iniziale; campi non compilati restano sconosciuti, non equivalgono a spese assenti.

## Organizzazione

Il percorso include salvati, contattato/in attesa, **risposta ricevuta**, visite ed esiti. Si mantengono note, sincronizzazione per account, download calendario, confronto e salvataggio già presenti.

## Notifiche pertinenti

Migrazione: `turinpipps_v10_relevant_price_drop_notifications`.
- Trigger di nuove scoperte preesistente mantenuto.
- Nuovo evento prezzo ridotto di almeno 20 €, applicato solo quando il canone è realmente passato da un valore maggiore a uno minore e la fonte soddisfa i criteri prudenti.
- Rispetta `notify_price_drops`, budget e zona del singolo utente; evita doppioni tramite `event_key` univoco.
- `turinpipps-mailer` (Supabase Edge Function v10) invia riepiloghi **programmati** soltanto con corrispondenze nuove o riduzioni documentate nella finestra temporale pertinente. I riepiloghi richiesti manualmente restano completi.
- La consegna di notifiche push dipende comunque dal permesso del dispositivo e dai servizi terzi; non è garantita.

## Monitoraggio

- La dashboard Sviluppatore riceve una sezione riassuntiva sui riferimenti e sulla qualità osservabile senza nuovo endpoint privilegiato.
- I contatori si basano sugli URL effettivamente in archivio, non sulla somma storica dei contatori `discovered`.
- Collector `turinpipps-collector` continua a lavorare con Supabase Cron ogni trenta minuti e mantiene il controllo progressivo del link.
- Nessun nuovo servizio a pagamento, VPS, container o scraping di pagine vietate.

## Validazione

- Sintassi delle librerie JavaScript e degli script inline controllata attraverso la lettura dei file GitHub.
- Verificato il calcolo del match con casi completi, prezzo assente, prezzo fuori budget e percorso non documentato.
- Test ripetibili nel repository: `node --test turinpipps/tests/v10-matching.test.cjs`.
- Un workflow GitHub Actions per questi test è stato provato ma il runner non si è avviato; è stato rimosso per non generare fallimenti continui. I test rimangono eseguibili localmente.
- Supabase ha confermato l'applicazione delle due migrazioni, la presenza delle colonne e l'attività della Edge Function email.

## Verifiche manuali ancora necessarie

1. Desktop e Safari iPhone: aprire Home → Cerca → Salva → Checklist → Stima costi → Contatto → Risposta → Visita → Confronta.
2. Account di prova: verificare che preferenze, checkbox e costi siano sincronizzati dopo logout/login. Non usare account reali per test distruttivi.
3. Verificare notifiche e email con account di prova che abbia dato consenso, evitando di inviare messaggi non richiesti.
4. Verificare test di contrasto, zoom 200%, tastiera, voce assistiva e connettività lenta.
5. Le segnalazioni del Security Advisor su tabelle backend-only sono informative; la protezione password compromesse richiede configurazione del progetto e non è stata attivata.
6. Il servizio browser Playwright rimane distinto dal collector Supabase e richiede un runtime browser esterno reale, attualmente non dichiarato operativo.
7. Gli annunci sono opportunità da verificare. Nella precedente verifica nessun proprietario e nessuna disponibilità risultavano confermati.

**Non confondere un commit GitHub, una build riuscita e un test sintattico con l'esito di una prova manuale end-to-end su iPhone e account reali.**
