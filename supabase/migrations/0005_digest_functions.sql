-- =============================================================
-- Récapitulatif périodique des signalements.
--
-- Phase 1 (celle-ci) : le récapitulatif est calculé et STOCKÉ en base.
-- Aucun service externe requis, donc 100 % Supabase.
-- Phase 2 (plus tard) : l'envoi réel (Resend ou SMTP) lira `digest_runs`
-- et renseignera `sent_at`. La logique métier ne changera pas.
--
-- Périmètre : chaque utilisateur reçoit SES cas ; un admin obtient tous les cas.
-- =============================================================

create table if not exists public.digest_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  sent_at    timestamptz,          -- renseigné par la phase 2
  send_error text
);
create index if not exists digest_runs_user_idx
  on public.digest_runs (user_id, created_at desc);

alter table public.digest_runs enable row level security;

drop policy if exists "digests: lecture" on public.digest_runs;
create policy "digests: lecture" on public.digest_runs
  for select using (user_id = auth.uid() or public.is_admin());
-- Aucune policy d'écriture : seules les fonctions SECURITY DEFINER insèrent.

-- ---------- Construction du récapitulatif d'un utilisateur ----------
create or replace function public.build_user_digest(p_user uuid, p_days int default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_admin  boolean;
  v_since  timestamptz := now() - make_interval(days => p_days);
  v_result jsonb;
begin
  select (role = 'admin') into v_admin from public.profiles where id = p_user;
  v_admin := coalesce(v_admin, false);

  with scope as (
    select * from public.cases c
    where v_admin or c.created_by = p_user
  )
  select jsonb_build_object(
    'user_id', p_user,
    'perimetre', case when v_admin then 'tous les cas' else 'mes cas' end,
    'genere_le', now(),
    'fenetre_jours', p_days,
    'total', (select count(*) from scope),
    'par_etat', (
      select coalesce(jsonb_object_agg(s.etat, s.n), '{}'::jsonb)
      from (select status::text as etat, count(*) as n from scope group by status) s
    ),
    'nouveaux', (select count(*) from scope where created_at >= v_since),
    'clos_recemment', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'titre', title, 'etat', status, 'le', updated_at)
             order by updated_at desc), '[]'::jsonb)
      from scope
      where status in ('ferme', 'rejete') and updated_at >= v_since
    ),
    'a_traiter', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'titre', title, 'etat', status,
               'ouvert_depuis_jours', (extract(epoch from now() - created_at) / 86400)::int)
             order by created_at), '[]'::jsonb)
      from scope
      where status in ('ouvert', 'en_cours', 'bloque')
    ),
    'sans_activite', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'titre', title, 'etat', status,
               'inactif_depuis_jours', (extract(epoch from now() - updated_at) / 86400)::int)
             order by updated_at), '[]'::jsonb)
      from scope
      where status in ('ouvert', 'en_cours', 'bloque') and updated_at < v_since
    )
  ) into v_result;

  return v_result;
end;
$fn$;

-- ---------- Génération pour tous les utilisateurs ----------
create or replace function public.generate_digests(p_days int default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count int := 0;
  r record;
begin
  for r in select u.id, u.email from auth.users u where u.email is not null loop
    insert into public.digest_runs (user_id, email, payload)
    values (r.id, r.email, public.build_user_digest(r.id, p_days));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$fn$;

-- ---------- Cadence : une exécution sur deux (toutes les 2 semaines) ----------
create or replace function public.run_biweekly_digest()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Appelée chaque lundi par pg_cron, mais ne fait rien les semaines impaires.
  if (extract(week from now())::int % 2) <> 0 then
    return 0;
  end if;
  return public.generate_digests();
end;
$fn$;

-- Ces fonctions ne doivent pas être appelables depuis l'API cliente.
revoke execute on function public.build_user_digest(uuid, int) from public;
revoke execute on function public.generate_digests(int) from public;
revoke execute on function public.run_biweekly_digest() from public;
