# TurinPipps 12.1 — revisione mobile, onboarding e temi

Data: 18 novembre 2026 · Repository: `filippoaprilee/filippoaprilee.github.io` · Directory: `turinpipps/`

## Problemi emersi dagli screenshot iPhone

- Header con due occorrenze del nome TurinPipps e azioni distribuite senza priorità.
- Filtri di ricerca e pulsanti «Altri siti», «Aggiungi annuncio», «Azzera» troppo compressi.
- Quattro tab con etichette che si sovrappongono sul piccolo schermo.
- Schede con titoli portale troppo lunghi, molte etichette, un secondo punteggio e verifiche ripetute.
- Sezione «Valutazione dell’immobile» visibile integralmente su card, in alcuni casi per una condizione di ordine fra enhancement v9 e v10.
- Bottom bar iPhone e contenuto da adattare a safe-area, tastiera e cambi di tema.
- Onboarding lungo nove schermate.

## Realizzato

### Header e navigazione

Il nome TurinPipps compare una volta sola nel topbar mobile; il marchio e il logo rimangono riconoscibili. Guida, selettore tema, avvisi e account hanno controlli compatti. La bottom navigation conserva Home, Cerca, Salvati, Organizza e Profilo con focus visibile, stati attivi leggibili e area sicura iOS.

### Ricerca

- Un campo principale, un'azione Filtri, Azzera e Altre opzioni.
- «Altri siti» e «Aggiungi annuncio» sono spostati in un `details` di secondo livello, **senza ricreare i button**: tutti gli event listener delle funzioni originali vengono preservati.
- Filtri risultati: Per te / Compatibili / Da verificare / Tutti, su griglia 2×2 nel layout mobile. Nessuna etichetta dovrebbe essere tagliata.
- Riga risultati con contatore reale e selettore Ordina insieme, eliminando la duplicazione visiva dell'intestazione.
- Ricerca originale, reset, ordinamenti e filtri avanzati continuano a usare i controller esistenti.

### Card degli immobili

- Le informazioni primarie sono canone, zona, titolo e due indicatori leggibili.
- Togliamo il suffisso del portale **solo dalla visualizzazione** di alcuni titoli; la scheda originale e il titolo completo rimangono intatti.
- I tag ripetitivi vengono sostituiti da due stati sintetici. Non vengono modificate le dichiarazioni di disponibilità/proprietà.
- «Controlli, affidabilità e provenienza» è un `details` chiuso per impostazione predefinita. Un `MutationObserver` riconcilia il caso in cui v9 inserisce la prova **dopo** il passaggio di v10, evitando il blocco gigante segnalato.
- La checklist e il simulatore restano separati, espandibili e sincronizzati.
- La card mostra due azioni principali: apri fonte e salva. Il pulsante originale per confrontare viene trasferito all'interno di «Confronta e altre azioni», conservando l'handler.

### Primo accesso

- Benvenuto breve, con «Inizia senza account» come azione principale; registrazione e accesso continuano a funzionare.
- Guida v4 ridotta da **nove a cinque passi**, mantenendo budget, zone, tipologia e riepilogo. Preferenze avanzate rimangono modificabili in Impostazioni.
- La guida mantiene pulsanti accessibili, indicatore del progresso, possibilità di tornare indietro e salto.
- Il benvenuto viene memorizzato sul dispositivo per evitare l'apparizione a ogni visita.

### Aspetto: Automatico / Chiaro / Scuro

- Scegli dal menu nell'header oppure dai pannelli Profilo e Impostazioni.
- La scelta viene memorizzata localmente in `turinpipps.theme.v12` (non sono inviati nuovi dati personali a Supabase).
- **Automatico** segue `prefers-color-scheme` e risponde al cambiamento in tempo reale.
- **Chiaro** e **Scuro** sovrascrivono il tema del dispositivo fino a una nuova selezione.
- Script di preflight nell'head applica i colori prima dei fogli di stile per ridurre il flash da tema errato.
- Il tema copre Home, ricerca, card, prove, onboarding, dialog, preferenze, notifiche, monitoraggio, organizzazione e footer. Tutti i principali contenitori impiegano superfici scure dedicate, non inversioni cromatiche.
- `meta theme-color` si aggiorna con il tema effettivo.

### PWA

Service Worker `turinpipps-shell-v12.1.0` e versioni querystring `experience-v12.js?v=12.1.0` / `experience-v12.css?v=12.1.0`, in modo che l'app Home Screen non resti bloccata sulle vecchie risorse.

## Cosa non è stato toccato

- Schema/database, collector Supabase Cron, API mail/push, autenticazione, autorizzazioni.
- Funzioni di salvataggio e confronto; i pulsanti esistenti vengono *spostati*, non rigenerati.
- Dati immobiliari, stati verificati/dichiarati/sconosciuti, storico delle prove e sorgenti.

## Collaudo

Test automatici ripetibili: `node --test turinpipps/tests/v12-ui.test.cjs`.

Controlli effettuati in chat: parsing JS e script inline, corrispondenza asset HTML/service worker, comportamento Auto/Chiaro/Scuro con simulazione di `matchMedia`. Build GitHub Pages da confermare sulla revisione finale.

**Collaudo manuale tuttora necessario:** Safari iPhone/PWA 320–430px, screenshot light/dark, modifica tema di sistema con l'app aperta, VoiceOver, navigazione da tastiera, modalità offline, login/logout e salvataggio completo. I test logici non costituiscono un test end-to-end su dispositivo.
