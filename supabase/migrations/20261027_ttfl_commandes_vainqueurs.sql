-- Onglet Vainqueurs : deux boutons Admin (vainqueurs_maj gratuit, vainqueurs_cotes = 1 crédit Odds API).
-- Déjà appliquée sur le projet (apply_migration « ttfl_commandes_vainqueurs »). Aucune table modifiée.
-- Elle remplace ttfl_commande_reveil() (copie de la version précédente + 2 aiguillages) et les libellés du journal.

create or replace function public.ttfl_commande_reveil()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pc timestamptz;
  v_reel boolean;
  v_tache text;
  v_date text;
  v_inputs jsonb;
  v_r text;
begin
  if new.statut <> 'en_attente' then return new; end if;
  v_reel := exists (select 1 from public.ttfl_cloud_reglage where id = 1 and mode = 'reel');

  if new.type in ('synchro_app', 'synchro_complet', 'cookies') then
    select maj_le into v_pc from public.ttfl_robot_etat where cle = 'commandes';
    if not v_reel and v_pc is not null and v_pc > now() - interval '3 minutes' then
      return new; -- PC en ligne : c'est lui qui la prend dans la minute
    end if;
    perform public.ttfl_github_dispatch('executeur-cloud.yml', '{"mode": "reel"}'::jsonb);
    return new;
  end if;

  if not v_reel then return new; end if; -- PC encore en charge : il traitera la demande

  v_tache := case new.type
    when 'push_soir' then 'soir'
    when 'plan30' then 'soir'
    when 'push_avance' then 'avance'
    when 'calendrier' then 'avance'
    when 'controle_2330' then 'controle'
    when 'archive_resultats' then 'matin'
    when 'capture_resultats' then 'resultats'
    when 'import_cotes' then 'cotes'
    when 'vainqueurs_maj' then 'vainqueurs_maj'
    when 'vainqueurs_cotes' then 'vainqueurs_cotes'
    else null end;

  if v_tache is null then
    update public.ttfl_commandes set statut = 'echec', fin_le = now(),
      resume = case when new.type in ('benchmarks', 'ombre')
        then 'Reste sur le PC : cette étude lit un historique de saisons que seul le PC possède (rallume-le pour la lancer).'
        else 'Pas encore disponible dans le cloud (le PC est au repos depuis la bascule).' end
    where id = new.id;
    return new;
  end if;

  v_inputs := jsonb_build_object('tache', v_tache, 'mode', 'reel');
  v_date := new.params ->> 'date';
  if v_tache in ('resultats', 'cotes') and v_date ~ '^\d{4}-\d{2}-\d{2}$' then
    v_inputs := v_inputs || jsonb_build_object('date', v_date);
  end if;
  v_r := public.ttfl_github_dispatch('moteur-cloud.yml', v_inputs);
  update public.ttfl_commandes set statut = 'ok', debut_le = now(), fin_le = now(),
    resume = 'Lancée dans le cloud (tâche « ' || v_tache || ' », environ 3 à 5 min) — ' || v_r
  where id = new.id;
  return new;
exception when others then
  return new; -- jamais bloquer la demande de l'application
end $function$;

revoke all on function public.ttfl_commande_reveil() from public, anon, authenticated;

create or replace function public.ttfl_journal_libelle(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case p_type
    when 'push_soir' then 'Recalculer ce soir'
    when 'push_avance' then 'Recalculer les prochaines soirées'
    when 'plan30' then 'Recalculer le plan 30 jours'
    when 'benchmarks' then 'Mettre à jour les repères'
    when 'capture_resultats' then 'Capturer les scores réels'
    when 'archive_resultats' then 'Archiver les résultats'
    when 'calendrier' then 'Mettre à jour le calendrier TTFL'
    when 'import_cotes' then 'Importer les cotes de paris'
    when 'vainqueurs_maj' then 'Mettre à jour les vainqueurs'
    when 'vainqueurs_cotes' then 'Relever les cotes des vainqueurs'
    when 'synchro_app' then 'Envoyer mes picks sur le site TTFL'
    when 'synchro_complet' then 'Synchronisation complète (2 sens)'
    when 'cookies' then 'Vérifier les 13 connexions TTFL'
    when 'controle_2330' then 'Lancer le contrôle de 23 h 30'
    when 'ombre' then 'Suivi du match-up 0,6'
    else p_type end $function$;

create or replace function public.ttfl_journal_effet(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case p_type
    when 'push_soir' then 'Met à jour les projections du soir, les conseillés et les plans.'
    when 'push_avance' then 'Met à jour les projections des prochaines soirées et les plans.'
    when 'plan30' then 'Recalcule le plan 30 jours des comptes 01, 02 et 13.'
    when 'benchmarks' then 'Met à jour « Moi vs les repères mobiles » du tableau de bord.'
    when 'capture_resultats' then 'Renseigne les scores réels du Top 10 de la soirée.'
    when 'archive_resultats' then 'Enregistre les scores réels pour l''étude des blessures.'
    when 'calendrier' then 'Relit les soirées des 30 prochains jours sur le site TTFL.'
    when 'import_cotes' then 'Consomme du quota The Odds API.'
    when 'vainqueurs_maj' then 'Complète le calendrier NBA et enregistre les vainqueurs réels (gratuit).'
    when 'vainqueurs_cotes' then 'Consomme 1 crédit The Odds API.'
    when 'synchro_app' then 'Envoie sur le site TTFL les picks validés dans l''application.'
    when 'synchro_complet' then 'Envoie les picks vers le site et remonte ceux posés sur le site.'
    when 'cookies' then 'Vérifie que les 13 comptes sont toujours connectés.'
    when 'controle_2330' then 'Vérifie les blessures et remplace les picks incertains si besoin.'
    when 'ombre' then 'Compare la formule actuelle et le match-up à 0,6.'
    else null end $function$;
