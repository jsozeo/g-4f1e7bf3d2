-- =============================================================
-- Planification du récapitulatif via pg_cron.
--
-- pg_cron ne sait pas exprimer « toutes les 2 semaines » nativement :
-- on déclenche donc chaque lundi, et `run_biweekly_digest()` ne fait rien
-- les semaines ISO impaires. Résultat : une exécution tous les 14 jours.
-- =============================================================

create extension if not exists pg_cron;

-- Idempotence : retirer une planification homonyme avant de la recréer.
select cron.unschedule('digest-quinzaine')
where exists (select 1 from cron.job where jobname = 'digest-quinzaine');

-- Lundi 06:00 UTC = 08:00 à Paris en été, 07:00 en hiver.
select cron.schedule(
  'digest-quinzaine',
  '0 6 * * 1',
  $job$select public.run_biweekly_digest();$job$
);
