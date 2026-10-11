-- Sauvegarde nocturne : instantané JSON de ttfl_picks et ttfl_envois, 30 jours de rétention (pg_cron, 03:15 UTC).
create table if not exists public.ttfl_sauvegardes (
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  jour date not null default current_date,
  nom_table text not null,
  n_lignes integer not null,
  lignes jsonb not null,
  unique (jour, nom_table)
);

create or replace function public.ttfl_sauvegarder() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ttfl_sauvegardes (nom_table, n_lignes, lignes)
  select 'ttfl_picks', count(*), coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.ttfl_picks t
  on conflict (jour, nom_table) do update set le = now(), n_lignes = excluded.n_lignes, lignes = excluded.lignes;
  insert into public.ttfl_sauvegardes (nom_table, n_lignes, lignes)
  select 'ttfl_envois', count(*), coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.ttfl_envois t
  on conflict (jour, nom_table) do update set le = now(), n_lignes = excluded.n_lignes, lignes = excluded.lignes;
  delete from public.ttfl_sauvegardes where jour < current_date - 30;
end $$;
revoke all on function public.ttfl_sauvegarder() from public, anon, authenticated;

alter table public.ttfl_sauvegardes enable row level security;
create policy ttfl_sauvegardes_proprietaire on public.ttfl_sauvegardes for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
revoke all on public.ttfl_sauvegardes from anon;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_sauvegardes from authenticated;

select cron.schedule('ttfl-sauvegarde-nocturne', '15 3 * * *', 'select public.ttfl_sauvegarder()');
