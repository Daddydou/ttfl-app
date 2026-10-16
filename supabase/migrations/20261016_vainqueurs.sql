-- Jeu « vainqueur de chaque match » : cotes de victoire (The Odds API, marché h2h), choix, historique. Additif.
--
--  ttfl_vainqueurs_matchs      : un match NBA = une ligne. Probabilité de victoire de l'équipe à domicile (médiane des
--                                bookmakers, marge retirée), favori, drapeau « serré ». Écrit par le moteur (clé de service).
--  ttfl_vainqueurs_historique  : chaque relevé de cotes, pour mesurer plus tard ce que valent les mises à jour.
--  ttfl_vainqueurs_releves     : journal des appels payants à The Odds API (crédits restants, raison) : plafond quotidien.
--  ttfl_vainqueurs_choix       : le choix du jeu pour chaque match. 'auto' = le favori (écrit par le moteur) ;
--                                'manuel' = posé à la main dans l'application, jamais écrasé par le moteur.
--                                envoye_le / envoye_choix : réservés à l'envoi futur vers l'application de Thomas.
-- 'dom' = équipe à domicile, 'ext' = équipe à l'extérieur.
create table if not exists public.ttfl_vainqueurs_matchs (
  event_id         text primary key,
  sport_key        text not null,
  game_date        date not null,
  commence_time    timestamptz not null,
  equipe_dom       text not null,
  equipe_ext       text not null,
  abbr_dom         text,
  abbr_ext         text,
  prob_dom         numeric,
  cote_dom         numeric,
  cote_ext         numeric,
  nb_books         int,
  favori           text check (favori in ('dom', 'ext')),
  serre            boolean not null default false,
  stars_indispos   jsonb not null default '[]'::jsonb,
  releve_le        timestamptz,
  a_reconfirmer_apres timestamptz,
  resultat         text check (resultat in ('dom', 'ext'))
);
create index if not exists ttfl_vainqueurs_matchs_date on public.ttfl_vainqueurs_matchs (game_date);

create table if not exists public.ttfl_vainqueurs_historique (
  id             bigint generated always as identity primary key,
  event_id       text not null,
  releve_le      timestamptz not null default now(),
  raison         text not null,
  prob_dom       numeric,
  cote_dom       numeric,
  cote_ext       numeric,
  nb_books       int,
  stars_indispos jsonb not null default '[]'::jsonb
);
create index if not exists ttfl_vainqueurs_historique_event on public.ttfl_vainqueurs_historique (event_id, releve_le);

create table if not exists public.ttfl_vainqueurs_releves (
  id               bigint generated always as identity primary key,
  releve_le        timestamptz not null default now(),
  game_date        date not null,
  raison           text not null,
  detail           text,
  nb_matchs        int,
  credits_restants int
);

create table if not exists public.ttfl_vainqueurs_choix (
  event_id     text primary key references public.ttfl_vainqueurs_matchs (event_id) on delete cascade,
  choix        text not null check (choix in ('dom', 'ext')),
  source       text not null check (source in ('auto', 'manuel')),
  maj_le       timestamptz not null default now(),
  envoye_le    timestamptz,
  envoye_choix text check (envoye_choix in ('dom', 'ext'))
);

alter table public.ttfl_vainqueurs_matchs enable row level security;
alter table public.ttfl_vainqueurs_historique enable row level security;
alter table public.ttfl_vainqueurs_releves enable row level security;
alter table public.ttfl_vainqueurs_choix enable row level security;

-- Lecture réservée au propriétaire ; seul le choix se modifie depuis l'application (action serveur, session du propriétaire).
drop policy if exists ttfl_vainqueurs_matchs_proprietaire on public.ttfl_vainqueurs_matchs;
create policy ttfl_vainqueurs_matchs_proprietaire on public.ttfl_vainqueurs_matchs for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

drop policy if exists ttfl_vainqueurs_historique_proprietaire on public.ttfl_vainqueurs_historique;
create policy ttfl_vainqueurs_historique_proprietaire on public.ttfl_vainqueurs_historique for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

drop policy if exists ttfl_vainqueurs_releves_proprietaire on public.ttfl_vainqueurs_releves;
create policy ttfl_vainqueurs_releves_proprietaire on public.ttfl_vainqueurs_releves for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

drop policy if exists ttfl_vainqueurs_choix_proprietaire on public.ttfl_vainqueurs_choix;
create policy ttfl_vainqueurs_choix_proprietaire on public.ttfl_vainqueurs_choix for all to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid)
  with check ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

revoke all on public.ttfl_vainqueurs_matchs, public.ttfl_vainqueurs_historique, public.ttfl_vainqueurs_releves,
  public.ttfl_vainqueurs_choix from anon;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_vainqueurs_matchs from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_vainqueurs_historique from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_vainqueurs_releves from authenticated;
revoke truncate, references, trigger on public.ttfl_vainqueurs_choix from authenticated;

-- VÉRIFICATION
--   select game_date, count(*), min(commence_time) from public.ttfl_vainqueurs_matchs group by 1 order by 1;
--   select * from public.ttfl_vainqueurs_releves order by releve_le desc limit 10;
-- RETOUR ARRIÈRE
--   drop table public.ttfl_vainqueurs_choix, public.ttfl_vainqueurs_historique, public.ttfl_vainqueurs_releves, public.ttfl_vainqueurs_matchs;
