// Statistiques « Stratégie » : les formules du Plan 30 (comptes virtuels) et les ×2. Logique PURE, testée dans
// tests/stats-strategie.test.ts. Les lignes reçues ont déjà été passées par le filtre du pick secret (lib/secret.ts).

import { GLOUTON, type LigneSuivi } from "@/lib/suivi-formules";
import type { LigneX2 } from "@/lib/x2";
import { picksJoues, type ScorePick } from "@/lib/stats-equipe";
import { grouper, moyenne, somme } from "@/lib/stats-outils";

// --- Formules du Plan 30 -------------------------------------------------------------------------------------------

export const NOMS_FORMULES: Record<string, string> = {
  prudent: "Prudent",
  equilibre: "Équilibré",
  ambitieux: "Ambitieux",
  glouton: "Glouton",
};

export function nomFormule(profil: string): string {
  return NOMS_FORMULES[profil] ?? profil.charAt(0).toUpperCase() + profil.slice(1);
}

export interface SoireeFormules {
  date: string;
  scores: Record<string, number>; // profil → score réel
  meilleurs: string[]; // le ou les profils au meilleur score ; vide s'il n'y a qu'un profil
}

export interface DetailFormules {
  profils: string[]; // ordre stable : prudent, équilibré, ambitieux, glouton, puis les autres
  soirees: SoireeFormules[]; // seulement les soirées notées pour TOUS les profils (comparaison juste)
  cumuls: Record<string, number[]>; // cumul de points par profil, soirée après soirée
  victoires: Record<string, number>; // soirées gagnées en solo
  egalites: number;
  projection: Record<string, { projection: number | null; reel: number | null; ecart: number | null }>;
}

const ORDRE = ["prudent", "equilibre", "ambitieux", "glouton"];

export function detailFormules(lignes: LigneSuivi[]): DetailFormules {
  const profils = [...new Set(lignes.map((l) => l.profil))].sort((a, b) => {
    const ia = ORDRE.indexOf(a);
    const ib = ORDRE.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const notees = lignes.filter((l) => l.score_reel !== null && l.score_reel !== undefined);
  const parDate = grouper(notees, (l) => String(l.pick_date).slice(0, 10));
  const soirees: SoireeFormules[] = [];
  for (const [date, ls] of [...parDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const scores: Record<string, number> = {};
    for (const l of ls) scores[l.profil] = Number(l.score_reel);
    if (!profils.every((p) => p in scores)) continue;
    const max = Math.max(...profils.map((p) => scores[p]));
    const meilleurs = profils.length > 1 ? profils.filter((p) => scores[p] === max) : [];
    soirees.push({ date, scores, meilleurs });
  }
  const cumuls: Record<string, number[]> = {};
  const victoires: Record<string, number> = {};
  const projection: DetailFormules["projection"] = {};
  for (const p of profils) {
    let c = 0;
    cumuls[p] = soirees.map((s) => (c += s.scores[p]));
    victoires[p] = soirees.filter((s) => s.meilleurs.length === 1 && s.meilleurs[0] === p).length;
    const dates = new Set(soirees.map((s) => s.date));
    const siennes = notees.filter((l) => l.profil === p && dates.has(String(l.pick_date).slice(0, 10)));
    const proj = siennes.filter((l) => l.projection !== null && l.projection !== undefined).map((l) => Number(l.projection));
    const reel = siennes.map((l) => Number(l.score_reel));
    const mp = moyenne(proj);
    const mr = moyenne(reel);
    projection[p] = { projection: mp, reel: mr, ecart: mp !== null && mr !== null ? mr - mp : null };
  }
  return { profils, soirees, cumuls, victoires, egalites: soirees.filter((s) => s.meilleurs.length > 1).length, projection };
}

export { GLOUTON };

// --- ×2 ---------------------------------------------------------------------------------------------------------------

export interface BilanX2 {
  total: number; // lignes ×2 connues
  parStatut: Record<string, number>;
  poses: number;
  comptesServis: number;
  joues: number; // ×2 posés dont le pick a déjà un score
  pointsGagnes: number; // un ×2 double le score : le gain est le score lui-même
  moyenneGain: number | null;
  moyennePicks: number | null; // moyenne des autres picks des mêmes comptes, pour comparer
  parMois: { mois: string; poses: number; gain: number }[];
  parCompte: { compte: string; poses: number; gain: number }[];
}

// Les lignes x2 (ttfl_x2) rapprochées des scores réels (ttfl_picks) par compte + soirée.
export function bilanX2(lignes: LigneX2[], picks: ScorePick[]): BilanX2 {
  const scores = new Map(picksJoues(picks).map((p) => [`${p.compte}|${p.pick_date}`, p.score]));
  const parStatut: Record<string, number> = {};
  for (const l of lignes) parStatut[l.statut] = (parStatut[l.statut] ?? 0) + 1;
  const poses = lignes.filter((l) => l.statut === "pose");
  const gains = poses.map((l) => ({ l, score: scores.get(`${l.compte}|${String(l.pick_date).slice(0, 10)}`) }));
  const jouees = gains.filter((g): g is { l: LigneX2; score: number } => typeof g.score === "number");
  const comptes = new Set(poses.map((l) => l.compte));
  const clesX2 = new Set(poses.map((l) => `${l.compte}|${String(l.pick_date).slice(0, 10)}`));
  const autres = picksJoues(picks)
    .filter((p) => comptes.has(p.compte) && !clesX2.has(`${p.compte}|${p.pick_date}`))
    .map((p) => p.score);
  const agreg = (cle: (l: LigneX2) => string) =>
    [...grouper(poses, cle).entries()].map(([k, ls]) => ({
      k,
      poses: ls.length,
      gain: somme(jouees.filter((j) => ls.includes(j.l)).map((j) => j.score)),
    }));
  return {
    total: lignes.length,
    parStatut,
    poses: poses.length,
    comptesServis: comptes.size,
    joues: jouees.length,
    pointsGagnes: somme(jouees.map((j) => j.score)),
    moyenneGain: moyenne(jouees.map((j) => j.score)),
    moyennePicks: moyenne(autres),
    parMois: agreg((l) => l.mois).map(({ k, poses: p, gain }) => ({ mois: k, poses: p, gain })).sort((a, b) => a.mois.localeCompare(b.mois)),
    parCompte: agreg((l) => l.compte).map(({ k, poses: p, gain }) => ({ compte: k, poses: p, gain })).sort((a, b) => b.gain - a.gain || a.compte.localeCompare(b.compte)),
  };
}
