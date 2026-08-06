-- =============================================================
-- Signalements sans comptes : noms en texte libre + accès anon.
-- =============================================================

-- Qui a créé le ticket / qui a changé le statut (texte libre familial).
alter table public.cases
  add column if not exists reporter_name text,
  add column if not exists status_changed_by text;

-- created_by n'est plus obligatoire (plus d'auth users pour les fiches).
alter table public.cases alter column created_by drop not null;
alter table public.cases alter column created_by drop default;

-- Historique : auteur en texte libre.
alter table public.case_events
  add column if not exists author_name text;

alter table public.case_events alter column author drop not null;
alter table public.case_events alter column author drop default;

-- Plus de restriction « admin only » sur le statut : toute personne
-- ayant le mot de passe du site peut le changer (le nom est journalisé).
create or replace function public.enforce_case_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Journaliser les changements de statut (sans auth.uid).
create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status) then
    insert into public.case_events (case_id, author, author_name, type, body)
    values (
      new.id,
      null,
      coalesce(nullif(trim(new.status_changed_by), ''), 'inconnu'),
      'status_change',
      format('Statut : %s → %s (par %s)', old.status, new.status,
             coalesce(nullif(trim(new.status_changed_by), ''), 'inconnu'))
    );
  end if;
  return new;
end;
$$;

-- RLS ouverte à l'anon key : le vrai verrou est le mot de passe du site
-- (obscurité familiale). Suffisant pour cet usage.
drop policy if exists "cases: lecture (proprietaire ou admin)" on public.cases;
drop policy if exists "cases: creation (connecte)" on public.cases;
drop policy if exists "cases: maj (proprietaire ou admin)" on public.cases;
drop policy if exists "cases: suppression (admin)" on public.cases;

create policy "cases: lecture publique" on public.cases
  for select using (true);
create policy "cases: creation publique" on public.cases
  for insert with check (true);
create policy "cases: maj publique" on public.cases
  for update using (true) with check (true);
create policy "cases: suppression publique" on public.cases
  for delete using (true);

drop policy if exists "events: lecture (via cas visible)" on public.case_events;
drop policy if exists "events: ajout (via cas visible)" on public.case_events;

create policy "events: lecture publique" on public.case_events
  for select using (true);
create policy "events: ajout public" on public.case_events
  for insert with check (true);

-- Photos : upload / lecture pour anon (bucket toujours non public).
drop policy if exists "photos: upload (connecte)" on storage.objects;
drop policy if exists "photos: lecture (connecte)" on storage.objects;

create policy "photos: upload anon" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'case-photos');

create policy "photos: lecture anon" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'case-photos');
