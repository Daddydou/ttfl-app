-- Joueurs blessés (Out / Doubtful) par soirée, pour le sous-onglet « Blessés » de Vainqueurs. Additif, lecture seule.
--
--  ttfl_blesses : une ligne = un joueur Out ou Doubtful pour une soirée (date New York). Écrite par le moteur
--                 (pont/blesses.py, clé de service) à chaque passage « soir », « avance » et « controle ».
--                 source 'nba' = rapport officiel de la NBA ; 'espn' = secours quand le rapport officiel manque
--                 (Day-To-Day d'ESPN rangé en Doubtful, comme partout dans le moteur).
--                 L'application ne fait que lire : aucun effet sur les picks, le Plan 30 ni la synchro.
create table if not exists public.ttfl_blesses (
  game_date    date not null,
  joueur_norm  text not null,
  joueur       text not null,
  equipe_abbr  text,
  equipe       text,
  statut       text not null check (statut in ('Out', 'Doubtful')),
  statut_brut  text,
  motif        text,
  retour_prevu date,
  source       text not null check (source in ('nba', 'espn')),
  maj_le       timestamptz not null default now(),
  primary key (game_date, joueur_norm)
);
create index if not exists ttfl_blesses_date_equipe on public.ttfl_blesses (game_date, equipe_abbr);

alter table public.ttfl_blesses enable row level security;

drop policy if exists ttfl_blesses_proprietaire on public.ttfl_blesses;
create policy ttfl_blesses_proprietaire on public.ttfl_blesses for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

revoke all on public.ttfl_blesses from anon;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_blesses from authenticated;

-- VÉRIFICATION
--   select game_date, statut, count(*) from public.ttfl_blesses group by 1, 2 order by 1, 2;
-- RETOUR ARRIÈRE
--   drop table public.ttfl_blesses;
