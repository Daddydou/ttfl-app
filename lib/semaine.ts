// Vue « équipe de la semaine » (logique PURE, aucun accès réseau) : une grille comptes × soirées avec, pour chaque
// case, le joueur voulu, l'état d'envoi, une alerte si le même joueur revient à ≤ 30 jours sur le même compte, et la
// date à laquelle il redevient pickable (planificateur de cycle). Une ligne de synthèse par soirée signale les comptes
// sans pick et la sur-concentration d'un même joueur (au-delà de la part maximale de l'équipe).

import { PART_MAX } from "@/lib/repartition";
import { JOURS_CYCLE, ajouterJours, joursEntre, normaliserNom, type EnvoiLigne, type PickLigne } from "@/lib/planning";

export interface Cellule {
  date: string;
  compte: string;
  joueur: string | null;
  statut: string | null; // état d'envoi (ttfl_envois) : confirme / propose / conflit / echec…
  cycle: boolean; // le même joueur est déjà pické sur ce compte à ≤ 30 jours (dans la grille ou autour)
  libreLe: string | null; // première date où il redevient pickable pour ce compte
}

export interface SyntheseSoiree {
  date: string;
  sansPick: string[]; // comptes sans pick
  groupes: { player: string; comptes: string[] }[]; // du plus pické au moins pické
  surconcentration: boolean; // un même joueur sur plus de PART_MAX des comptes de l'équipe
}

export interface Semaine {
  dates: string[];
  comptes: string[];
  lignes: { compte: string; cellules: Cellule[] }[];
  syntheses: SyntheseSoiree[];
}

export function datesDeLaSemaine(debut: string, n = 7): string[] {
  return Array.from({ length: n }, (_, i) => ajouterJours(debut, i));
}

export function construireSemaine({
  dates,
  comptes,
  picks,
  envois,
}: {
  dates: string[];
  comptes: string[];
  picks: PickLigne[]; // picks voulus, fenêtre élargie à ±30 jours (pour le cycle)
  envois: EnvoiLigne[];
}): Semaine {
  const pickDe = new Map(picks.map((p) => [`${p.compte}|${p.pick_date}`, p.player]));
  const statutDe = new Map(envois.map((e) => [`${e.compte}|${e.pick_date}`, e.statut]));

  const lignes = comptes.map((compte) => {
    const cellules = dates.map((date): Cellule => {
      const joueur = pickDe.get(`${compte}|${date}`) ?? null;
      let cycle = false;
      if (joueur) {
        const cle = normaliserNom(joueur);
        cycle = picks.some(
          (p) =>
            p.compte === compte &&
            p.pick_date !== date &&
            normaliserNom(p.player) === cle &&
            Math.abs(joursEntre(p.pick_date, date)) <= JOURS_CYCLE,
        );
      }
      return {
        date,
        compte,
        joueur,
        statut: joueur ? (statutDe.get(`${compte}|${date}`) ?? null) : null,
        cycle,
        libreLe: joueur ? ajouterJours(date, JOURS_CYCLE + 1) : null,
      };
    });
    return { compte, cellules };
  });

  const plafond = Math.max(1, Math.ceil(PART_MAX * comptes.length));
  const syntheses = dates.map((date): SyntheseSoiree => {
    const parJoueur = new Map<string, { player: string; comptes: string[] }>();
    const sansPick: string[] = [];
    for (const l of lignes) {
      const c = l.cellules.find((x) => x.date === date)!;
      if (!c.joueur) {
        sansPick.push(l.compte);
        continue;
      }
      const cle = normaliserNom(c.joueur);
      const g = parJoueur.get(cle) ?? { player: c.joueur, comptes: [] };
      g.comptes.push(l.compte);
      parJoueur.set(cle, g);
    }
    const groupes = [...parJoueur.values()].sort((a, b) => b.comptes.length - a.comptes.length);
    return {
      date,
      sansPick,
      groupes,
      surconcentration: comptes.length > 1 && groupes.some((g) => g.comptes.length > plafond),
    };
  });

  return { dates, comptes, lignes, syntheses };
}
