// Répartition automatique des comptes de l'équipe pour UNE soirée (logique PURE, testable seule).
//
// Règle issue de l'étude sur 5 saisons (2021-22 → 2025-26, recherche/repartition_equipe.py) :
//   « bruit » — on ne répartit QUE les joueurs à moins de MARGE_BRUIT points de projection du meilleur
//   disponible, avec au plus PART_MAX des comptes sur le même joueur. Au-delà de la marge, on ne paie pas
//   d'espérance pour du risque : tous les comptes prennent le meilleur joueur disponible.
// Mesuré : même espérance de points que « tous pareils » (±), mais les soirées où l'équipe s'effondre
// passent d'environ 9–12 % à environ 4 %, et l'écart-type du total d'équipe baisse d'un tiers.
//
// Le cycle de 30 jours est propre à CHAQUE compte : un joueur bloqué sur un compte n'est pas proposé à celui-là.

import { bloquesPourSoiree, COMPTE_VALIDE, normaliserNom, type PickLigne } from "@/lib/planning";

export const MARGE_BRUIT = 3; // points de projection
export const PART_MAX = 0.6; // au plus 60 % des comptes sur un même joueur

export interface JoueurPropose {
  player: string;
  projection: number | null;
  status?: string | null;
}

export interface Groupe {
  player: string;
  projection: number | null;
  comptes: string[];
}

export interface Repartition {
  groupes: Groupe[]; // du joueur le plus pické au moins pické
  sansPick: string[]; // comptes pour lesquels aucun joueur n'est disponible
  coutProjection: number; // points de projection perdus par rapport à « chaque compte sur son meilleur disponible »
}

export function repartirEquipe({
  joueurs,
  comptes,
  bloques,
  marge = MARGE_BRUIT,
  partMax = PART_MAX,
  rotation = 0,
}: {
  joueurs: JoueurPropose[];
  comptes: string[];
  bloques: Record<string, string[]>; // nom normalisé → comptes où il est bloqué (≤ 30 jours)
  marge?: number;
  partMax?: number;
  rotation?: number; // décale l'ordre des comptes d'une soirée à l'autre (équité)
}): Repartition {
  // Un joueur déjà annoncé « Out » ne marque rien : jamais proposé.
  const candidats = joueurs
    .filter((j): j is JoueurPropose & { projection: number } => j.projection !== null && j.status !== "Out")
    .sort((a, b) => b.projection - a.projection);
  const n = comptes.length;
  const dispo = new Map(
    comptes.map((c) => [c, candidats.filter((j) => !(bloques[normaliserNom(j.player)] ?? []).includes(c))]),
  );

  const meilleurs = comptes.map((c) => dispo.get(c)![0]?.projection).filter((p): p is number => p !== undefined);
  if (meilleurs.length === 0) return { groupes: [], sansPick: [...comptes], coutProjection: 0 };

  const meilleur = Math.max(...meilleurs);
  const dansLeBruit = new Set(
    candidats.filter((j) => j.projection >= meilleur - marge).map((j) => normaliserNom(j.player)),
  );
  const plafond = Math.max(1, Math.ceil(partMax * n));
  const prises = new Map<string, number>();
  const cle = (j: JoueurPropose) => normaliserNom(j.player);

  const choix = new Map<string, JoueurPropose & { projection: number }>();
  const sansPick: string[] = [];
  let cout = 0;
  const decalage = n > 0 ? ((rotation % n) + n) % n : 0;

  for (let k = 0; k < n; k++) {
    const compte = comptes[(k + decalage) % n];
    const d = dispo.get(compte)!;
    if (d.length === 0) {
      sansPick.push(compte);
      continue;
    }
    let cands = d.filter((j) => dansLeBruit.has(cle(j)));
    if (cands.length === 0) cands = [d[0]];
    const sousPlafond = cands.filter((j) => (prises.get(cle(j)) ?? 0) < plafond);
    const pool = sousPlafond.length > 0 ? sousPlafond : cands;
    // Le moins pické d'abord ; à égalité, la meilleure projection (pool est déjà trié par projection décroissante).
    const choisi = pool.reduce((a, b) => ((prises.get(cle(b)) ?? 0) < (prises.get(cle(a)) ?? 0) ? b : a));
    prises.set(cle(choisi), (prises.get(cle(choisi)) ?? 0) + 1);
    choix.set(compte, choisi);
    cout += d[0].projection - choisi.projection;
  }

  const parJoueur = new Map<string, Groupe>();
  for (const [compte, j] of choix) {
    const g = parJoueur.get(cle(j)) ?? { player: j.player, projection: j.projection, comptes: [] };
    g.comptes.push(compte);
    parJoueur.set(cle(j), g);
  }
  const groupes = [...parJoueur.values()]
    .map((g) => ({ ...g, comptes: [...g.comptes].sort() }))
    .sort((a, b) => b.comptes.length - a.comptes.length || (b.projection ?? 0) - (a.projection ?? 0));

  return { groupes, sansPick: sansPick.sort(), coutProjection: Math.round(cout * 10) / 10 };
}

// Validation côté serveur d'une répartition (même règle de cycle que pickPlayerComptes).
// Renvoie un message d'erreur, ou null si tout est valide.
export function validerAffectations(
  groupes: { player: string; comptes: string[] }[],
  voisins: PickLigne[],
  date: string,
): string | null {
  if (groupes.length === 0) return "Aucune répartition à enregistrer.";
  const vus = new Set<string>();
  for (const g of groupes) {
    const joueur = g.player.trim();
    if (!joueur || joueur.length > 80) return "Joueur invalide.";
    if (g.comptes.length === 0) return "Groupe sans compte.";
    for (const c of g.comptes) {
      if (!COMPTE_VALIDE.test(c)) return "Comptes invalides.";
      if (vus.has(c)) return `Le compte ${c} apparaît dans deux groupes.`;
      vus.add(c);
    }
    const bloques = bloquesPourSoiree(voisins, g.comptes, date)[normaliserNom(joueur)];
    if (bloques && bloques.length > 0) {
      return `${joueur} est déjà pické à 30 jours ou moins sur le(s) compte(s) ${bloques.join(", ")}.`;
    }
  }
  return null;
}
