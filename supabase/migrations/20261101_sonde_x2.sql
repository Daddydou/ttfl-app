-- Action Admin « sonde_x2 » (relevé en LECTURE SEULE du fonctionnement du x2 sur le site TTFL).
-- NON APPLIQUÉE : attend l'accord de l'utilisateur. Elle remplace ttfl_commande_reveil() (copie de la version du
-- 2026-10-27 avec une seule différence : 'sonde_x2' rejoint les actions exécutées par l'exécuteur cloud) et ajoute le
-- libellé du journal. Aucune table modifiée.

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

  if new.type in ('synchro_app', 'synchro_complet', 'cookies', 'sonde_x2') then
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
