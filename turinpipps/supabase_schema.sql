-- TurinPipps · struttura account privati Supabase
-- Esegui nel SQL Editor del progetto Supabase Free.
-- Solo la chiave publishable/anon va nel browser. NON inserire la service_role.
create table if not exists public.turinpipps_listing_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_url text not null check (char_length(listing_url) between 10 and 2048),
  saved boolean not null default false,
  contacted boolean not null default false,
  discarded boolean not null default false,
  notes text not null default '' check (char_length(notes) <= 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, listing_url)
);

create table if not exists public.turinpipps_manual_listings (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_url text not null check (char_length(listing_url) between 10 and 2048),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, listing_url)
);

create table if not exists public.turinpipps_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  budget integer not null default 700 check (budget between 100 and 5000),
  display_name text not null default '' check (char_length(display_name) <= 70),
  introduction text not null default '' check (char_length(introduction) <= 1200),
  updated_at timestamptz not null default now()
);

alter table public.turinpipps_listing_states enable row level security;
alter table public.turinpipps_manual_listings enable row level security;
alter table public.turinpipps_preferences enable row level security;

-- Blocca completamente gli utenti anonimi sui dati personali.
revoke all on public.turinpipps_listing_states from anon, authenticated;
revoke all on public.turinpipps_manual_listings from anon, authenticated;
revoke all on public.turinpipps_preferences from anon, authenticated;
grant select, insert, update, delete on public.turinpipps_listing_states to authenticated;
grant select, insert, update, delete on public.turinpipps_manual_listings to authenticated;
grant select, insert, update, delete on public.turinpipps_preferences to authenticated;

drop policy if exists "tp_states_select" on public.turinpipps_listing_states;
drop policy if exists "tp_states_insert" on public.turinpipps_listing_states;
drop policy if exists "tp_states_update" on public.turinpipps_listing_states;
drop policy if exists "tp_states_delete" on public.turinpipps_listing_states;
create policy "tp_states_select" on public.turinpipps_listing_states for select to authenticated
using ((select auth.uid()) = user_id);
create policy "tp_states_insert" on public.turinpipps_listing_states for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "tp_states_update" on public.turinpipps_listing_states for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tp_states_delete" on public.turinpipps_listing_states for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "tp_manual_select" on public.turinpipps_manual_listings;
drop policy if exists "tp_manual_insert" on public.turinpipps_manual_listings;
drop policy if exists "tp_manual_update" on public.turinpipps_manual_listings;
drop policy if exists "tp_manual_delete" on public.turinpipps_manual_listings;
create policy "tp_manual_select" on public.turinpipps_manual_listings for select to authenticated
using ((select auth.uid()) = user_id);
create policy "tp_manual_insert" on public.turinpipps_manual_listings for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "tp_manual_update" on public.turinpipps_manual_listings for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tp_manual_delete" on public.turinpipps_manual_listings for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "tp_prefs_select" on public.turinpipps_preferences;
drop policy if exists "tp_prefs_insert" on public.turinpipps_preferences;
drop policy if exists "tp_prefs_update" on public.turinpipps_preferences;
drop policy if exists "tp_prefs_delete" on public.turinpipps_preferences;
create policy "tp_prefs_select" on public.turinpipps_preferences for select to authenticated
using ((select auth.uid()) = user_id);
create policy "tp_prefs_insert" on public.turinpipps_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "tp_prefs_update" on public.turinpipps_preferences for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tp_prefs_delete" on public.turinpipps_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

-- L'archivio degli annunci pubblici resta su GitHub Pages. 
-- Le tre tabelle qui sopra contengono SOLO i dati privati dell'utente.
