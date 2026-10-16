-- Plan glissant de 30 jours (comptes 01 et 02) : calculé sur le PC par le moteur (ttfl/pont/push_plan30.py, clé de service),
-- lu par l'écran « Picks conseillés » de l'application. Additif : aucune table existante n'est modifiée.
--   compte, profil : une ligne par compte et par formule (profil) — l'écran bascule d'une formule à l'autre sans recalcul.
--   debut          : première soirée du plan (le 20/10/2026 tant que la saison n'a pas commencé, puis la soirée du jour).
--   reference      : date des données (aujourd'hui) ; calcule_le : heure du dernier calcul.
--   reglages       : les poids du profil, tels qu'utilisés (affichés et archivés).
--   jours          : tableau JSON de 30 soirées {date, statut, joueur, equipe, adversaire, position, projection, nb_matchs, alternatives[]}.
-- Même règle d'accès que le journal d'envois : lecture réservée au propriétaire, aucune écriture depuis l'application.
create table if not exists public.ttfl_plan30 (
  compte           text not null check (compte in ('01', '02')),
  profil           text not null,
  debut            date not null,
  reference        date not null,
  calcule_le       timestamptz not null default now(),
  total_projection numeric,
  reglages         jsonb not null default '{}'::jsonb,
  jours            jsonb not null,
  primary key (compte, profil)
);

alter table public.ttfl_plan30 enable row level security;
drop policy if exists ttfl_plan30_proprietaire on public.ttfl_plan30;
create policy ttfl_plan30_proprietaire on public.ttfl_plan30 for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
revoke all on public.ttfl_plan30 from anon;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_plan30 from authenticated;

-- VÉRIFICATION
--   select compte, profil, debut, calcule_le, jsonb_array_length(jours) from public.ttfl_plan30;
-- RETOUR ARRIÈRE
--   drop table public.ttfl_plan30;
