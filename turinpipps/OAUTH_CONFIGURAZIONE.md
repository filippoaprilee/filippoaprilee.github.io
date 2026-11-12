# TurinPipps — Accesso Google e Apple, conferme e recupero password

## Stato dell'implementazione

La web app TurinPipps ha già pulsanti **Continua con Google** e **Continua con Apple** che chiamano `supabase.auth.signInWithOAuth()`, oltre a email/password e salvataggio delle sessioni. **Non è sufficiente il pulsante:** il provider deve essere configurato sul backend Supabase, altrimenti l'autorizzazione fallirà.

Il progetto Supabase esiste: `akgnxjwkrnuckgxscjdz`. Le tabelle RLS sono già create. Supabase rimane il backend per gli account e per isolare i dati dei singoli utenti. Il login si presenta **dentro TurinPipps**; i provider esterni vengono aperti solo per autenticare l'utente. Non salvare password o token OAuth su GitHub Pages.

## Google — consigliato per mantenere TurinPipps gratuito

1. Apri [Google Auth Platform](https://console.cloud.google.com/auth/overview) con il tuo Google account. Se richiesto, crea un progetto Google Cloud dedicato, **senza attivare prodotti a pagamento non necessari**.
2. Apri **Branding**: nome app `TurinPipps`, email supporto autorizzata, URL dell'app `https://filippoaprilee.github.io/turinpipps/`, link a privacy policy e termini se richiesti. Imposta tipo pubblico/External e, una volta testato, pubblica l'app per gli utenti esterni, se il pannello lo richiede.
3. Apri **Clients → Create client → Web application** (nome `TurinPipps Web`).
4. Inserisci:
   - **Authorized JavaScript origins:** `https://filippoaprilee.github.io`
   - **Authorized redirect URIs:** `https://akgnxjwkrnuckgxscjdz.supabase.co/auth/v1/callback`
5. Genera il **Client ID** e **Client Secret** e conservali nel servizio Google/Supabase, **mai nel repository pubblico**.
6. Apri [Supabase → Authentication → Sign In / Providers](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/providers), espandi **Google**, abilita il provider, incolla Client ID e Client Secret e salva.
7. Apri [Supabase → URL Configuration](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/url-configuration), imposta **Site URL** e **Additional Redirect URLs** su `https://filippoaprilee.github.io/turinpipps/` e salva.
8. Apri l'app TurinPipps, tocca **Continua con Google**, autentica il tuo Google account e verifica il ritorno a TurinPipps. Controlla poi che i preferiti siano salvati sul tuo account.

Con l'accesso Google, Google conferma l'identità dell'utente: non occorre una seconda email "Confirm your email address" di Supabase.

## Apple — vincolo economico

Il pulsante web esiste nel codice, ma per attivare Sign in with Apple su un tuo sito servono App ID, Services ID, impostazione domini e credenziali sviluppatore Apple. Queste funzionalità rientrano normalmente nell'**Apple Developer Program** a pagamento (99 USD/anno o prezzo equivalente). Non dichiararlo gratuito né già operativo. Se non vuoi nuovi costi, lascia Apple disattivato lato Supabase e usa Google o email/password.

Documentazione ufficiale:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/social-sign-in/auth-apple

## Email di conferma con marchio TurinPipps

Per chi sceglie **Email e password**, il link di conferma deve essere generato dal backend di autenticazione, non da JavaScript pubblico (è un passaggio di sicurezza essenziale). Puoi personalizzare il messaggio e far tornare l'utente sull'app:

1. In [Supabase → Authentication → Emails](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/templates), apri **Confirm signup** e sostituisci il contenuto con il file `turinpipps/supabase-confirmation-email.html`.
2. Mantieni il placeholder `{{ .ConfirmationURL }}`, obbligatorio per il link verificato.
3. Configura un SMTP autorizzato se vuoi un mittente come `TurinPipps` su un indirizzo verificato: non inserire password SMTP nel repository, ma soltanto nei campi segreti del pannello Supabase.
4. Mantieni **Confirm email** abilitato per i nuovi account creati con password.

L'email potrà chiamarsi TurinPipps e usare il logo, ma **sarà comunque il servizio sicuro Supabase Auth a firmare e convalidare il token di conferma**. Questo non può essere spostato su GitHub Pages senza costruire un nuovo backend.
