# TurinPipps · posta dal tuo indirizzo aziendale

## Mittente scelto

**TurinPipps <filippo@maben.it>**.

È un indirizzo valido per i riepiloghi se il dominio **maben.it** viene verificato dal provider di invio. Non devi acquistare un dominio nuovo né aprire una nuova casella. L'indirizzo può ricevere nella posta aziendale attuale; il backend invia tramite API Resend.

> Attenzione: **maeben.it** è diverso da **maben.it**. Il mittente concordato è `filippo@maben.it`.

## 1. Autorizza il dominio su Resend

1. Apri https://resend.com/domains ed esegui l'accesso.
2. **Add Domain** e inserisci **maben.it** (non serve creare `news.maben.it`).
3. Scegli una regione disponibile. Leggi e copia i record DNS proposti da Resend: DKIM e i record per il sottodominio di Return-Path/bounce. I nomi e valori **esatti** sono mostrati da Resend e non vanno indovinati.

## 2. Inserisci record DNS senza rompere la posta

1. Accedi al pannello del provider che **gestisce realmente i DNS** di `maben.it`, eventualmente SiteGround se il dominio usa i nameserver SiteGround.
2. Apri DNS Zone Editor / DNS Management. Prima fai una copia o screenshot dei record esistenti.
3. Aggiungi **soltanto** i record nuovi indicati da Resend per `maben.it`: esegui la verifica e non sostituire i record MX della posta aziendale già esistenti.
4. **Non aggiungere due record SPF separati sul medesimo nome DNS.** Se Resend propone SPF su un sottodominio di Return-Path (spesso `send`), applicalo a quel sottodominio, non in automatico alla radice.
5. Clicca **Verify** nel dashboard Resend e accertati che lo stato del dominio sia **Verified**.

## 3. Crea la credenziale di invio

1. Resend → **API Keys → Create API Key**, nome ad esempio `TurinPipps Production`, permesso solo invio, limitato al dominio verificato se possibile.
2. **Non pubblicare la chiave**: niente GitHub, chat, screenshot o codice del browser.
3. In Supabase apri https://supabase.com/dashboard/project/akgnxjwkrnuckgxscjdz/settings/functions (oppure **Edge Functions → Secrets**).
4. Configura le variabili server:
   - `RESEND_API_KEY` = chiave privata API Resend
   - `TURINPIPPS_MAIL_FROM` = `TurinPipps <filippo@maben.it>`

## 4. Prova le email di TurinPipps

1. Apri https://filippoaprilee.github.io/turinpipps/, accedi come `filippo@maben.it` e apri **Sviluppatore** (solo questo account ha ruolo owner).
2. Controlla l'indicazione **Provider configurato**.
3. Nell'elenco degli utenti individua un indirizzo **verificato**, che abbia attivato il consenso ai riepiloghi.
4. Premi **Invia report**. Il backend conferma l'esito della richiesta e registra la spedizione.
5. Controlla anche la sezione **Emails** nel dashboard Resend per verificare se è stato effettivamente consegnato al destinatario.

**Programmazione:** i riepiloghi automatici TurinPipps sono gestiti da **Supabase Cron**, non da GitHub Actions o ChatGPT. Non è necessario che il Mac o l'iPhone siano accesi.

## Nota distinta: email di registrazione

Le email di conferma e recupero password **Supabase Auth** sono separate dai riepiloghi TurinPipps. Per personalizzarne il mittente e gestire limiti di invio occorre configurare l'SMTP di Supabase Auth in **Authentication → SMTP Settings**. Non confondere questa impostazione con i due Secrets del mailer.

## Verifica della privacy

I report vengono inviati soltanto a utenti con indirizzo verificato e consenso attivo; l'utente può revocarlo dal Profilo. La console sviluppatore non deve bypassare l'opt-out.
