// Statistiques de l'ÉQUIPE (tous les comptes) et du compte 01 : logique PURE, testée dans tests/stats-equipe.test.ts.
//
// Les lignes reçues ont DÉJÀ été passées par masquerLignes (lib/secret.ts) : le pick du compte 02 d'une soirée encore
// secrète n'arrive jamais jusqu'ici. Seuls les picks DÉJÀ NOTÉS comptent (un pick sans score n'a pas encore été joué).

import { normaliserNom } from "@/lib/planning";
import { ecartType, grouper, moyenne, somme } from "@/lib/stats-outils";

export interface ScorePick {
  compte: string;
  pick_date: string;
  player: string;
  score: number | null;
}

export interface PickJoue extends ScorePick {
  score: number;
}

export const SEUIL_BON_SOIR = 40; // un pick à 40 points ou plus est un « bon soir »

export function picksJoues(picks: ScorePick[]): PickJoue[] {
  return picks
    .filter((p): p is PickJoue => p.score !== null && p.score !== undefined && Number.isFinite(Number(p.score)))
    .map((p) => ({ ...p, pick_date: String(p.pick_date).slice(0, 10), score: Number(p.score) }));
}

export interface ResumeCompte {
  compte: string;
  n: number;
  total: number;
  moyenne: number | null;
  meilleur: PickJoue | null;
  pire: PickJoue | null;
  zeros: number;
  bonsSoirs: number;
  ecartType: number | null;
}

const meilleurDe = (ps: PickJoue[]) => ps.reduce<PickJoue | null>((b, p) => (!b || p.score > b.score ? p : b), null);
const pireDe = (ps: PickJoue[]) => ps.reduce<PickJoue | null>((b, p) => (!b || p.score < b.score ? p : b), null);

// Un résumé par compte, le plus de points d'abord.
export function parCompte(picks: ScorePick[]): ResumeCompte[] {
  const groupes = grouper(picksJoues(picks), (p) => p.compte);
  return [...groupes.entries()]
    .map(([compte, ps]) => {
      const scores = ps.map((p) => p.score);
      return {
        compte,
        n: ps.length,
        total: somme(scores),
        moyenne: moyenne(scores),
        meilleur: meilleurDe(ps),
        pire: pireDe(ps),
        zeros: scores.filter((s) => s === 0).length,
        bonsSoirs: scores.filter((s) => s >= SEUIL_BON_SOIR).length,
        ecartType: ecartType(scores),
      };
    })
    .sort((a, b) => b.total - a.total || a.compte.localeCompare(b.compte));
}

export interface ResumeSoiree {
  date: string;
  n: number; // comptes ayant un score
  total: number;
  moyenne: number;
  meilleur: PickJoue;
  pire: PickJoue;
}

// Une ligne par soirée, de la plus ancienne à la plus récente.
export function parSoiree(picks: ScorePick[]): ResumeSoiree[] {
  const groupes = grouper(picksJoues(picks), (p) => p.pick_date);
  return [...groupes.entries()]
    .map(([date, ps]) => {
      const total = somme(ps.map((p) => p.score));
      return { date, n: ps.length, total, moyenne: total / ps.length, meilleur: meilleurDe(ps)!, pire: pireDe(ps)! };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface SyntheseEquipe {
  total: number;
  nPicks: number;
  nSoirees: number;
  nComptes: number;
  moyennePick: number | null;
  moyenneSoiree: number | null;
  meilleureSoiree: ResumeSoiree | null; // meilleure MOYENNE par pick (juste même si un compte manque)
  pireSoiree: ResumeSoiree | null;
}

export function syntheseEquipe(picks: ScorePick[]): SyntheseEquipe {
  const joues = picksJoues(picks);
  const soirees = parSoiree(picks);
  const scores = joues.map((p) => p.score);
  const meilleure = soirees.reduce<ResumeSoiree | null>((b, s) => (!b || s.moyenne > b.moyenne ? s : b), null);
  const pire = soirees.reduce<ResumeSoiree | null>((b, s) => (!b || s.moyenne < b.moyenne ? s : b), null);
  return {
    total: somme(scores),
    nPicks: joues.length,
    nSoirees: soirees.length,
    nComptes: new Set(joues.map((p) => p.compte)).size,
    moyennePick: moyenne(scores),
    moyenneSoiree: moyenne(soirees.map((s) => s.total)),
    meilleureSoiree: meilleure,
    pireSoiree: pire,
  };
}

// Total cumulé de l'équipe, soirée après soirée (pour la courbe).
export function cumulEquipe(soirees: ResumeSoiree[]): { date: string; total: number; cumul: number }[] {
  let cumul = 0;
  return soirees.map((s) => {
    cumul += s.total;
    return { date: s.date, total: s.total, cumul };
  });
}

// Combien de soirées chaque compte a « gagnées » (meilleur score de la soirée ; égalité = point pour chacun).
export function victoiresParCompte(picks: ScorePick[]): { compte: string; victoires: number }[] {
  const compteur = new Map<string, number>();
  for (const [, ps] of grouper(picksJoues(picks), (p) => p.pick_date)) {
    if (ps.length < 2) continue;
    const max = Math.max(...ps.map((p) => p.score));
    for (const p of ps.filter((x) => x.score === max)) compteur.set(p.compte, (compteur.get(p.compte) ?? 0) + 1);
  }
  return [...compteur.entries()].map(([compte, victoires]) => ({ compte, victoires })).sort((a, b) => b.victoires - a.victoires || a.compte.localeCompare(b.compte));
}

export interface ResumeJoueur {
  player: string;
  n: number;
  total: number;
  moyenne: number;
  meilleur: number;
  pire: number;
  comptes: number; // nombre de comptes différents qui l'ont pické
}

// Les joueurs pickés : combien de fois, avec quelle moyenne. Les noms sont rapprochés sans tenir compte des accents.
export function parJoueur(picks: ScorePick[]): ResumeJoueur[] {
  const groupes = grouper(picksJoues(picks), (p) => normaliserNom(p.player));
  return [...groupes.values()].map((ps) => {
    const scores = ps.map((p) => p.score);
    return {
      player: ps[0].player,
      n: ps.length,
      total: somme(scores),
      moyenne: somme(scores) / ps.length,
      meilleur: Math.max(...scores),
      pire: Math.min(...scores),
      comptes: new Set(ps.map((p) => p.compte)).size,
    };
  });
}

export const plusUtilises = (js: ResumeJoueur[]) =>
  [...js].sort((a, b) => b.n - a.n || b.moyenne - a.moyenne || a.player.localeCompare(b.player));

// Les plus rentables : meilleure moyenne, parmi ceux pickés au moins `minPicks` fois (sinon un seul coup de chance gagne).
export const plusRentables = (js: ResumeJoueur[], minPicks = 3) =>
  js.filter((j) => j.n >= minPicks).sort((a, b) => b.moyenne - a.moyenne || b.n - a.n || a.player.localeCompare(b.player));

export interface EcartSoiree {
  date: string;
  mon: number;
  equipe: number; // moyenne par pick de l'équipe ce soir-là
  ecart: number;
  ecartCumule: number;
}

// Mon compte face à l'équipe, soirée par soirée (écart de points par pick).
export function ecartAuCompte(picksCompte: ScorePick[], picksEquipe: ScorePick[]): EcartSoiree[] {
  const equipe = new Map(parSoiree(picksEquipe).map((s) => [s.date, s.moyenne]));
  let cumule = 0;
  return picksJoues(picksCompte)
    .sort((a, b) => a.pick_date.localeCompare(b.pick_date))
    .filter((p) => equipe.has(p.pick_date))
    .map((p) => {
      const e = equipe.get(p.pick_date)!;
      cumule += p.score - e;
      return { date: p.pick_date, mon: p.score, equipe: e, ecart: p.score - e, ecartCumule: cumule };
    });
}
