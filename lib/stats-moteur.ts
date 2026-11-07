// Statistiques « Le moteur face à la réalité » et « Absences relevées ». Logique PURE, testée dans tests/stats-moteur.test.ts.
//
// La projection d'un pick n'est pas enregistrée avec le pick : on la retrouve dans le DERNIER calcul du moteur de la soirée
// (ttfl_projections, les 30 meilleurs joueurs de chaque calcul). Un pick hors de cette liste n'est pas comparé : la
// « couverture » dit quelle part des picks notés a pu l'être.

import { normaliserNom } from "@/lib/planning";
import type { ScorePick } from "@/lib/stats-equipe";
import { arrondi, moyenne } from "@/lib/stats-outils";

export interface ProjectionNuit {
  date: string; // soirée AAAA-MM-JJ
  player: string;
  projection: number | null;
}

export interface PointMoteur {
  date: string;
  joueur: string;
  projection: number;
  reel: number;
  ecart: number; // réel - projection (positif : le joueur a fait mieux que prévu)
}

export interface TrancheMoteur {
  label: string;
  n: number;
  projection: number | null;
  reel: number | null;
}

export interface BilanMoteur {
  nPicks: number; // picks notés
  nCompares: number; // picks retrouvés dans le calcul de la soirée
  couverture: number | null; // % de picks comparés
  projectionMoyenne: number | null;
  reelMoyen: number | null;
  biais: number | null; // écart moyen réel - projection
  erreurMoyenne: number | null; // écart absolu moyen
  correlation: number | null; // -1..1, null sous 5 comparaisons
  tranches: TrancheMoteur[];
  plusGrosEcarts: PointMoteur[]; // les plus grosses surprises, dans les deux sens
}

export function correlation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 5 || ys.length !== n) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return arrondi(sxy / Math.sqrt(sxx * syy), 2);
}

export function bilanMoteur(picks: ScorePick[], projections: ProjectionNuit[]): BilanMoteur {
  const index = new Map<string, number>();
  for (const pr of projections) {
    if (pr.projection === null || pr.projection === undefined) continue;
    index.set(`${String(pr.date).slice(0, 10)}|${normaliserNom(pr.player)}`, Number(pr.projection));
  }
  const notes = picks.filter((p) => p.score !== null);
  const points: PointMoteur[] = [];
  for (const p of notes) {
    const proj = index.get(`${String(p.pick_date).slice(0, 10)}|${normaliserNom(p.player)}`);
    if (proj === undefined || Number.isNaN(proj)) continue;
    const reel = Number(p.score);
    points.push({ date: p.pick_date, joueur: p.player, projection: proj, reel, ecart: reel - proj });
  }
  const defs = [
    { label: "Moins de 30", min: -Infinity, max: 30 },
    { label: "30 à 40", min: 30, max: 40 },
    { label: "40 et plus", min: 40, max: Infinity },
  ];
  const tranches = defs.map((d) => {
    const dedans = points.filter((pt) => pt.projection >= d.min && pt.projection < d.max);
    return { label: d.label, n: dedans.length, projection: moyenne(dedans.map((x) => x.projection)), reel: moyenne(dedans.map((x) => x.reel)) };
  });
  const ecarts = points.map((pt) => pt.ecart);
  return {
    nPicks: notes.length,
    nCompares: points.length,
    couverture: notes.length ? (points.length / notes.length) * 100 : null,
    projectionMoyenne: moyenne(points.map((pt) => pt.projection)),
    reelMoyen: moyenne(points.map((pt) => pt.reel)),
    biais: moyenne(ecarts),
    erreurMoyenne: moyenne(ecarts.map((e) => Math.abs(e))),
    correlation: correlation(points.map((pt) => pt.projection), points.map((pt) => pt.reel)),
    tranches,
    plusGrosEcarts: [...points].sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart)).slice(0, 6),
  };
}

// --- Absences relevées (ttfl_blesses_historique : une ligne à chaque changement de statut d'un joueur) ------------------

export interface LigneAbsence {
  game_date: string;
  joueur_norm: string;
  statut: string;
  vu_le: string;
}

export interface AbsencesSoiree {
  date: string;
  out: number;
  doubtful: number;
  autres: number;
}

// Pour chaque soirée : combien de joueurs, d'après leur DERNIER statut relevé, sont Out, Doubtful ou autre.
export function absencesParSoiree(lignes: LigneAbsence[]): AbsencesSoiree[] {
  const dernier = new Map<string, LigneAbsence>();
  for (const l of lignes) {
    const cle = `${String(l.game_date).slice(0, 10)}|${l.joueur_norm}`;
    const vu = dernier.get(cle);
    if (!vu || String(l.vu_le) > String(vu.vu_le)) dernier.set(cle, l);
  }
  const parDate = new Map<string, AbsencesSoiree>();
  for (const l of dernier.values()) {
    const date = String(l.game_date).slice(0, 10);
    const ligne = parDate.get(date) ?? { date, out: 0, doubtful: 0, autres: 0 };
    const s = String(l.statut).toLowerCase();
    if (s === "out") ligne.out += 1;
    else if (s === "doubtful") ligne.doubtful += 1;
    else ligne.autres += 1;
    parDate.set(date, ligne);
  }
  return [...parDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
