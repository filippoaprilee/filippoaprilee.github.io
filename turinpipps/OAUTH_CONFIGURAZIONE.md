# TurinPipps — configurazione della conferma email

La web app ora utilizza **solo email/password** e la modalità ospite. I pulsanti Google/Apple sono stati rimossi dal codice. Supabase Auth continua a gestire registrazione, verifica email e sessioni in sicurezza.

## Attiva il template di conferma personalizzato

1. Apri [Authentication → Emails](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/templates) nel progetto TurinPipps. Se l'interfaccia presenta schede, seleziona **Templates** (non SMTP).
2. Apri **Confirm signup** / **Confirm sign up**.
3. Imposta l'oggetto su `TurinPipps | Conferma il tuo indirizzo email`.
4. Per il corpo email HTML, apri [supabase-confirmation-email.html](https://github.com/filippoaprilee/filippoaprilee.github.io/blob/filippoaprilee/turinpipps/supabase-confirmation-email.html) e premi **Raw**. Copia l'intero testo HTML, poi incollalo nell'editor HTML del template Supabase sostituendo il corpo esistente.
5. Controlla che nel codice sia ancora presente **`{{ .ConfirmationURL }}`**. Il link deve restare così: è il token sicuro generato da Supabase per l'utente, non va sostituito con il link generico della PWA.
6. Premi **Save**.
7. Apri [URL Configuration](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/url-configuration) e imposta il **Site URL** `https://filippoaprilee.github.io/turinpipps/`; nell'elenco **Redirect URLs** aggiungi la stessa URL.
8. Apri [Sign In / Providers](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/providers) e lascia attivo **Email** con **Confirm email**. Non serve attivare Google e Apple.
9. Per verificare usa una **nuova email di prova** oppure il flusso di conferma di un nuovo utente: la modifica del template non rimanda automaticamente email agli account già confermati.

**Nota:** personalizzare corpo e oggetto non cambia automaticamente il mittente `Supabase Auth`. Per scegliere un mittente verificato a nome TurinPipps servono le impostazioni SMTP del pannello Supabase, una casella autorizzata e un dominio email validato secondo il provider. Non inserire credenziali SMTP su GitHub.

La conferma di registrazione deve continuare a essere verificata sul backend Supabase Auth; una pagina statica GitHub Pages non deve generare o validare token autonomamente.

## Link rapidi

- [TurinPipps — app](https://filippoaprilee.github.io/turinpipps/)
- [Email template HTML da copiare](https://raw.githubusercontent.com/filippoaprilee/filippoaprilee.github.io/filippoaprilee/turinpipps/supabase-confirmation-email.html)
- [Supabase — email templates](https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/auth/templates)
- [Documentazione ufficiale Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
