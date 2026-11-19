# TurinPipps 15.1.1 — interventi sui nuovi feedback degli utenti

Data: 19 novembre 2026. Repository: `filippoaprilee/filippoaprilee.github.io`, directory `turinpipps/`. PWA senza nuovi servizi a pagamento.

## 1. Quartiere escluso ovunque

È stata rimossa **Pozzo Strada** da tutti i selettori di zona in Cerca, aggiunta manuale e onboarding, dagli array delle preferenze e dagli endpoint di raccolta. Le preferenze già persistite in Supabase sono state corrette conservando gli altri quartieri degli utenti.

Nel database ci sono 25 annunci storici, di cui 2 di Pozzo Strada. I due sono marcati `excluded_from_search=true` e conservati per audit: RLS `tp_discover_select` consente le SELECT pubbliche soltanto se `not excluded_from_search`. Un trigger prima di inserimenti e modifiche applica l'esclusione anche a nuovi record e non permette di togliere casualmente il flag. A livello pubblico rimangono 23 annunci del database.

La stessa regola è adottata da:
- collector Supabase Cron, edge function v21, e raccolta Google Alerts;
- ingest Playwright, edge function v6;
- mailer/riepiloghi, edge function v13;
- widget read-only, edge function v4, che utilizza `service_role` e deve quindi applicare il filtro esplicitamente;
- trigger delle notifiche interne per nuovi annunci e ribassi;
- pagina rapida `today.html`, file statico, risultati principali e preferenze degli account.

Nell'archivio JSON sono stati rimossi sette annunci irrilevanti: uno riferito a Pozzo Strada ma etichettato Santa Rita e sei annunci di camere/posti letto. I record statici scendono da 27 a 20; il contenuto restante conserva i dati originali, senza valori fabbricati.

Verifiche SQL: due record archiviati/esclusi, zero preferenze utente contenenti il quartiere, zero notifiche preesistenti indirizzate ai due record, policy RLS verificata.

## 2. Schede immobili senza lo stacco bianco

Nuovo `experience-v15.js` e `experience-v15.css` con override mirati:
- la fascia decorativa in cima viene nascosta; **fonte + zona e canone** passano sulla medesima riga della scheda;
- corpo e barra delle azioni usano la stessa superficie chiara/scura, senza separazioni bianche;
- titolo e due stati sintetici restano centrali, con peso tipografico meno aggressivo;
- totale mensile stimato e distanza restano consultabili in `Descrizione, spese e dati originali`;
- controlli, storico e provenienza rimangono richiudibili; i dati non verificati non vengono spacciati per reali;
- le azioni esistenti per **Apri annuncio**, **Salva**, **Confronta**, **Contatta**, **Visita** e note mantengono gli stessi handler e dati personali.

Nessuna tabella o colonna personale rinominata. Il CSS usa token `tp15` e prevale sui fogli delle versioni precedenti.

## 3. Account diverso dalle preferenze

**Bottom navigation: Profilo / schermata Account.** Identità e accesso immediatamente visibili; notifiche e riepiloghi, installazione iPhone, privacy, esportazione/cancellazione dati sono in gruppi richiudibili.

**Icona in alto su mobile: Preferenze della ricerca.** Budget, quartieri, tipologia e tema chiaro/scuro/automatico. Non ci sono più due accessi diversi che aprono entrambi lo stesso profilo.

Il Profilo continua a gestire le due categorie indipendenti di consenso per email/push sulle versioni dell'app già implementate in v14. La gestione account personale non è stata modificata a livello di autenticazione.

## 4. Qualità degli annunci

- **Deduplicazione conservativa:** normalizzazione URL, source ID per ClickCase/Subito/Immobiliare/Idealista/Bakeca, senza fondere automaticamente portali diversi. Tra l'archivio statico di 20 record e quello Supabase di 23 risultano 7 identificativi della stessa fonte sovrapposti: una volta combinati, la logica `all()` li visualizza una sola volta. I titoli generici di uno stesso ID possono ereditare la descrizione del titolo più specifico, senza cambiare link, proprietà o dati personali.
- **Link non utilizzabili:** spariscono dai risultati i link marcati `missing` dopo due conferme HTTP 404/410, e gli annunci espressamente `unavailable` o `expired`. Stato `blocked` (robots, antiautomazione, 401/403/429) non equivale a immobile inesistente e rimane da verificare direttamente.
- **Campi mancanti:** l'estrattore legge soltanto metrature esplicitamente indicate e spese mensili esplicite e registra `field_provenance` con stato `claimed`. Il collector rispetta robots.txt, limita controlli e impiega backoff su fonti bloccate. Non sono inventati canone, indirizzo, data o proprietario.
- **Priorità dei risultati:** nuovo ordinamento `Più utili`, che privilegia compatibilità, canone noto e campi documentati; restano disponibili ordini cronologico, prezzo e score.
- **Rilevanza:** vengono esclusi annunci di camere e posti letto in tutte le vie di raccolta e consultazione.

La raccolta non diventa automaticamente più ricca solo per la modifica al codice: nell'ultima scansione osservata prima del deploy erano stati raccolti 14 URL distinti, zero nuovi, zero campi aggiuntivi da pagine di dettaglio. Questo va monitorato nelle prossime scansioni.

## 5. Le tre azioni fondamentali

1. **Trova una casa pertinente:** ricerca pulita, risultati `Più utili`, niente quartiere escluso e niente annunci di camere.
2. **Confronta con un'alternativa:** la scheda mantiene un pulsante Confronta visibile; il confronto mobile usa card con medesime voci nello stesso ordine, senza tabella orizzontale.
3. **Contatta e organizza la visita:** in Confronta esiste ora il pulsante `Segna contatto`, collegato all'handler preesistente; in Organizza si aggiornano fasi, risposte, visite e decisioni. Tre scorciatoie coerenti sono esposte nella Home.

## Pubblicazione e QA

Manifest `release.json` e PWA `sw.js` allineati su **15.1.1**; CSS/JS v15 precache. In repo: `node --test turinpipps/tests/v15-quality.test.cjs`.

Verifiche effettivamente fatte: sintassi JS/inline, coerenza asset/cache, simulazione di normalizzazione (esclusione quartiere/stanze/mancanti/expired; mantenimento anti-bot), test dell'estrattore su HTML sintetico, controlli SQL sulle preferenze/RLS/record. La build di GitHub Pages è stata verificata separatamente.

**Limiti:** non è stato svolto un collaudo visivo reale su Safari iPhone, VoiceOver, zoom/accessibilità né un flusso interattivo reale di login → confronta → visita. Non è stata provata una consegna email/push reale con account consenziente. L'estrazione dati dipende dalle fonti pubbliche accessibili e non deve aggirare blocchi dei portali.

## Manutenzione successiva

Prima di aggiungere nuove funzionalità è prioritario consolidare i CSS storici in un sistema di componenti meno stratificato, introdurre test E2E mobile e confrontare la qualità delle fonti nel tempo. Nessun piano a pagamento è stato introdotto da questa revisione.
