-- Historique récent du joueur (5 derniers matchs, moyennes, repères) pour l'écran « Détail » : affichage seul.
-- Déjà appliquée sur le projet (apply_migration « ttfl_projections_historique »). Colonne vide pour l'existant.
alter table public.ttfl_projections add column if not exists historique jsonb;

create or replace view public.ttfl_latest_projections as
 SELECT p.id,
    p.run_id,
    p.rank,
    p.player,
    p.team,
    p.opponent,
    p."position",
    p.projection,
    p.forme,
    p.ceiling,
    p.matchup_factor,
    p.status,
    p.is_pick,
    p.is_urgent,
    p.series_state,
    p.expected_nights_left,
    p.explanation,
    r.mode,
    r.game_date,
    r.computed_at,
    r.injury_report_fresh,
    p.historique
   FROM (ttfl_projections p
     JOIN ttfl_latest_run r ON ((r.id = p.run_id)));
