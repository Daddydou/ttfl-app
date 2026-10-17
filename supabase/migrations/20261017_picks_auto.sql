-- Picks « auto » : pose automatique du robot, PAS validée par l'utilisateur. Additif (rien d'existant modifié).
--
--  ttfl_picks_auto : une ligne par (mode, soirée, compte) quand le robot a posé lui-même le joueur
--                    - controle_vide        : case vide remplie par le contrôle de 23h30
--                    - controle_remplacement: joueur Out / Doubtful / absent remplacé par le contrôle de 23h30
--                    - equipe_auto          : pick posé par l'automatisme des comptes 03 à 12
--                    L'application affiche « Auto » tant que le joueur du pick est celui de la marque (si l'utilisateur
--                    change de joueur, la marque ne correspond plus et n'est plus affichée).
--                    Écrit par le robot / le moteur (connecté en tant que propriétaire), lu par l'application.
create table if not exists public.ttfl_picks_auto (
  mode      text not null default 'regular',
  pick_date date not null,
  compte    text not null check (compte ~ '^(0[1-9]|1[0-2])$'),
  player    text not null,
  origine   text not null check (origine in ('controle_vide', 'controle_remplacement', 'equipe_auto')),
  cree_le   timestamptz not null default now(),
  primary key (mode, pick_date, compte)
);

alter table public.ttfl_picks_auto enable row level security;

drop policy if exists ttfl_picks_auto_proprietaire on public.ttfl_picks_auto;
create policy ttfl_picks_auto_proprietaire on public.ttfl_picks_auto for all to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid)
  with check ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

revoke all on public.ttfl_picks_auto from anon;
revoke truncate, references, trigger on public.ttfl_picks_auto from authenticated;

-- VÉRIFICATION
--   select * from public.ttfl_picks_auto order by pick_date desc, compte;
-- RETOUR ARRIÈRE
--   drop table public.ttfl_picks_auto;
