-- Plan 30 jours des comptes de l'equipe (03 a 12) : decision du 2026-10-25.
-- Les plans 30 jours acceptaient seulement les comptes 01, 02 et 13 ; ils acceptent maintenant 01 a 13.
-- Additif : on ELARGIT seulement une contrainte CHECK, aucune donnee n'est modifiee. La politique RLS existante
-- (ttfl_plan30_proprietaire : lecture reservee au proprietaire) couvre deja les nouvelles lignes.

alter table public.ttfl_plan30 drop constraint if exists ttfl_plan30_compte_check;
alter table public.ttfl_plan30 add constraint ttfl_plan30_compte_check check (compte ~ '^(0[1-9]|1[0-3])$');

-- VERIFICATION
--   select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.ttfl_plan30'::regclass;
-- RETOUR ARRIERE (supprimer d'abord les plans d'equipe, sinon la contrainte est refusee)
--   delete from public.ttfl_plan30 where compte not in ('01', '02', '13');
--   alter table public.ttfl_plan30 drop constraint ttfl_plan30_compte_check;
--   alter table public.ttfl_plan30 add constraint ttfl_plan30_compte_check check (compte = any (array['01', '02', '13']));
