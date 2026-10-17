-- Pronos « vainqueur de chaque match » tels qu'enregistrés chez Thomas (API Pronos NBA de Game Tracker).
-- Écrit par le PC (clé de service) à chaque passage de « TTFL vainqueurs » ; lu par l'onglet Vainqueurs.
-- Additif : aucune table existante n'est modifiée.
create table if not exists public.ttfl_vainqueurs_kt (
  event_id text primary key,
  cote text check (cote in ('dom', 'ext')),   -- équipe pronostiquée chez Thomas (null = rien de posé)
  equipe text,                                -- code équipe renvoyé par l'API (information)
  statut text,                                -- a_venir / en_cours / termine / reporte
  maj_le timestamptz not null default now()
);

alter table public.ttfl_vainqueurs_kt enable row level security;

drop policy if exists ttfl_vainqueurs_kt_proprietaire on public.ttfl_vainqueurs_kt;
create policy ttfl_vainqueurs_kt_proprietaire on public.ttfl_vainqueurs_kt
  for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
