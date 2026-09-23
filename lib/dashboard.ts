// Petits calculs de PRÉSENTATION pour le Tableau de bord — jamais de scoring
// ni de projection ici, seulement des soustractions de dates et des comptages
// à partir de ce que le moteur a déjà écrit dans Supabase.
import type { TtflPick } from "./types";

const CYCLE_DAYS = 30;

export interface CycleBlockedPlayer {
  player: string;
  pickDate: string;
  freeOn: string; // YYYY-MM-DD, date à laquelle le joueur redevient pickable
  daysLeft: number; // >= 1
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

// Joueurs encore bloqués par le cycle 30 jours, triés par date de
// déblocage la plus proche. `picks` : tous les picks saison régulière (peu
// importe qu'ils soient scorés — le blocage porte sur la DATE du pick, pas
// sur le résultat).
export function cycleBlocked(
  picks: TtflPick[],
  today: string,
  cycleDays = CYCLE_DAYS,
): CycleBlockedPlayer[] {
  const out: CycleBlockedPlayer[] = [];
  for (const p of picks) {
    const freeOn = addDays(p.pick_date, cycleDays);
    const daysLeft = daysBetween(today, freeOn);
    if (daysLeft > 0) {
      out.push({ player: p.player, pickDate: p.pick_date, freeOn, daysLeft });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
