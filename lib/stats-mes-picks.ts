// Statistiques de MON compte (01) : logique PURE, testée dans tests/stats-equipe.test.ts.
// Les distributions et la courbe de cumul de la page d'origine restent dans lib/stats.ts.

import { picksJoues, type ScorePick } from "@/lib/stats-equipe";
import { JOURS_COURTS, grouper, jourSemaine, moyenne } from "@/lib/stats-outils";

export const SEUIL_SERIE = 30; // une « série » = des picks consécutifs à 30 points ou plus

export interface Series {
  meilleure: number;
  enCours: number;
}

export function series(picks: ScorePick[], seuil = SEUIL_SERIE): Series {
  const tries = picksJoues(picks).sort((a, b) => a.pick_date.localeCompare(b.pick_date));
  let meilleure = 0;
  let courante = 0;
  for (const p of tries) {
    courante = p.score >= seuil ? courante + 1 : 0;
    meilleure = Math.max(meilleure, courante);
  }
  return { meilleure, enCours: courante };
}

export interface JourSemaine {
  jour: string;
  n: number;
  moyenne: number | null;
}

// Moyenne par jour de la semaine (jour de la soirée NBA, à New York). Les 7 jours sont toujours présents.
export function parJourSemaine(picks: ScorePick[]): JourSemaine[] {
  const groupes = grouper(picksJoues(picks), (p) => String(jourSemaine(p.pick_date)));
  return JOURS_COURTS.map((jour, i) => {
    const ps = groupes.get(String(i)) ?? [];
    return { jour, n: ps.length, moyenne: moyenne(ps.map((p) => p.score)) };
  });
}

export interface Forme {
  recent: number | null; // moyenne des `n` derniers picks
  saison: number | null;
  ecart: number | null;
  n: number;
}

// Mes `n` derniers picks comparés à toute la saison.
export function formeRecente(picks: ScorePick[], n = 7): Forme {
  const tries = picksJoues(picks).sort((a, b) => a.pick_date.localeCompare(b.pick_date));
  const derniers = tries.slice(-n);
  const recent = moyenne(derniers.map((p) => p.score));
  const saison = moyenne(tries.map((p) => p.score));
  return { recent, saison, ecart: recent !== null && saison !== null ? recent - saison : null, n: derniers.length };
}
