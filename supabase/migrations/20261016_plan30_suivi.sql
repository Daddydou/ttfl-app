-- Plan 30 jours : verrou « pick manuel validé », archive des plans et suivi des formules. Additif (rien d'existant modifié).
--
--  ttfl_verrous_pick   : « pick manuel validé » du compte 02 — tant que le joueur posé ce soir-là est celui du verrou,
--                        ni le pick automatique ni le contrôle de 23h30 ne le remplacent (le contrôle alerte seulement).
--                        Écrit par l'application (propriétaire), lu par le moteur (clé de service).
--  ttfl_plan30_archive : le plan complet de 30 jours de chaque compte et de chaque formule, pour chaque jour (le dernier
--                        calcul avant le verrouillage de la soirée l'emporte). Écrit par le moteur seulement.
--  ttfl_plan30_suivi   : comptes VIRTUELS, un par formule (+ une base « glouton » = meilleure projection du soir) : chaque
--                        jour la formule joue son n°1 avec son propre cycle de 30 jours ; le score TTFL réel est rempli le
--                        lendemain. C'est ce qui permet de comparer les formules sur la durée. Écrit par le moteur seulement.
create table if not exists public.ttfl_verrous_pick (
  compte    text not null check (compte ~ '^(0[1-9]|1[0-2])$'),
  pick_date date not null,
  joueur    text not null,
  cree_le   timestamptz not null default now(),
  primary key (compte, pick_date)
);

create table if not exists public.ttfl_plan30_archive (
  jour             date not null,
  compte           text not null check (compte in ('01', '02')),
  profil           text not null,
  calcule_le       timestamptz not null default now(),
  total_projection numeric,
  jours            jsonb not null,
  primary key (jour, compte, profil)
);

create table if not exists public.ttfl_plan30_suivi (
  profil       text not null,
  pick_date    date not null,
  joueur       text not null,
  equipe       text,
  adversaire   text,
  projection   numeric,
  alternatives jsonb not null default '[]'::jsonb,
  calcule_le   timestamptz not null default now(),
  score_reel   numeric,
  primary key (profil, pick_date)
);

alter table public.ttfl_verrous_pick enable row level security;
alter table public.ttfl_plan30_archive enable row level security;
alter table public.ttfl_plan30_suivi enable row level security;

drop policy if exists ttfl_verrous_pick_proprietaire on public.ttfl_verrous_pick;
create policy ttfl_verrous_pick_proprietaire on public.ttfl_verrous_pick for all to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid)
  with check ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

drop policy if exists ttfl_plan30_archive_proprietaire on public.ttfl_plan30_archive;
create policy ttfl_plan30_archive_proprietaire on public.ttfl_plan30_archive for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

drop policy if exists ttfl_plan30_suivi_proprietaire on public.ttfl_plan30_suivi;
create policy ttfl_plan30_suivi_proprietaire on public.ttfl_plan30_suivi for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

revoke all on public.ttfl_verrous_pick, public.ttfl_plan30_archive, public.ttfl_plan30_suivi from anon;
revoke truncate, references, trigger on public.ttfl_verrous_pick from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_plan30_archive from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_plan30_suivi from authenticated;

-- VÉRIFICATION
--   select * from public.ttfl_verrous_pick;
--   select profil, count(*), sum(score_reel) from public.ttfl_plan30_suivi group by profil;
-- RETOUR ARRIÈRE
--   drop table public.ttfl_verrous_pick, public.ttfl_plan30_archive, public.ttfl_plan30_suivi;
