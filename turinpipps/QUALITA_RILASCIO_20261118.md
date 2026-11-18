# TurinPipps — controllo rilascio e qualità dei dati (18/11/2026)

## In produzione / nel repository
- App su GitHub Pages, directory `turinpipps/` (branch `filippoaprilee`).
- Interfaccia V9 aggiuntiva con valutazione dei dati, controlli link, cronologia, feedback sui duplicati, privacy account e collegamenti a informazioni/assistenza.
- Supabase: migrazioni `turinpipps_v9_link_health_and_audit`, `turinpipps_v9_audit_trigger_fix`, `turinpipps_v9_privacy_limits_and_account_erase`.
- Edge Functions: `turinpipps-collector` versione 15 e `turinpipps-privacy` versione 1.
- Collector attivato da Supabase Cron ogni 30 minuti, con massimo quattro URL controllati a ogni ciclo; controlli di disponibilità **non equivalenti** alla disponibilità dell'abitazione.
- Lo storico inizia dal rilascio dei trigger; non ricostruisce modifiche mai osservate.

## Campione di verifica manuale
Il 18/11/2026 è stato tentato il controllo di dieci URL originari di Bakeca e Immobiliare.it; cinque hanno restituito contenuti sufficienti per documentare canone, eventuali spese e data fonte. Cinque link hanno dato errori 404/410 o risultati inconcludenti per il sistema di lettura: è necessario ricontrollarli con browser reale prima di classificare l'immobile come rimosso.

Record con evidenza fonte confermata:
1. Bakeca, bilocale Cenisia: €470; 45 m²; pubblicato il 12/11; disponibilità futura dichiarata, non confermata.
2. Bakeca, Corso Racconigi: €475; 53 m²; pubblicato il 21/10; disponibilità da gennaio dichiarata.
3. Bakeca, bilocale studenti Borgo San Paolo: €490; 40 m²; pubblicato il 17/10; riscaldamento e bollette a parte.
4. Bakeca, Pozzo Strada: €600; 60 m²; pubblicato il 04/11.
5. Immobiliare.it, via del Cantalupo 28: €700; 35 m²; €50/mese di condominio dichiarati; aggiornato il 05/09.

Per tutte e cinque, `private_status=source` e `verification_level=source_documented`. L'etichetta «Privato» della fonte non costituisce conferma del diritto a concedere l'immobile in locazione. Disponibilità, documenti, identità del locatore, accordi economici e percorsi reali **non risultano certificati**.

## Qualità misurata
- 23 record correnti nel database di scoperta; 10 con canone valorizzato al momento della prima ispezione.
- 0 proprietari con conferma indipendente; 0 disponibilità confermate dal proprietario.
- 5 record con riscontro manuale della scheda fonte.
- Il numero cumulato dei contatori `discovered` delle scansioni storiche non è utilizzabile come numero di annunci unici: occorre confrontarlo con l'archivio e i successivi inserimenti reali.
- L'eventuale mancata disponibilità del link va distinta da un blocco tecnico (403, 429, bot challenge o errore di rete).

## Verifiche necessarie prima di un lancio pubblico promosso
1. **Supabase Dashboard:** attivare la protezione contro le password compromesse (Security Advisor) e CAPTCHA/antiabuso di Auth dove supportato; queste impostazioni non sono esposte dagli strumenti di connessione al progetto.
2. **Account:** collaudare registrazione, conferma email, login/logout, esportazione e cancellazione su un account **di prova** senza dati reali. Non testare la cancellazione su account di produzione.
3. **Collector:** verificare che una scansione successiva al rilascio V15 registri `details.link_health`, conservi i dati con riscontro fonte e produca contatori coerenti con nuove URL effettive.
4. **Usabilità:** test mobile Safari e Chrome, navigazione tastiera, ingrandimento caratteri al 200%, VoiceOver, connettività lenta e PWA installata; verificare insieme ricerca → valutazione → salvataggio → confronto → visita.
5. **Aspetti legali:** verificare l'identità del titolare da pubblicare, le condizioni effettive dei fornitori, il trattamento dei dati, l'informativa privacy e gli obblighi normativi applicabili al servizio prima di promuoverlo come servizio commerciale.
6. **Playwright:** il codice e l'ingest VPS sono predisposti, ma l'esecuzione reale richiede un worker browser funzionante e autorizzato.
7. **Pubblicazione:** GitHub Pages build/deploy deve risultare `success` per il commit di rilascio e la PWA deve caricare gli asset V9; una build superata non sostituisce i test funzionali.

## Vincoli di prudenza
- Nessun annuncio viene riconosciuto automaticamente come «privato verificato» solo perché un portale lo classifica così.
- I duplicati tra portali sono candidati basati su indizi forti (via e numero civico, zona, prezzo/metratura) e **non vengono uniti automaticamente** per evitare perdita di informazioni.
- I controlli link rispettano robots.txt e i limiti delle fonti; non si forza l'accesso a pagine riservate o bloccate.
- Funzione `turinpipps-privacy` distribuita via Supabase: il relativo file sorgente non è stato ancora salvato nel repository, poiché l'operazione di creazione del file GitHub è stata bloccata. Prima di un handoff di manutenzione, allineare il codice sorgente con la versione distribuita seguendo un canale approvato.
