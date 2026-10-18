-- Compte 13 (nouveau compte TTFL, formule Ambitieuse du Plan 30 jours) : les comptes acceptes passent de 01-12 a 01-14
-- (le 14 est reserve pour plus tard) et les plans 30 jours acceptent le compte 13.
-- Additif : on ELARGIT seulement des contraintes CHECK, aucune donnee n'est modifiee.

alter table public.ttfl_picks drop constraint if exists ttfl_picks_compte_format;
alter table public.ttfl_picks add constraint ttfl_picks_compte_format check (compte ~ '^(0[1-9]|1[0-4])$');

alter table public.ttfl_envois drop constraint if exists ttfl_envois_compte_check;
alter table public.ttfl_envois add constraint ttfl_envois_compte_check check (compte ~ '^(0[1-9]|1[0-4])$');

alter table public.ttfl_verrous_pick drop constraint if exists ttfl_verrous_pick_compte_check;
alter table public.ttfl_verrous_pick add constraint ttfl_verrous_pick_compte_check check (compte ~ '^(0[1-9]|1[0-4])$');

alter table public.ttfl_picks_auto drop constraint if exists ttfl_picks_auto_compte_check;
alter table public.ttfl_picks_auto add constraint ttfl_picks_auto_compte_check check (compte ~ '^(0[1-9]|1[0-4])$');

alter table public.ttfl_plan30 drop constraint if exists ttfl_plan30_compte_check;
alter table public.ttfl_plan30 add constraint ttfl_plan30_compte_check check (compte = any (array['01', '02', '13']));

alter table public.ttfl_plan30_archive drop constraint if exists ttfl_plan30_archive_compte_check;
alter table public.ttfl_plan30_archive add constraint ttfl_plan30_archive_compte_check check (compte = any (array['01', '02', '13']));

-- VERIFICATION
--   select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint
--   where contype = 'c' and pg_get_constraintdef(oid) ilike '%compte%';
-- RETOUR ARRIERE (seulement s'il n'existe aucune ligne pour les comptes 13 / 14)
--   remettre '^(0[1-9]|1[0-2])$' sur les quatre premieres tables et ('01', '02') sur les deux plans.
