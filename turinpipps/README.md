# TurinPipps Torino (PWA gratuita)

App pubblica: https://filippoaprilee.github.io/turinpipps/

## Report email automatico

È attiva una schedulazione giornaliera tramite ChatGPT + Gmail alle 19:00 Europe/Rome, con email iniziale inviata correttamente il 12/11/2026 al mittente Gmail collegato. I destinatari non sono memorizzati nei file pubblici. Altri destinatari richiedono una modifica autorizzata dell'automazione. Il runner GitHub Actions resta bloccato a livello account: il workflow non può essere considerato operativo finché non viene risolto il problema di avvio dei job. La ricerca automatica tramite ChatGPT continua indipendentemente, leggendo/scrivendo turinpipps/data/listings.json.

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
Il workflow .github/workflows/turinpipps-torino.yml chiama turinpipps/collector.py con standard library Python e rispetta robots.txt. Controlla solo pagine pubbliche accessibili, senza bypass CAPTCHA, restrizioni o account. Se il runner partirà, aggiornerà data/listings.json e data/diagnostics.json alle 06:19, 12:19, 18:19 UTC; il funzionamento effettivo non è garantito.

## Installazione iPhone
1. Apri https://filippoaprilee.github.io/turinpipps/ in Safari.
2. Tocca Condividi, quindi Aggiungi alla schermata Home.
3. Conferma Aggiungi. Non è necessario tenere acceso Python sul Mac.

## Privacy e costi
GitHub Pages pubblica file statici; i preferiti e la configurazione risiedono sul dispositivo. Nessuna chiave API richiesta. Non sono previsti costi di hosting usando Pages su repository pubblico nel piano gratuito.

## File
- index.html: app web.
- manifest.webmanifest, sw.js, icon.svg: risorse PWA.
- collector.py: raccoglitore sperimentale.
- data/*.json: annunci e diagnostica pubblici.

## Novità: acquisizione automatica dagli avvisi ufficiali
La nuova versione include `alerts_ingest.py`. Non accede con bot alle pagine protette: legge **in sola lettura** una casella email IMAP dedicata agli avvisi ufficiali, se esplicitamente configurata. Sono riconosciuti link diretti provenienti da Subito, Immobiliare.it, Idealista, ClickCase, Bakeca e Casa.it. Annunci senza canone, zona o inserzionista verificato rimangono "Da verificare": non vengono spacciati per compatibili.

Per usarla devi salvare almeno una ricerca e attivare le notifiche email nel portale; Subito e Immobiliare.it hanno procedure ufficiali di avviso. Serve anche collegare una casella IMAP. Non è possibile configurare accessi di terze parti senza l'autorizzazione del relativo titolare.

## Alternativa immediata gratuita per Mac (quando GitHub Actions non avvia i job)
Il runner GitHub standard del tuo account continua a fallire prima di eseguire uno step, compreso un test minimale. GitHub Pages funziona, ma non garantisce l'esecuzione di altri job. Il codice non può correggere un blocco di fatturazione/autorizzazione imposto da GitHub. Controlla Account settings > Billing and licensing > Budgets & alerts, e Repository > Settings > Actions > General, oppure apri un ticket a GitHub Support riportando i run ID.

Il Mac può eseguire lo stesso lavoro **senza runner GitHub**, tramite LaunchAgent macOS ogni 6 ore. La pagina pubblica rimane accessibile anche quando il Mac è spento; quando è spento non vengono raccolti nuovi dati.

Da Terminale, con un GitHub login locale già autorizzato:
```bash
git clone --branch filippoaprilee https://github.com/filippoaprilee/filippoaprilee.github.io.git "$HOME/TurinPippsTorino"
bash "$HOME/TurinPippsTorino/turinpipps/mac_install.sh"
```
L'installer verifica in modalità dry-run che Git possa pubblicare prima di programmare il task. Se è già stata clonata la repository, esegui `git pull` e poi `bash turinpipps/mac_install.sh`. Per configurare lettura delle mail e bot Telegram:
```bash
bash "$HOME/TurinPippsTorino/turinpipps/mac_setup_integrations.sh"
```
Conserva le password nel Portachiavi macOS. Non inserirle nel repository o nella chat. Il bot Telegram avvisa soltanto il chat ID configurato; non scrive ai proprietari.

Per un controllo immediato e per verificare eventuali errori:
```bash
bash "$HOME/TurinPippsTorino/turinpipps/mac_update.sh"
tail -n 80 "$HOME/Library/Logs/TurinPipps/error.log"
```

## Opzione GitHub Actions
Il workflow `.github/workflows/turinpipps-torino.yml` è configurato per tre scansioni al giorno e include gli stessi tre moduli Python. Quando GitHub consentirà i runner, occorrerà impostare le repository Actions secrets `TURINPIPPS_IMAP_HOST`, `TURINPIPPS_IMAP_USER`, `TURINPIPPS_IMAP_PASSWORD` e facoltativamente `TURINPIPPS_TELEGRAM_TOKEN`, `TURINPIPPS_TELEGRAM_CHAT_ID`. Il connettore GitHub usato per questo progetto non dispone dell'azione che crea i secret: si devono aggiungere manualmente nella schermata GitHub. Non sono state aggiunte credenziali nel repository.

## Contatti ai proprietari
L'app prepara il testo di un messaggio, ma il primo invio automatico su Facebook Marketplace/Subito/Immobiliare.it **non è attivo**, perché non sono disponibili autorizzazioni e interfacce ufficiali per inviare liberamente messaggi privati da un bot personale. Non aggiriamo login, CAPTCHA e sistemi antispam. I contatti devono usare i canali consentiti dal singolo portale. È esclusa la messaggistica seriale non richiesta.
