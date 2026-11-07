// Statistiques « Joueurs NBA » : les projections du dernier calcul du moteur (affichage seul, rien n'est recalculé).
// Logique PURE, testée dans tests/stats-nba.test.ts.

import type { TtflProjection } from "@/lib/types";
import { grouper, moyenne } from "@/lib/stats-outils";

const avecProjection = (ps: TtflProjection[]) => ps.filter((p) => p.projection !== null);

export function topProjections(ps: TtflProjection[], n = 12): TtflProjection[] {
  return [...avecProjection(ps)].sort((a, b) => (b.projection ?? 0) - (a.projection ?? 0)).slice(0, n);
}

export interface ResumeSoirNba {
  nJoueurs: number;
  pick: TtflProjection | null; // le pick conseillé (is_pick)
  meilleure: TtflProjection | null;
  meilleurMatchup: TtflProjection | null;
}

export function resumeSoirNba(ps: TtflProjection[]): ResumeSoirNba {
  const avecMatchup = ps.filter((p) => p.matchup_factor !== null);
  return {
    nJoueurs: ps.length,
    pick: ps.find((p) => p.is_pick) ?? null,
    meilleure: topProjections(ps, 1)[0] ?? null,
    meilleurMatchup: avecMatchup.reduce<TtflProjection | null>(
      (b, p) => (!b || (p.matchup_factor ?? 0) > (b.matchup_factor ?? 0) ? p : b),
      null,
    ),
  };
}

export interface Defense {
  adversaire: string;
  n: number;
  matchup: number; // facteur moyen : au-dessus de 1, la défense est permissive
  projection: number | null;
}

// Les défenses adverses du soir, de la plus permissive à la plus fermée.
export function parDefense(ps: TtflProjection[]): Defense[] {
  const groupes = grouper(
    ps.filter((p) => p.opponent && p.matchup_factor !== null),
    (p) => p.opponent as string,
  );
  return [...groupes.entries()]
    .map(([adversaire, l]) => ({
      adversaire,
      n: l.length,
      matchup: moyenne(l.map((p) => Number(p.matchup_factor)))!,
      projection: moyenne(l.filter((p) => p.projection !== null).map((p) => Number(p.projection))),
    }))
    .sort((a, b) => b.matchup - a.matchup || a.adversaire.localeCompare(b.adversaire));
}

export interface PostePro {
  poste: string;
  n: number;
  projection: number | null;
  forme: number | null;
}

export function parPoste(ps: TtflProjection[]): PostePro[] {
  const groupes = grouper(
    ps.filter((p) => p.position),
    (p) => p.position as string,
  );
  return [...groupes.entries()]
    .map(([poste, l]) => ({
      poste,
      n: l.length,
      projection: moyenne(l.filter((p) => p.projection !== null).map((p) => Number(p.projection))),
      forme: moyenne(l.filter((p) => p.forme !== null).map((p) => Number(p.forme))),
    }))
    .sort((a, b) => (b.projection ?? 0) - (a.projection ?? 0));
}

export interface LigneForme {
  joueur: string;
  equipe: string | null;
  moy5: number;
  saison: number;
  ecart: number; // moyenne des 5 derniers matchs moins moyenne de la saison
}

// Les joueurs dont les 5 derniers matchs dépassent le plus leur moyenne de saison (au moins 5 matchs joués).
export function plusEnForme(ps: TtflProjection[], n = 8): LigneForme[] {
  const lignes: LigneForme[] = [];
  for (const p of ps) {
    const h = p.historique;
    if (!h || h.moy5 === null || h.saison?.moy === null || h.saison?.moy === undefined || h.saison.n < 5) continue;
    lignes.push({ joueur: p.player, equipe: p.team, moy5: h.moy5, saison: h.saison.moy, ecart: h.moy5 - h.saison.moy });
  }
  return lignes.sort((a, b) => b.ecart - a.ecart || a.joueur.localeCompare(b.joueur)).slice(0, n);
}

export interface LigneRegulier {
  joueur: string;
  equipe: string | null;
  projection: number;
  ecart10: number; // irrégularité : plus c'est petit, plus le joueur est constant
}

// Les plus constants parmi les joueurs à bonne projection (la moitié haute du tableau du soir).
export function plusReguliers(ps: TtflProjection[], n = 8): LigneRegulier[] {
  const triees = avecProjection(ps).sort((a, b) => (b.projection ?? 0) - (a.projection ?? 0));
  const haut = triees.slice(0, Math.max(1, Math.ceil(triees.length / 2)));
  const lignes: LigneRegulier[] = [];
  for (const p of haut) {
    const e = p.historique?.ecart10;
    if (e === null || e === undefined) continue;
    lignes.push({ joueur: p.player, equipe: p.team, projection: Number(p.projection), ecart10: e });
  }
  return lignes.sort((a, b) => a.ecart10 - b.ecart10 || b.projection - a.projection).slice(0, n);
}

export function repartitionStatuts(ps: TtflProjection[]): { statut: string; n: number }[] {
  const groupes = grouper(ps, (p) => (p.status === "OUT" ? "Out" : p.status ?? "Inconnu"));
  return [...groupes.entries()].map(([statut, l]) => ({ statut, n: l.length })).sort((a, b) => b.n - a.n);
}
