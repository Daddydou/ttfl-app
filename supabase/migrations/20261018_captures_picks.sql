-- Captures d'écran des picks (demande du 2026-10-18).
-- Le robot du PC (ttfl-auto, connecté avec ton compte) prend une capture de la CASE du pick sur le site TTFL après chaque
-- pose / remplacement et la dépose dans un dossier privé ; l'application l'affiche sous le pick. La capture est supprimée
-- (fichier + ligne) dès que la soirée est passée. Additif : aucune table existante n'est modifiée.
--   joueur      : le joueur visible sur la capture (une capture ne vaut que pour ce joueur)
--   chemin      : chemin du fichier dans le dossier privé « captures-picks »
--   capture_le  : heure de la capture
create table if not exists public.ttfl_captures (
  mode       text not null default 'regular',
  pick_date  date not null,
  compte     text not null check (compte ~ '^(0[1-9]|1[0-4])$'),
  joueur     text not null,
  chemin     text not null,
  capture_le timestamptz not null default now(),
  octets     integer,
  primary key (mode, pick_date, compte)
);

alter table public.ttfl_captures enable row level security;
drop policy if exists ttfl_captures_proprietaire on public.ttfl_captures;
create policy ttfl_captures_proprietaire on public.ttfl_captures for all to authenticated
  using ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid)
  with check ((select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
revoke all on public.ttfl_captures from anon;

-- Dossier privé (pas d'URL publique) : images seulement, 1 Mo au plus par fichier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('captures-picks', 'captures-picks', false, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

drop policy if exists captures_picks_lecture on storage.objects;
create policy captures_picks_lecture on storage.objects for select to authenticated
  using (bucket_id = 'captures-picks' and (select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
drop policy if exists captures_picks_ecriture on storage.objects;
create policy captures_picks_ecriture on storage.objects for insert to authenticated
  with check (bucket_id = 'captures-picks' and (select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
drop policy if exists captures_picks_maj on storage.objects;
create policy captures_picks_maj on storage.objects for update to authenticated
  using (bucket_id = 'captures-picks' and (select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid)
  with check (bucket_id = 'captures-picks' and (select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);
drop policy if exists captures_picks_suppression on storage.objects;
create policy captures_picks_suppression on storage.objects for delete to authenticated
  using (bucket_id = 'captures-picks' and (select auth.uid()) = 'fd0b91ef-3a4e-4c0c-8c62-3cb235d77901'::uuid);

-- VÉRIFICATION
--   select * from public.ttfl_captures;
--   select id, public from storage.buckets where id = 'captures-picks';
-- RETOUR ARRIÈRE
--   drop table public.ttfl_captures;
--   delete from storage.objects where bucket_id = 'captures-picks'; delete from storage.buckets where id = 'captures-picks';
--   drop policy captures_picks_lecture on storage.objects; (idem ecriture, maj, suppression)
