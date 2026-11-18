# TurinPipps 13 — audit mobile e percorsi d'uso

**Data:** 18 novembre 2026. **Origine audit:** sette screenshot originali dell'app installata su iPhone, in tema scuro. **Ambiente:** GitHub Pages + Supabase; nessun servizio o costo aggiuntivo.

## Difetti verificati negli screenshot

1. **Contrasto insufficiente** in modalità scura: titoli di Salvati/Organizza quasi neri sullo sfondo scuro; quattro KPI di Organizza, privacy/profilo, stati vuoti, badge del prezzo e filtri rapidi bianchi con testi troppo chiari.
2. **Gerarchia dispersiva**: metodologia prima della ricerca; pulsante Aggiorna isolato; filtri veloci separati dai filtri avanzati; riepiloghi Home troppo estesi.
3. **Organizza:** mostra «Salva un appartamento» anche quando c'è già un contatto registrato. Cinque grandi colonne anche quando quattro sono vuote.
4. **Salvati vs contatti:** «Nessuna casa salvata» quando esiste già un immobile contattato, senza spiegare che le due condizioni sono diverse.
5. **Navigazione iPhone:** icone in header affollate; footer e tab bar con caratteri piccoli e scroll di pannelli non sempre ottimale.
6. **Azzera i filtri:** il vecchio handler non azzerava i due filtri rapidi nascosti; un altro handler tentava `querySelector(...).forEach` e generava errore.

## Correzioni realizzate

### Dark / light / automatico

Il sistema delle tre scelte continua a funzionare. Sono stati aggiunti override mirati, non filtri CSS di inversione, per:
- tutte le intestazioni delle pagine; titoli, etichette e descrizioni;
- schede e badge prezzo degli annunci;
- KPI e contenuti di Organizza;
- blocco «Privacy e dati personali» e le azioni Esporta/Elimina;
- schede vuote, filtri, sezioni di Home e cronologia delle prove;
- dialog di conferma cancellazione account.

Le combinazioni **testate** hanno un rapporto di contrasto normale superiore a 4,5:1:
- Testo principale chiaro su scuro: **16,18:1**
- Testo principale su pannelli: **13,76:1**
- Testo secondario su pannelli: **9,11:1**
- Testo bianco su bottone primario: **6,19:1**
- Testo secondario su empty state: **8,43:1**
- Testo principale in tema chiaro: **11,97:1**

Questi sei controlli non sostituiscono l'audit WCAG globale con strumenti di rendering e VoiceOver.

### Ricerca e schede

- Le opzioni «Solo con prezzo» e «Scoperti negli ultimi 7 giorni» sono state **spostate** dentro il pannello Filtri esistente, mantenendo i listener. Non esiste più il box separato che appariva bianco.
- «Ricarica gli annunci» è stata spostata in «Altre opzioni», conservando il pulsante originale e il suo handler.
- La metodologia «Come valutiamo gli annunci» è stata spostata **dopo** i risultati anziché sopra il campo di ricerca.
- Ridotte spaziature e dimensioni ripetute, maggior leggibilità delle schede e delle informazioni selezionabili; le verifiche approfondite restano espandibili.
- Il comando **Azzera** ripristina anche le spunte dei filtri rapidi, evitando residui invisibili.
- Home: le opportunità suggerite non includono più immobili con incompatibilità certa (prezzo/zone). Se non esistono suggerimenti, la pagina non dice più falsamente che l'intero archivio è vuoto.

### Salvati e Organizza

- Salvati mostra soltanto le case con stato «salvato», ma ora spiega quando le case sono già seguite in Contatti e visite; il bottone porta direttamente al percorso.
- Organizza presenta per prime le **fasi con immobili**, lasciando le fasi vuote in `details` chiusi. Meno scroll e niente grossi box inutili.
- La prossima azione dipende dallo stato reale: contatto in attesa, risposta da gestire, casa salvata da valutare, visita futura, o prima ricerca.
- Le azioni esistenti su case, note, calendario, visita e decisioni sono conservate; nessuna informazione è stata cancellata.
- Riepiloghi e pannelli adesso hanno superfici coerenti col tema scuro.

### Header / footer / mobile

- Il pulsante Guida esce dall'header a 4 icone su mobile, mentre l'accesso alla guida rimane disponibile in Profilo.
- Aumentata la leggibilità delle etichette della bottom navigation e dei link nel footer, mantenendo supporto safe-area iOS.
- Corretti margini, altezze, padding, gerarchie e scorrimento verso le fasi attive.
- Rispetta il tema dell'iPhone automaticamente se è stata scelta la modalità Automatico.

## Audit dei percorsi con dati simulati

Eseguite verifiche logiche deterministiche sui controller esistenti:
- utente con **1 contatto e 0 salvati**: Organizza mostra il contatto, la fase corretta e l'azione per attendere/gestire risposta, non «salva il primo»;
- utente con **1 salvato**: propone di verificarlo;
- utente con **1 risposta**: propone il seguito;
- utente senza immobili: propone la ricerca;
- utente con **visita futura**: resta l'azione per il calendario;
- reset dei filtri e fonti, contenitori e testi dark in base al codice;
- parsing JS e coerenza delle risorse PWA.

Test nel repository:
- `node --test turinpipps/tests/v10-matching.test.cjs`
- `node --test turinpipps/tests/v11-extractor.test.cjs`
- `node --test turinpipps/tests/v12-ui.test.cjs`
- `node --test turinpipps/tests/v13-user-journeys.test.cjs`

**Limite:** non è stato possibile navigare con Safari reale, accedere a un account di prova e fare un audit visuale/VoiceOver automatico in questa sessione. Gli screenshot sono la prova visiva del *prima*; nessuna cattura *dopo* è dichiarata verificata.

## Le prossime priorità dopo il redesign

1. **Collaudo Safari/PWA reale:** telefono stretto, zoom, tastiera, VoiceOver, cambio tema a caldo e in background, refresh dopo nuova versione.
2. **Sincronizzazione dati personali:** casi combinati salvato/contattato/risposta/visita fra due dispositivi, login/logout e reti lente.
3. **Dati immobiliari:** mantenere proprietario e disponibilità come non verificati finché non esiste una prova; aumentare la qualità delle fonti.
4. **Notifiche reali:** invii, duplicati, permessi iOS e profondità dei link al singolo annuncio.
5. **Monitoraggio:** distinguere risultati nuovi, duplicati e fonti produttive; evitare metriche che fanno sembrare utile una scansione senza nuove opportunità.
6. **Lungo termine:** consolidare i fogli CSS storici per ridurre la stratificazione, ma senza fare una riscrittura rischiosa in un'app già utilizzata.

Nessun cambiamento a RLS Supabase, schema, dati privati, servizi a pagamento o crawler. Non vengono confusi test sintattici e una certificazione end-to-end.
