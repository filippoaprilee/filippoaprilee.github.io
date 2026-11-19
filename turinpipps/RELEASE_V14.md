# TurinPipps 14.0.3 — feedback della beta pubblica

Data: 19 novembre 2026. Progetto GitHub Pages `turinpipps/` e Supabase esistente, senza nuovi servizi a pagamento.

## Problemi segnalati dagli utenti

- Eccesso di testo in grassetto, componenti troppo ravvicinati, poca gerarchia tra prezzo, affidabilità, dettagli e azioni.
- Confronta su iPhone: tabella desktop tagliata lateralmente, righe senza corrispondenza visibile e prima colonna illeggibile in tema scuro.
- Ricerca: informazioni e ripetizioni sovraccariche.
- Necessità di scegliere email e push durante configurazione iniziale, con un canale dedicato alle nuove versioni dell'app.

## Implementazioni effettive

### Confronta

`renderComparison()` in `index.html` crea due presentazioni dei medesimi dati:
- **Mobile (fino a 760 px):** una scheda per immobile, canone dichiarato in cima, poi etichette esplicite di spese note, quartiere, superficie, percorso al Politecnico, inserzionista e disponibilità. Collegamento alla fonte, Salva e Rimuovi sono immediati. Nessuno scorrimento orizzontale.
- **Desktop:** tabella semantica con intestazioni di riga e colonna, colonne leggibili e prima colonna fissata durante lo scorrimento, con colori coerenti in dark/light mode.
- Selezionare una sola casa invita ad aggiungerne una seconda, anziché fingere di fare un confronto.
- Limite di quattro immobili; la CTA viene disabilitata quando raggiunto.
- Dati sconosciuti restano `Da verificare` e non sono interpretati come zero. Nessun vincitore viene dedotto da informazioni mancanti.
- `Confronta` è ora un bottone **visibile nelle schede degli annunci**, non più nascosto dentro `Altre azioni`.

### Cerca e gerarchia

- Font ridimensionati in base al ruolo: H1 essenziale, H2 con peso medio, dati chiave in semibold e descrizioni normali.
- Ridotti i badge ripetitivi, nascosti da visualizzazione principale i contatori del match e di qualità (rimangono nelle informazioni approfondite) e ridotte le note ripetute.
- Canone non presente presentato come informazione mancante, non come prezzo gigante.
- Info essenziali prima dei dettagli, provenienza e verifica disponibili nei pannelli espandibili.
- CTA duplicate ridotte; toast di conferma più piccoli e coerenti con il tema scuro.

### Notifiche di prodotto

Database esistente `turinpipps_profiles` esteso **senza nuove tabelle di profilo**:
- `release_email_enabled`, `release_push_enabled` (false per default);
- `release_email_opted_in_at`, `release_push_opted_in_at` gestiti da trigger server.
- Policy RLS dei profili già esistenti e restrittive mantenute.

Il mailer Edge Function già in uso (versione 11) controlla nel ciclo Cron esistente `release.json` contro la versione effettivamente servita da `sw.js`. In caso di nuova versione:
- solo utenti che hanno scelto il **canale push** e possiedono dispositivi attivi ricevono una voce nell'inbox; il push job esistente la recapita;
- solo utenti con **email verificata** e opzione email attiva ricevono un messaggio Resend;
- il consenso deve precedere la pubblicazione della versione;
- `event_key` unica per user/version e `turinpipps_email_dispatches` `kind=release` impediscono gli invii doppi;
- nessun account è stato abilitato automaticamente; ad oggi la configurazione conserva tutte le preferenze disattivate.
- una versione si pubblica aggiornando sia `release.json` sia il valore `CACHE` del service worker; un commit generico non deve diventare una comunicazione di prodotto.

Nell'account (Profilo) sono presenti opt-in distinti per release email e push, e gestione del dispositivo push nella sezione Notifiche. Nell'ultimo step del wizard, per utenti autenticati, è disponibile la scelta facoltativa. Ai nuovi account che hanno già usato l'app come ospiti compare inoltre un invito discreto una volta, eliminabile e non bloccante.

**iPhone:** Safari supporta notifiche Web Push per app Web aggiunte alla schermata Home, con permesso richiesto direttamente da un gesto. Non è possibile attivare il permesso automaticamente.

### Novità in app

La sezione Notifiche mostra le note pubbliche della versione presente in `release.json`, anche se l'utente non vuole email e push. Un bottone indirizza al Profilo per configurare i consensi.

## Verifiche eseguite

- JS delle pagine e degli script aggiunti controllato sintatticamente.
- Confronto simulato: zero immobili, uno, due, quattro; prezzi sconosciuti, spese note, fonte, proprietario non verificato e opzioni di rimozione.
- Verificate nel DB la presenza dei campi di consenso e la disattivazione dei due canali per gli account preesistenti.
- Edge Function `turinpipps-mailer` deployata ACTIVE e codice remoto confrontato con il repository.
- Versioni HTML, PWA e release manifest confrontate, inclusa invalidazione cache iOS.
- Test di regressione `node --test turinpipps/tests/v14-user-feedback.test.cjs` aggiunti al repository.

## Limiti della verifica

I test di parsing e simulazione non costituiscono una sessione Playwright o Safari reale. Non sono state simulate consegne reali email o push verso utenti consenzienti, perché al momento della verifica nessun account aveva attivato i nuovi canali. Non dichiarare un recapito riuscito finché non esiste un utente di prova consenziente.

## Miglioramenti ancora prioritari

1. Beta test con almeno un utente iPhone e un utente desktop, in chiaro/scuro, screen reader e zoom testo, con screenshot **dopo** il rilascio.
2. Test end-to-end per signup, conferma email, preferenze, Safari iOS installato, push, opt-out, trasferimento preferiti/contatti fra dispositivi.
3. Controllo degli endpoint Resend e push con un **account di test esplicitamente consenziente**, verificando risposta del provider e consegna reale.
4. Strumenti di feedback interni per categoria (grafica, dati falsi, link errato, notifiche, login), senza obbligo di screenshot o dati personali.
5. Monitoraggio dei tassi di email rifiutate e push falliti, e rate limit per eventi rapidi.
6. Manutenzione: progressiva consolidazione degli override CSS storici per evitare conflitti e regressioni.
7. Migliorare la qualità degli annunci estratti e della deduplicazione per non investire in una UI elegante sopra dati poco utili.
8. Sicurezza: la diagnostica Supabase continua a segnalare protezione contro password compromesse disabilitata; valutare attivazione nelle impostazioni Auth.

Nessun cambiamento ai dati personali esistenti, agli annunci e ai ruoli. Le nuove notifiche sono opt-in, e nessun invio è stato effettuato da questa implementazione direttamente verso utenti esistenti.
