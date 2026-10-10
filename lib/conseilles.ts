// Picks conseillés d'une soirée (logique PURE, testable seule, aucun accès réseau).
//
// Source : les projections du moteur. Pour une soirée il peut y avoir DEUX runs :
//   - « à l'avance » : TOUS les joueurs des matchs, sans blessures ni cycle (calculé plusieurs jours avant) ;
//   - « du soir »    : le Top 10 avec les blessures fraîches (push du soir, cycle appliqué par le moteur).
// L'application reconstruit le classement qui compte POUR LES COMPTES CHOISIS : elle retire les joueurs déjà
// pickés à ≤ 30 jours (dans le passé comme dans le futur, propre à chaque compte), les absents saisis à la main
// et les joueurs annoncés « Out ».

import {
  aDesProjections,
  bloquesPourSoiree,
  normaliserNom,
  type Nuit,
  type PickLigne,
} from "@/lib/planning";
import type { TtflManualAbsent, TtflProjection } from "@/lib/types";

export const NB_CONSEILLES = 10;
export const NB_JOURS = 7;

export type LigneSoiree = Omit<
  TtflProjection,
  "id" | "run_id" | "rank" | "is_pick" | "series_state" | "expected_nights_left"
> & { source: "soir" | "avance"; series_state?: string | null; expected_nights_left?: number | null };

function enLigne(r: TtflProjection, source: "soir" | "avance"): LigneSoiree {
  return {
    player: r.player,
    team: r.team,
    opponent: r.opponent,
    position: r.position,
    projection: r.projection,
    forme: r.forme,
    ceiling: r.ceiling,
    matchup_factor: r.matchup_factor,
    status: r.status,
    is_urgent: r.is_urgent,
    explanation: r.explanation,
    series_state: r.series_state,
    expected_nights_left: r.expected_nights_left,
    source,
  };
}

// Fusionne les deux runs d'une soirée en un vivier unique.
//  - sans run du soir : le vivier est le run « à l'avance » (blessures inconnues) ;
//  - avec un run du soir : on lui fait confiance pour les blessures. Il ne contient que le Top 10 du moteur, donc
//    un joueur « Out » ou déjà exclu par le moteur n'y figure PAS : on ne repêche dans le run « à l'avance » que les
//    joueurs dont la projection est ≤ à la plus basse du Top 10 du soir (de quoi combler les places que nos propres
//    filtres libèrent), jamais ceux que le moteur a pu écarter pour blessure.
export function fusionnerSoiree(avance: TtflProjection[], soir: TtflProjection[]): LigneSoiree[] {
  if (soir.length === 0) return avance.map((r) => enLigne(r, "avance"));
  const planchers = soir.map((r) => r.projection).filter((p): p is number => p !== null);
  const plancher = planchers.length > 0 ? Math.min(...planchers) : Infinity;
  const vus = new Set(soir.map((r) => normaliserNom(r.player)));
  const complements = avance.filter(
    (r) => !vus.has(normaliserNom(r.player)) && r.projection !== null && r.projection <= plancher,
  );
  return [...soir.map((r) => enLigne(r, "soir")), ...complements.map((r) => enLigne(r, "avance"))];
}

// Joueurs absents (saisis à la main) à la date donnée.
export function absentsActifs(absents: TtflManualAbsent[], date: string): Set<string> {
  return new Set(
    absents
      .filter((a) => a.date_debut <= date && (!a.date_fin || a.date_fin >= date))
      .map((a) => normaliserNom(a.player)),
  );
}

export interface Conseille extends LigneSoiree {
  rang: number;
  comptesLibres: string[]; // comptes de la zone pour lesquels il est encore disponible
  comptesBloques: string[]; // comptes où il est bloqué (≤ 30 jours) — non vide = bloqué sur une partie de la zone
}

export interface Masque {
  player: string;
  raison: "cycle" | "absent" | "out";
}

export function construireConseilles({
  lignes,
  comptes,
  picks,
  absents,
  date,
  n = NB_CONSEILLES,
}: {
  lignes: LigneSoiree[];
  comptes: string[];
  picks: PickLigne[];
  absents: TtflManualAbsent[];
  date: string;
  n?: number;
}): { conseilles: Conseille[]; masques: Masque[] } {
  const bloques = bloquesPourSoiree(picks, comptes, date);
  const absentsDuJour = absentsActifs(absents, date);

  const garde: Conseille[] = [];
  const ecartes: (Masque & { projection: number })[] = [];
  const tri = [...lignes].sort((a, b) => (b.projection ?? -Infinity) - (a.projection ?? -Infinity));

  for (const l of tri) {
    if (l.projection === null) continue;
    const cle = normaliserNom(l.player);
    const bloquesIci = (bloques[cle] ?? []).filter((c) => comptes.includes(c));
    if (String(l.status ?? "").toLowerCase() === "out") {
      ecartes.push({ player: l.player, raison: "out", projection: l.projection });
    } else if (absentsDuJour.has(cle)) {
      ecartes.push({ player: l.player, raison: "absent", projection: l.projection });
    } else if (bloquesIci.length >= comptes.length) {
      ecartes.push({ player: l.player, raison: "cycle", projection: l.projection });
    } else {
      garde.push({
        ...l,
        rang: 0,
        comptesBloques: bloquesIci,
        comptesLibres: comptes.filter((c) => !bloquesIci.includes(c)),
      });
    }
  }

  const conseilles = garde.slice(0, n).map((c, i) => ({ ...c, rang: i + 1 }));
  // Seuls comptent les écartés qui auraient figuré dans la liste : c'est ce que l'écran signale.
  const seuil = conseilles.length > 0 ? (conseilles[conseilles.length - 1].projection ?? 0) : -Infinity;
  const masques = ecartes
    .filter((e) => e.projection >= seuil)
    .map(({ player, raison }) => ({ player, raison }));
  return { conseilles, masques };
}

// Nombre de matchs de la soirée : paires d'équipes distinctes (A–B et B–A comptent pour un seul match).
export function nbMatchs(lignes: Pick<LigneSoiree, "team" | "opponent">[]): number {
  const paires = new Set<string>();
  for (const l of lignes) {
    if (l.team && l.opponent) paires.add([l.team, l.opponent].sort().join("|"));
  }
  return paires.size;
}

// Les jours proposés : les soirées à venir (aujourd'hui compris) qui ont des projections, au plus `n`.
export function joursProposes(nuits: Nuit[], aujourdhui: string, n: number = NB_JOURS): string[] {
  const dates = [...new Set(nuits.filter(aDesProjections).map((x) => x.game_date))].sort();
  return dates.filter((d) => d >= aujourdhui).slice(0, n);
}

// Étiquette courte d'un jour : « lun. 20/10 », avec « aujourd'hui » / « demain » quand c'est le cas.
export function etiquetteJour(date: string, aujourdhui: string): { court: string; relatif: string | null } {
  const d = new Date(`${date}T00:00:00Z`);
  const jour = d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" });
  const [, mois, j] = date.split("-");
  const ecart = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${aujourdhui}T00:00:00Z`)) / 86400000);
  return {
    court: `${jour} ${j}/${mois}`,
    relatif: ecart === 0 ? "aujourd'hui" : ecart === 1 ? "demain" : null,
  };
}

// Picks déjà validés à venir pour un compte (tableau de bord) : du plus proche au plus lointain.
export function picksAVenir<T extends { pick_date: string }>(picks: T[], aujourdhui: string): T[] {
  return picks.filter((p) => p.pick_date >= aujourdhui).sort((a, b) => a.pick_date.localeCompare(b.pick_date));
}
