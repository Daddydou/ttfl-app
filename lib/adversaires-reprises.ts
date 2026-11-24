// Ce que chaque adversaire peut (re)prendre dans les prochains jours (24/11/2026). Logique PURE, testée dans
// tests/adversaires-reprises.test.ts, aucun accès réseau, aucun calcul de projection : on lit le classement du moteur.
//
// Principe : pour chaque soirée à venir, les 30 meilleurs joueurs selon nos projections (blessés « Out » et absents
// saisis retirés). Un adversaire ne peut pas reprendre un joueur qu'il a pické à 30 jours ou moins (règle du site, même
// règle que pour nos comptes : lib/planning.ts, JOURS_CYCLE). On ne connaît que ses picks DÉJÀ relevés (le site ne
// montre que le pick de la veille) : son pick du soir même n'est pas connu.

import { absentsActifs, type LigneSoiree } from "@/lib/conseilles";
import { ajouterJours, joursEntre, JOURS_CYCLE, normaliserNom } from "@/lib/planning";
import { nomJoueurSuivi } from "@/lib/adversaires";
import type { TtflManualAbsent, TtflSuivi, TtflSuiviPick } from "@/lib/types";

export const NB_TOP_REPRISES = 30;

export interface JoueurTop {
  player: string;
  team: string | null;
  opponent: string | null;
  projection: number;
  rang: number; // 1 = meilleure projection de la soirée
}

export interface NuitTop {
  date: string;
  joueurs: JoueurTop[];
}

// Les `n` meilleurs joueurs d'une soirée, hors « Out » et hors absents saisis à la main.
export function topDeLaNuit(lignes: LigneSoiree[], absents: TtflManualAbsent[], date: string, n: number = NB_TOP_REPRISES): NuitTop {
  const absentsDuJour = absentsActifs(absents, date);
  const vus = new Set<string>();
  const joueurs: JoueurTop[] = [];
  const tri = [...lignes].sort((a, b) => (b.projection ?? -Infinity) - (a.projection ?? -Infinity));
  for (const l of tri) {
    if (l.projection === null) continue;
    const cle = normaliserNom(l.player);
    if (vus.has(cle)) continue;
    if (String(l.status ?? "").toLowerCase() === "out" || absentsDuJour.has(cle)) continue;
    vus.add(cle);
    joueurs.push({ player: l.player, team: l.team, opponent: l.opponent, projection: l.projection, rang: joueurs.length + 1 });
    if (joueurs.length >= n) break;
  }
  return { date, joueurs };
}

export interface Reprise {
  player: string;
  date: string; // première soirée où il peut le prendre ET où il est dans le top
  rang: number; // rang dans le top de CETTE soirée
  projection: number;
  team: string | null;
  opponent: string | null;
  dejaPicke: string | null; // dernière fois que cet adversaire l'a pické (null = jamais relevé)
}

export interface ReprisesAdversaire {
  suivi: TtflSuivi;
  reprises: Reprise[]; // par date puis par rang
  nPicksConnus: number;
}

// Le pick d'un adversaire bloque le joueur pour la soirée `date` s'il date de 30 jours ou moins, dans les deux sens.
function bloque(datesPick: string[], date: string): boolean {
  return datesPick.some((d) => d !== date && Math.abs(joursEntre(d, date)) <= JOURS_CYCLE);
}

export function reprisesAdversaires(
  suivis: TtflSuivi[],
  picks: TtflSuiviPick[],
  nuits: NuitTop[],
  aujourdhui: string,
): ReprisesAdversaire[] {
  const parAdversaire = new Map<number, Map<string, string[]>>(); // users_id -> joueur normalisé -> dates de pick
  for (const p of picks) {
    const cle = normaliserNom(nomJoueurSuivi(p.joueur));
    const joueurs = parAdversaire.get(p.users_id) ?? new Map<string, string[]>();
    joueurs.set(cle, [...(joueurs.get(cle) ?? []), String(p.pick_date).slice(0, 10)]);
    parAdversaire.set(p.users_id, joueurs);
  }
  const nuitsTriees = [...nuits].sort((a, b) => a.date.localeCompare(b.date));

  return [...suivis]
    .sort((a, b) => (a.rang ?? Infinity) - (b.rang ?? Infinity))
    .map((suivi) => {
      const connus = parAdversaire.get(suivi.users_id) ?? new Map<string, string[]>();
      const dejaVus = new Set<string>();
      const reprises: Reprise[] = [];
      for (const nuit of nuitsTriees) {
        for (const j of nuit.joueurs) {
          const cle = normaliserNom(j.player);
          if (dejaVus.has(cle)) continue;
          const dates = connus.get(cle) ?? [];
          if (bloque(dates, nuit.date)) continue;
          dejaVus.add(cle);
          const passes = dates.filter((d) => d <= aujourdhui).sort();
          reprises.push({
            player: j.player,
            date: nuit.date,
            rang: j.rang,
            projection: j.projection,
            team: j.team,
            opponent: j.opponent,
            dejaPicke: passes.length > 0 ? passes[passes.length - 1] : null,
          });
        }
      }
      return { suivi, reprises, nPicksConnus: [...connus.values()].reduce((s, d) => s + d.length, 0) };
    });
}

export interface GroupeDate {
  date: string;
  reprises: Reprise[];
}

export function grouperParDate(reprises: Reprise[]): GroupeDate[] {
  const groupes: GroupeDate[] = [];
  for (const r of reprises) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.date === r.date) dernier.reprises.push(r);
    else groupes.push({ date: r.date, reprises: [r] });
  }
  return groupes;
}

// Date AAAA-MM-JJ à partir de laquelle un pick relevé ne bloque plus (utile à l'affichage : « libre dès le … »).
export function finDeBlocage(datePick: string): string {
  return ajouterJours(datePick, JOURS_CYCLE + 1);
}
