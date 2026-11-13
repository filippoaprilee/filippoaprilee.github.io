-- Already applied to live Supabase project akgnxjwkrnuckgxscjdz on 13/11/2026.
-- Documentation snapshot only. Do not reapply as an uncontrolled production migration.
alter table public.turinpipps_listing_states
  add column if not exists compare_selected boolean not null default false,
  add column if not exists visit_at timestamptz,
  add column if not exists visit_status text not null default 'non_programmata',
  add column if not exists visit_notes text not null default '',
  add column if not exists contacted_at timestamptz;
alter table public.turinpipps_preferences
  add column if not exists min_sqm integer not null default 0,
  add column if not exists preferred_zones text[] not null default array[
    'Crocetta','Cenisia','San Paolo','Borgo San Paolo',
    'Cit Turin','Santa Rita','Pozzo Strada']::text[],
  add column if not exists property_type text not null default 'tutte',
  add column if not exists max_walk_minutes integer;
alter table public.turinpipps_listing_states
  drop constraint if exists turinpipps_visit_status_allowed;
alter table public.turinpipps_listing_states
  add constraint turinpipps_visit_status_allowed check
  (visit_status in ('non_programmata','programmata','effettuata','annullata'));
alter table public.turinpipps_listing_states
  drop constraint if exists turinpipps_visit_notes_length;
alter table public.turinpipps_listing_states
  add constraint turinpipps_visit_notes_length check (char_length(visit_notes)<=2000);
alter table public.turinpipps_preferences
  drop constraint if exists turinpipps_preference_limits;
alter table public.turinpipps_preferences
  add constraint turinpipps_preference_limits check (
    min_sqm between 0 and 400 and (max_walk_minutes is null or max_walk_minutes between 5 and 180)
    and cardinality(preferred_zones) between 1 and 10
    and property_type in ('tutte','monolocale','bilocale','trilocale','quadrilocale')
  );
