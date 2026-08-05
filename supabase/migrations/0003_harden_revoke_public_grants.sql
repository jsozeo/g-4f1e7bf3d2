-- =============================================================
-- Durcissement, second passage.
--
-- La migration 0002 révoquait EXECUTE sur `anon` et `authenticated`, ce qui
-- était insuffisant : Postgres accorde EXECUTE au rôle `PUBLIC` par défaut
-- sur toute nouvelle fonction. Il faut donc révoquer sur PUBLIC.
--
-- Les triggers continuent de fonctionner : le privilège EXECUTE n'est vérifié
-- qu'à la création du trigger, pas à chaque exécution (vérifié par test).
-- =============================================================

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.enforce_case_update() from public;
revoke execute on function public.log_status_change() from public;

-- is_admin() est appelée par les policies RLS avec les droits de l'appelant :
-- elle doit rester exécutable par les utilisateurs connectés, et eux seuls.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- public.people (données personnelles préexistantes) ne doit être atteignable
-- que par service_role (n8n, scripts d'ingestion), jamais par l'API cliente.
revoke all on table public.people from anon, authenticated;
