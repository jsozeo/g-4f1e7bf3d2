-- =============================================================
-- Durcissement de sécurité (suite à l'audit `get_advisors`).
-- =============================================================

-- 1) CRITIQUE — la table public.people (données personnelles préexistantes)
--    n'avait pas de RLS : elle était lisible par quiconque disposait de la
--    clé anon, désormais publiée dans le dépôt public via app/supabase-config.js.
--    Activer RLS sans policy coupe tout accès via l'API REST/GraphQL.
--    Les accès en service_role (n8n, scripts d'ingestion) ne sont pas affectés.
alter table public.people enable row level security;

-- 2) Les fonctions de trigger ne doivent pas être appelables en RPC.
--    Révoquer EXECUTE ne casse pas les triggers : ceux-ci s'exécutent
--    sous l'identité du propriétaire de la table, pas de l'appelant.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.enforce_case_update() from anon, authenticated;
revoke execute on function public.log_status_change() from anon, authenticated;

-- 3) is_admin() reste exécutable par « authenticated » : les policies RLS
--    l'évaluent avec les droits de l'appelant. On la retire à « anon ».
revoke execute on function public.is_admin() from anon;
