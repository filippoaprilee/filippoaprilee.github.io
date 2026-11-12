# CasaRadar Torino (PWA gratuita)

App pubblica: https://filippoaprilee.github.io/torino-casa/

## Obiettivo
Cercare appartamenti da privati, fino a 700 € di canone mensile (spese escluse), a Torino nelle zone Crocetta, Cenisia, San Paolo, Borgo San Paolo, Cit Turin, Santa Rita e Pozzo Strada, con priorità alle zone più vicine al Politecnico di corso Duca degli Abruzzi.

## Cosa è già attivo
- Interfaccia web responsive, installabile su iPhone con Safari > Condividi > Aggiungi alla schermata Home.
- Filtri rigorosi: un annuncio passa nei risultati compatibili solo se il canone è noto e <=700, la zona è riconosciuta e la fonte indica trattativa privata.
- La sezione Da verificare ospita prezzi assenti, zone non dichiarate o status privato non confermato.
- Preferiti, scartati, contattati e configurazione salvati solo nel browser (localStorage); non sono sincronizzati tra dispositivi.
- Link alle ricerche ufficiali di Subito (categoria da privati), Immobiliare.it, Idealista, ClickCase, Bakeca e Facebook.
- Inserimento manuale link annunci, importazione/esportazione JSON.
- Messaggi personalizzati da copiare e inviare manualmente.
- Prime schede ClickCase verificate manualmente il 12/11/2026. Disponibilità NON certificata.

## Cosa non è attivo
- Aggiornamento automatico: workflow GitHub Actions presente, ma le prime esecuzioni sono fallite prima dell'avvio del runner, con zero step eseguiti. Controllare le impostazioni Actions/Billing dell'account.
- Subito e Immobiliare.it non forniscono annunci all'app automaticamente: sono collegate ricerche ufficiali e avvisi.
- Nessun accesso ai gruppi privati Facebook e nessun invio automatico Messenger.
- Nessuna notifica push personalizzata: usare gli avvisi ufficiali dei portali.
- Nessuna autenticazione o database server. Non pubblicare credenziali o dati privati su GitHub Pages.

## Controlli automatici sperimentali
Il workflow .github/workflows/casaradar-torino.yml chiama torino-casa/collector.py con standard library Python e rispetta robots.txt. Controlla solo pagine pubbliche accessibili, senza bypass CAPTCHA, restrizioni o account. Se il runner partirà, aggiornerà data/listings.json e data/diagnostics.json alle 06:19, 12:19, 18:19 UTC; il funzionamento effettivo non è garantito.

## Installazione iPhone
1. Apri https://filippoaprilee.github.io/torino-casa/ in Safari.
2. Tocca Condividi, quindi Aggiungi alla schermata Home.
3. Conferma Aggiungi. Non è necessario tenere acceso Python sul Mac.

## Privacy e costi
GitHub Pages pubblica file statici; i preferiti e la configurazione risiedono sul dispositivo. Nessuna chiave API richiesta. Non sono previsti costi di hosting usando Pages su repository pubblico nel piano gratuito.

## File
- index.html: app web.
- manifest.webmanifest, sw.js, icon.svg: risorse PWA.
- collector.py: raccoglitore sperimentale.
- data/*.json: annunci e diagnostica pubblici.