# TurinPipps iOS · app e widget nativo

Questa cartella contiene i **sorgenti** dell'app iOS SwiftUI e di una estensione WidgetKit che mostra il numero di annunci pubblici potenzialmente compatibili e apre il Radar.

**Stato:** il widget non è installato su alcun iPhone e non è stato compilato o firmato. Una PWA non può installare autonomamente un'estensione WidgetKit.

## Compilazione

1. Installa Xcode e XcodeGen sul Mac (Homebrew: brew install xcodegen).
2. Apri la cartella ios/TurinPipps ed esegui xcodegen generate.
3. Apri TurinPipps.xcodeproj, verifica Bundle Identifier e Signing & Capabilities con il tuo team Apple.
4. Compila e distribuisci l'app sul tuo iPhone. Aggiungi il widget Radar TurinPipps dalla galleria widget di iOS.

Questo prototipo WidgetKit legge **solo l'archivio pubblico GitHub Pages** e applica un budget predefinito di 700 €. Non usa preferiti, token o impostazioni private dell'utente. Per dati davvero personalizzati servono autenticazione nativa, persistenza sicura condivisa e API dedicate. Il timer di aggiornamento WidgetKit è indicativo, non garantito da iOS.

Le notifiche web push dell'app PWA (iOS 16.4+) sono una funzione distinta: richiedono aggiunta alla schermata Home e consenso esplicito. La companion app nativa qui inclusa non implementa APNs.
