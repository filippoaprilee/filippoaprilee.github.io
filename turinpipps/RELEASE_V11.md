# TurinPipps 11 — affidabilità degli annunci, fonti e accessibilità

**Data:** 18 novembre 2026 · **Ambiente:** GitHub Pages + Supabase Free · **Stato:** codice pubblicato e backend aggiornato; collaudo browser/iPhone da completare.

## Obiettivo

Nessun server aggiuntivo, nessun abbonamento richiesto, nessun crawling non autorizzato. Conservare gli URL originali quando un portale blocca la lettura e distinguere la presenza di un annuncio dall'effettiva disponibilità dell'alloggio.

## Backend e database

Migrazione \`turinpipps_v11_public_field_provenance_and_source_health\` applicata sulla tabella esistente \`turinpipps_discovered_listings\`:
- \`field_provenance jsonb\`: per campo, evidenza source-level (\`state="claimed"\`, \`origin="public_listing_page"\`, data osservazione, URL e descrizione della prova);
- \`detail_checked_at\`, \`detail_status\`: quando e con quale esito è stata tentata la lettura della pagina, indipendentemente dalla disponibilità dell'immobile.

Nessun record è stato cancellato, nessuna tabella applicativa è stata introdotta e le policy RLS non sono state allargate.

Collector Supabase Edge Function aggiornato (v18 alla pubblicazione della presente nota):
1. Canonicalizzazione degli URL noti e deduplicazione per identificativo stabile dello **stesso portale**; i link di portali diversi non vengono mai fusi automaticamente.
2. Controllo progressivo di un massimo di tre schede dettaglio ClickCase per scansione, soltanto quando \`robots.txt\` lo permette. Il permesso è riletto a ogni scansione e riutilizzato internamente alla stessa esecuzione.
3. Estrazione da etichette esplicite: canone mensile, spese condominiali, superficie, via con civico, quartiere, tipologia e date **solo se qualificate come pubblicazione/aggiornamento**. Il codice non confonde data di disponibilità e data di pubblicazione.
4. Un prezzo trovato genericamente accanto a un link nell'elenco non viene considerato canone dell'immobile.
5. Le informazioni già verificate manualmente o confermate indipendentemente sono preservate. I dati del portale sono sempre segnati come \`claimed\`, non \`verified\`; la dicitura "privato" dell'annuncio non verifica l'identità.
6. Lo storico dei prezzi resta governato dai trigger precedenti; i ribassi vengono registrati solo quando cambia realmente il valore associato alla stessa fonte.
7. Nell'ultima scansione, \`details.source_quality\` riporta per origine controlli, successi, link osservati, identificativi distinti e nuovi; \`details.dedup\` separa osservazioni ripetute da nuove schede; \`details.detail_enrichment\` riporta i dettagli consultati.
8. Google Alerts resta una fonte di URL pubblici. Portali che negano la lettura automatica vengono soltanto consultati manualmente dall'utente; non si aggirano blocchi, CAPTCHA, autenticazione o limiti.

**Importante:** lo stato \`link_status=blocked\` non significa "immobile non disponibile". I contatori cumulativi delle scansioni non sono un inventario di case uniche.

## UI e gerarchia

- Home v10 conservata: risultati, budget, nuovi link e attività principale in evidenza.
- Ricerca: schede compatte; dettagli documentali e modulo personale dentro pannelli apribili, senza mostrare subito tutte le informazioni secondarie.
- Eliminati i doppi punteggi e spostate le informazioni tecniche ripetute nei dettagli.
- Prova dati: etichette **Verificato / Dichiarato / Sconosciuto**. Le vecchie revisioni documentate senza tracciamento per singolo campo rimangono dichiarate e vengono spiegate come tali.
- Monitoraggio: nuovi KPI di resa e deduplicazione delle fonti. Cronologia e portali esterni restano disponibili in una sezione espandibile.
- Stati vuoti differenziati: ricerca senza corrispondenze (azzera filtri, consulta fonti) oppure nessun preferito (vai alla ricerca).
- Primo accesso: benvenuto visualizzato una volta per dispositivo, guida interattiva completabile e non ripetuta automaticamente.
- Moduli personali: checklist e costi non si chiudono dopo il salvataggio; preservati focus e sezione espansa.
- Mobile: font più leggibili, pulsanti almeno 44px, navigazione ridotta e report per fonte in layout verticale.
- Accessibilità: etichette accessibili per filtri, stato risultati, focus dopo navigazione, focus visibile, contrasto verificato per i colori principali, \`details/summary\` nativi, supporto a \`prefers-reduced-motion\`.
- PWA: cache e riferimenti agli asset aggiornati a v11.

## Test e limite delle conferme

- Modulo JavaScript controllato sintatticamente.
- Estrattore testato con campione sintetico: 1.650 €/mese, 100 € spese, 106 m², via con civico, quartiere, tipologia, data di aggiornamento esplicita, data disponibilità ignorata, script contenenti finti prezzi ignorati.
- Test regressione disponibili:
  - \`node --test turinpipps/tests/v10-matching.test.cjs\`
  - \`node --test turinpipps/tests/v11-extractor.test.cjs\`
- Verificare dopo una scansione con il nuovo codice che \`details.source_quality\`, \`details.dedup\`, \`detail_enrichment\` siano popolati e che la funzione non restituisca errori.
- Test completi reali su Safari iOS e VoiceOver, stato offline, accessibilità WCAG, login/logout e sincronizzazione sono ancora da eseguire in un browser interattivo.

## Controlli importanti prima di pubblicizzare la piattaforma

Non chiamare "verificato" un proprietario solo perché è indicato come privato nel portale; non chiamare "disponibile" una casa solo perché il link funziona. Validare la cancellazione dell'account con account di test, rivedere testo legale privacy/termini, e verificare configurazione anti-password compromesse Supabase.

Il collector su Supabase Cron è un motore distinto dal worker Playwright esterno: la riuscita delle scansioni Cron non dimostra che il browser Playwright stia girando.
