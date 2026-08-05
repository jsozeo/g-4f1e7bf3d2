-- =============================================================
-- Case management — schéma initial (Supabase / Postgres)
-- Résidence Messery : signalement de dysfonctionnements.
-- À exécuter dans Supabase Studio > SQL Editor (ou via CLI).
-- =============================================================

-- ---------- Types ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type public.case_status as enum ('ouvert', 'en_cours', 'ferme', 'rejete');
  end if;
end$$;

-- ---------- Table profiles ----------
-- Un profil par utilisateur Auth. 'role' porte les droits.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- ---------- Table cases (les signalements) ----------
create table if not exists public.cases (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  location    text,
  status      public.case_status not null default 'ouvert',
  photo_path  text,                       -- chemin dans le bucket Storage 'case-photos'
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cases_created_by_idx on public.cases (created_by);
create index if not exists cases_status_idx on public.cases (status);

-- ---------- Table case_events (historique / commentaires) ----------
create table if not exists public.case_events (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  author     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type       text not null default 'comment' check (type in ('comment', 'status_change')),
  body       text,
  created_at timestamptz not null default now()
);
create index if not exists case_events_case_idx on public.case_events (case_id);

-- =============================================================
-- Fonctions utilitaires (SECURITY DEFINER pour éviter la
-- récursion RLS lors de la lecture du rôle).
-- =============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Le statut ne peut être modifié que par un admin ; maj de updated_at
create or replace function public.enforce_case_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status) and not public.is_admin() then
    raise exception 'Seuls les administrateurs peuvent changer le statut du cas.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cases_before_update on public.cases;
create trigger trg_cases_before_update
  before update on public.cases
  for each row execute function public.enforce_case_update();

-- Journalise automatiquement les changements de statut
create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status) then
    insert into public.case_events (case_id, author, type, body)
    values (new.id, auth.uid(), 'status_change',
            format('Statut : %s → %s', old.status, new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cases_after_update on public.cases;
create trigger trg_cases_after_update
  after update on public.cases
  for each row execute function public.log_status_change();

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles    enable row level security;
alter table public.cases       enable row level security;
alter table public.case_events enable row level security;

-- ----- profiles -----
drop policy if exists "profiles: lecture" on public.profiles;
create policy "profiles: lecture" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: maj self (hors role)" on public.profiles;
create policy "profiles: maj self (hors role)" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'user');  -- un user ne peut pas s'auto-promouvoir

drop policy if exists "profiles: admin tout" on public.profiles;
create policy "profiles: admin tout" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- cases -----
drop policy if exists "cases: lecture (proprietaire ou admin)" on public.cases;
create policy "cases: lecture (proprietaire ou admin)" on public.cases
  for select using (created_by = auth.uid() or public.is_admin());

drop policy if exists "cases: creation (connecte)" on public.cases;
create policy "cases: creation (connecte)" on public.cases
  for insert with check (created_by = auth.uid());

drop policy if exists "cases: maj (proprietaire ou admin)" on public.cases;
create policy "cases: maj (proprietaire ou admin)" on public.cases
  for update using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
  -- NB : le changement de statut est bloqué pour les non-admins par le trigger.

drop policy if exists "cases: suppression (admin)" on public.cases;
create policy "cases: suppression (admin)" on public.cases
  for delete using (public.is_admin());

-- ----- case_events -----
drop policy if exists "events: lecture (via cas visible)" on public.case_events;
create policy "events: lecture (via cas visible)" on public.case_events
  for select using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and (c.created_by = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "events: ajout (via cas visible)" on public.case_events;
create policy "events: ajout (via cas visible)" on public.case_events
  for insert with check (
    author = auth.uid() and exists (
      select 1 from public.cases c
      where c.id = case_id and (c.created_by = auth.uid() or public.is_admin())
    )
  );

-- =============================================================
-- Storage : bucket privé pour les photos des signalements
-- =============================================================
insert into storage.buckets (id, name, public)
values ('case-photos', 'case-photos', false)
on conflict (id) do nothing;

drop policy if exists "photos: upload (connecte)" on storage.objects;
create policy "photos: upload (connecte)" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'case-photos');

drop policy if exists "photos: lecture (connecte)" on storage.objects;
create policy "photos: lecture (connecte)" on storage.objects
  for select to authenticated
  using (bucket_id = 'case-photos');

-- =============================================================
-- APRÈS la 1re connexion, te promouvoir admin (remplace l'email) :
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'toi@exemple.com');
-- =============================================================
