# TurinPipps iOS · app nativa e widget

## Stato al 16 novembre 2026

I sorgenti SwiftUI e WidgetKit sono nel repository. Il widget **non è ancora compilato, firmato o installato**. Il progetto Xcode viene generato con XcodeGen.

Il widget legge i dati di mercato da **Supabase in produzione**, non dal vecchio archivio JSON statico:

- `https://akgnxjwkrnuckgxscjdz.supabase.co/functions/v1/turinpipps-widget?budget=700`
- Endpoint verificato con HTTP 200 il 16 novembre 2026.
- Espone soltanto aggregati pubblici, senza dati personali: numero di immobili potenzialmente compatibili, numero da verificare, ultime tre schede e data dell'ultima scansione.
- Budget predefinito 700 €, tutte le zone principali di Torino. Non legge ancora preferenze, preferiti o credenziali del singolo account.
- Gli annunci sono solo opportunità da verificare: il collegamento indicizzato non garantisce disponibilità, costo definitivo o proprietà del locatore.

## Come ottenere il widget installabile

1. Sul Mac installa **Xcode** e **XcodeGen** (ad esempio `brew install xcodegen`).
2. Apri `turinpipps/ios/TurinPipps` e avvia `xcodegen generate`.
3. Apri `TurinPipps.xcodeproj`, imposta **Signing & Capabilities** con il tuo Apple Team e controlla i due bundle identifier `it.maben.turinpipps` e `it.maben.turinpipps.widget`.
4. Compila e installa la companion app su un iPhone reale; dalla galleria widget iOS aggiungi **Radar TurinPipps**.

Il widget usa WidgetKit e dunque serve un'app iOS nativa installata; una PWA da Safari non può installare un widget WidgetKit. WidgetKit determina i momenti di aggiornamento e non garantisce un refresh ogni 30 minuti.

## PWA e notifiche

La PWA `https://filippoaprilee.github.io/turinpipps/` è separata dalla companion iOS. Su iOS 16.4+ le notifiche Web Push sono possibili dopo l'aggiunta alla schermata Home, l'accesso all'account e l'autorizzazione dell'utente. Il relativo Service Worker e la sottoscrizione Supabase sono già nel progetto, ma non è stato certificato un test completo su iPhone reale.

La companion SwiftUI contiene un wrapper WebKit e non implementa direttamente APNs. Il login WebKit e quello della PWA Safari possono avere cookie separati.
