// Types du schéma Supabase de la partie 1 (tables ttfl_*).
// On ne redéfinit ici que ce que le front lit ou écrit.

export type Mode = "regular" | "playoffs";

export type PlayerStatus =
  | "Available"
  | "Questionable"
  | "Doubtful"
  | "Probable"
  | "Out"
  | "OUT";

export interface TtflRun {
  id: number;
  computed_at: string; // timestamptz ISO
  mode: Mode;
  game_date: string; // date YYYY-MM-DD
  injury_report_fresh: boolean;
  n_candidates: number;
  note: string | null;
}

export interface TtflProjection {
  id: number;
  run_id: number;
  rank: number;
  player: string;
  team: string | null;
  opponent: string | null;
  position: string | null;
  projection: number | null;
  forme: number | null;
  ceiling: number | null;
  matchup_factor: number | null;
  status: PlayerStatus | null;
  is_pick: boolean;
  is_urgent: boolean;
  series_state: string | null; // playoffs "2-3"
  expected_nights_left: number | null;
  explanation: string | null;
}

// Vue ttfl_latest_projections = projection + colonnes du run.
export interface TtflLatestProjection extends TtflProjection {
  mode: Mode;
  game_date: string;
  computed_at: string;
  injury_report_fresh: boolean;
}

export interface TtflPick {
  id: number;
  mode: Mode;
  pick_date: string;
  player: string;
  score: number | null;
  created_at: string;
}

export interface TtflManualAbsent {
  id: number;
  player: string;
  date_debut: string;
  date_fin: string | null;
  raison: string | null;
  created_at: string;
}

export interface TtflSeasonStats {
  mode: Mode;
  total: number;
  n_picks: number;
  avg: number | null;
  best_pick: string | null;
  best_score: number | null;
  worst_pick: string | null;
  worst_score: number | null;
  updated_at: string;
}
