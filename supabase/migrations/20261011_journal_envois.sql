-- Journal d'envoi : une ligne à chaque changement d'état d'un envoi (ttfl_envois). Additif, rien n'est modifié.
create table if not exists public.ttfl_envois_journal (
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  pick_date date not null,
  compte text not null,
  joueur text,
  statut text,
  message text,
  evenement text not null check (evenement in ('insert','update'))
);
create index if not exists ttfl_envois_journal_le_idx on public.ttfl_envois_journal (le desc);

create or replace function public.ttfl_envois_vers_journal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.statut is distinct from old.statut
     or new.joueur is distinct from old.joueur or new.message is distinct from old.message then
    insert into public.ttfl_envois_journal (pick_date, compte, joueur, statut, message, evenement)
    values (new.pick_date, new.compte, new.joueur, new.statut, new.message, lower(tg_op));
  end if;
  return new;
end $$;
revoke all on function public.ttfl_envois_vers_journal() from public, anon, authenticated;

drop trigger if exists ttfl_envois_journal_trg on public.ttfl_envois;
create trigger ttfl_envois_journal_trg after insert or update on public.ttfl_envois
for each row execute function public.ttfl_envois_vers_journal();

alter table public.ttfl_envois_journal enable row level security;
create policy ttfl_envois_journal_proprietaire on public.ttfl_envois_journal for select to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
revoke all on public.ttfl_envois_journal from anon;
revoke insert, update, delete, truncate, references, trigger on public.ttfl_envois_journal from authenticated;
