# TurinPipps · configurazione email (senza runner GitHub)

## Backend operativo

- Supabase: progetto `akgnxjwkrnuckgxscjdz`.
- Edge Function: `turinpipps-mailer`.
- Orchestrazione: `turinpipps-v5-user-mail` su Supabase pg_cron, eseguita ogni ora.
- Il backend invia i digest pianificati fra le **08:00 e le 10:59 Europe/Rome**.
- Dopo la verifica dell'indirizzo, i nuovi account ricevono digest **solo se hanno selezionato il consenso facoltativo** in registrazione. Il profilo può modificare la frequenza.

## Configurazione Resend

1. Aprire https://resend.com/ e creare o accedere all'account Resend.
2. In **Domains**, aggiungere un dominio di invio posseduto. È consigliabile usare un sottodominio dedicato, ad esempio `news.maben.it`, invece di cambiare le impostazioni della posta aziendale principale.
3. Nel pannello DNS che gestisce il dominio, aggiungere **esattamente** i record DKIM/SPF che Resend fornisce. Non eliminare i record MX attuali della posta aziendale; verificare prima di cambiare SPF su un dominio già usato.
4. Tornare su Resend, premere **Verify** e verificare che il dominio risulti **Verified**.
5. Aprire **API Keys**, creare una chiave di invio (idealmente limitata al dominio) e conservarla privatamente. **Non incollarla su GitHub, in ChatGPT, nel browser dell'app né nei file JavaScript pubblici**.
6. Aprire https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/functions e trovare **Secrets** (sezione Edge Functions / Secrets). Creare:
   - `RESEND_API_KEY`: il valore segreto della chiave Resend.
   - `TURINPIPPS_MAIL_FROM`: ad esempio `TurinPipps <avvisi@news.maben.it>` se il sottodominio è stato verificato.
7. Aprire la PWA, accedere con l'account `owner`, andare su **Sviluppatore**. Lo stato del provider deve risultare configurato. Accertarsi che il destinatario abbia confermato la propria email e abbia attivato i riepiloghi.
8. Premere **Invia report** sull'account che desidera riceverlo. Il backend usa l'API Resend, registra l'esito e mostra lo storico nel pannello sviluppatore. In caso di errore il registro indica la causa.

## Controlli e limitazioni

- Un risultato di invio accettato da Resend non certifica che il destinatario abbia letto l'email: per la consegna completa consultare gli eventi nel dashboard Resend.
- Un invio manuale ripetuto troppo presto viene bloccato per prevenire duplicati.
- L'opzione `off` / consenso disattivato va rispettata anche dall'amministratore.
- La ricerca immobili, l'aggiornamento del database e le notifiche non dipendono da Resend.
- Le email Supabase **Auth** (conferma account e recupero password) sono distinte dai digest TurinPipps e hanno una configurazione SMTP dedicata.
