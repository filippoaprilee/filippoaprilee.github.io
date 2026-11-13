# TurinPipps 3.0 — stato tecnico e pubblicazione

## Sistema attivato (13 novembre 2026)

- **Supabase**: progetto `akgnxjwkrnuckgxscjdz`, nuovo archivio `turinpipps_discovered_listings` e log `turinpipps_scan_runs`, entrambi leggibili pubblicamente e protetti da RLS contro modifiche anonime.
- **Edge Function**: `turinpipps-collector` distribuita, autorizzazione con token segreto verificato via SHA-256 e token conservato in Supabase Vault. Nessuna password o chiave amministrativa nel browser.
- **Schedulazione automatica**: job `turinpipps-v3-collector` ogni **30 minuti**, mediante pg_cron + pg_net; 14 Google Alerts RSS già appartenenti all'utente vengono trasmessi da Vault alla funzione tramite richiesta HTTPS autenticata.
- **Fonte diretta**: lettura periodica delle pagine pubbliche ClickCase soltanto dopo verifica di robots.txt, senza login e senza bypass dei blocchi. I risultati sono controllati, deduplicati e salvati come link da verificare.
- **Bing RSS**: disattivato per la scansione automatica: i test restituivano risultati generici (per esempio Wikipedia) invece di annunci pertinenti. Rimane disponibile come ricerca manuale nell'interfaccia insieme a Google, DuckDuckGo e post Facebook pubblici indicizzati.
- **Prima verifica backend**: 15 controlli riusciti su 15, due schede ClickCase acquisite, zero nuove voci nei feed Google Alerts al momento del test. Non si può garantire il ritrovamento di annunci su tutte le piattaforme.

## Interfaccia e utilizzo

- Design responsive, logo sempre visibile in sidebar desktop e header mobile, icona PWA rinnovata.
- **Radar casa**: ricerca manuale multi-motore per zona e tipologia, aggiunta annunci, archivio unificato GitHub Pages + Supabase (aggiornamento mentre l'app è aperta).
- **Onboarding**: selezione di budget e quartieri, accesso guest o account.
- **Filtri più cauti**: annunci riservati a categorie specifiche, potenzialmente non disponibili e datati oltre 75 giorni non sono automaticamente classificati come pienamente compatibili.
- **Prestazioni**: caricamento annunci/monitoraggio/report parallelo e splash iniziale abbreviato; supporto offline di base tramite Service Worker.
- **iPhone**: pagina `today.html` come panoramica rapida e accesso tramite shortcut manifest o Comandi Rapidi (azione Apri URL). Un widget nativo iOS con dati visibili richiede un'app/widget WidgetKit ed è fuori dalla portata della sola PWA.

## Separazione dei dati

- Le tabelle `turinpipps_listing_states`, `turinpipps_preferences`, `turinpipps_manual_listings` non sono state modificate.
- Annunci pubblici leggibili da anon e authenticated, ma nessuno dei due ruoli può inserirli o modificarli; solo la Edge Function server può fare upsert.
- I feed Google Alerts personali non sono stati committati nel repository e risiedono in Vault.
- Nessun invio automatico di messaggi ai proprietari.

## Apps Script e report email

Il progetto Google Apps Script esterno conserva il suo codice e i suoi due trigger esistenti, che **non vengono modificati** dal merge GitHub né dal nuovo collector Supabase. Un file `google-apps-script/Code.gs` aggiornato è mantenuto come riferimento, ma non va sostituito senza verificare i trigger attivi.

I report Gmail restano indipendenti dal nuovo collector: per continuare a inviarli occorre che il trigger e il deployment Apps Script effettivi rimangano attivi e autorizzati.

## Test già eseguiti

- Compilazione Edge Function e invocazione HTTPS autenticata riuscite.
- Esecuzione e risposta 200 dei controlli pubblici: 15 fonti/feed, 2 risultati ClickCase, 14 feed Google vuoti.
- Test privilegi: `anon` può leggere l'archivio, ma non inserirlo; `authenticated` non può aggiornarlo.
- Sintassi dei JS statici, JSON del manifest, collegamenti alle risorse verificabili nel repository.
- Advisory sicurezza: nessuna nuova vulnerabilità RLS; warning preesistente su password compromesse in Auth.

## Limiti e verifiche successive

1. Gli annunci indicizzati e quelli presenti nei portali non sono necessariamente ancora liberi: non qualificare i link come disponibilità confermate senza riscontro.
2. Google Alerts può fornire 0 voci anche con trigger perfettamente funzionanti; regolare la frequenza delle *notifiche* dalla pagina Google Alerts è un'azione separata.
3. Facebook senza login: soltanto ricerca esterna di post pubblici indicizzati, nessuna lettura automatizzata di gruppi privati o Marketplace autenticato.
4. Prima di considerare completo il collaudo di produzione, testare manualmente login, logout, preferiti, note, confronto, visite e PWA in Safari su iPhone e su desktop.
