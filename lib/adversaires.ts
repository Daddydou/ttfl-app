import type { TtflSuivi, TtflSuiviPick } from "@/lib/types";

// Lecture seule : tout vient du robot (ttfl-auto/lire-suivis.js) qui relève la page « Centre de surveillance » du site TTFL.

export interface PickParAdversaire {
  suivi: TtflSuivi;
  picks: TtflSuiviPick[]; // du plus récent au plus ancien
}

// Un adversaire par ligne, classé par rang TTFL (le meilleur d'abord, rang inconnu à la fin).
export function adversairesAvecPicks(suivis: TtflSuivi[], picks: TtflSuiviPick[]): PickParAdversaire[] {
  const parId = new Map<number, TtflSuiviPick[]>();
  for (const p of picks) parId.set(p.users_id, [...(parId.get(p.users_id) ?? []), p]);
  return [...suivis]
    .sort((a, b) => (a.rang ?? Infinity) - (b.rang ?? Infinity))
    .map((s) => ({
      suivi: s,
      picks: (parId.get(s.users_id) ?? []).sort((a, b) => b.pick_date.localeCompare(a.pick_date)),
    }));
}

export interface ChoixDuJour {
  joueur: string;
  pseudos: string[];
}

// Ce que les adversaires ont pické à la dernière date relevée : joueur -> qui l'a pické (le plus choisi d'abord).
export function derniersChoix(suivis: TtflSuivi[], picks: TtflSuiviPick[]): { date: string; choix: ChoixDuJour[] } | null {
  if (picks.length === 0) return null;
  const date = picks.reduce((max, p) => (p.pick_date > max ? p.pick_date : max), picks[0].pick_date);
  const pseudoDe = new Map(suivis.map((s) => [s.users_id, s.pseudo]));
  const parJoueur = new Map<string, string[]>();
  for (const p of picks.filter((x) => x.pick_date === date)) {
    parJoueur.set(p.joueur, [...(parJoueur.get(p.joueur) ?? []), pseudoDe.get(p.users_id) ?? `#${p.users_id}`]);
  }
  const choix = [...parJoueur.entries()]
    .map(([joueur, pseudos]) => ({ joueur, pseudos: pseudos.sort() }))
    .sort((a, b) => b.pseudos.length - a.pseudos.length || a.joueur.localeCompare(b.joueur));
  return { date, choix };
}

export function fmtRang(rang: number | null): string {
  return rang === null ? "—" : `#${rang.toLocaleString("fr-FR")}`;
}
