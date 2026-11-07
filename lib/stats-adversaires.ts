// Statistiques « Adversaires » : les joueurs suivis dans le Centre de surveillance TTFL. Logique PURE, testée dans
// tests/stats-adversaires.test.ts. La liste, les points et les picks viennent du robot (lecture du site TTFL).

import type { TtflSuivi, TtflSuiviPick } from "@/lib/types";
import { moyenne } from "@/lib/stats-outils";

export interface JourSuivi {
  users_id: number;
  jour: string;
  points: number | null;
  rang: number | null;
}

const jour10 = (d: string) => String(d).slice(0, 10);

export interface ResumeLigue {
  nSuivis: number;
  leader: TtflSuivi | null; // le plus de points
  meilleurRang: TtflSuivi | null; // le meilleur rang général (le plus petit)
  moyenneGroupe: number | null; // moyenne de leurs moyennes par pick
}

export function resumeLigue(suivis: TtflSuivi[]): ResumeLigue {
  const avecPoints = suivis.filter((s) => s.points !== null);
  const avecRang = suivis.filter((s) => s.rang !== null);
  return {
    nSuivis: suivis.length,
    leader: avecPoints.reduce<TtflSuivi | null>((b, s) => (!b || (s.points ?? 0) > (b.points ?? 0) ? s : b), null),
    meilleurRang: avecRang.reduce<TtflSuivi | null>((b, s) => (!b || (s.rang ?? Infinity) < (b.rang ?? Infinity) ? s : b), null),
    moyenneGroupe: moyenne(suivis.filter((s) => s.moyenne !== null).map((s) => Number(s.moyenne))),
  };
}

export interface CourbeLigue {
  labels: string[]; // jours AAAA-MM-JJ
  series: { nom: string; valeurs: (number | null)[] }[];
}

// Points des `n` joueurs suivis les mieux classés, jour après jour (null = pas de relevé ce jour-là).
export function evolution(suivis: TtflSuivi[], jours: JourSuivi[], n = 6): CourbeLigue {
  const tete = [...suivis].filter((s) => s.points !== null).sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, n);
  const ids = new Set(tete.map((s) => s.users_id));
  const labels = [...new Set(jours.filter((j) => ids.has(j.users_id)).map((j) => jour10(j.jour)))].sort();
  return {
    labels,
    series: tete.map((s) => {
      const parJour = new Map(jours.filter((j) => j.users_id === s.users_id).map((j) => [jour10(j.jour), j.points]));
      return { nom: s.pseudo, valeurs: labels.map((l) => parJour.get(l) ?? null) };
    }),
  };
}

export interface Progression {
  pseudo: string;
  gagne: number; // points gagnés sur la fenêtre
  rangDebut: number | null;
  rangFin: number | null;
}

// Qui progresse le plus sur les `fenetre` derniers jours relevés.
export function progression(suivis: TtflSuivi[], jours: JourSuivi[], fenetre = 7): Progression[] {
  const dates = [...new Set(jours.map((j) => jour10(j.jour)))].sort();
  if (dates.length < 2) return [];
  const fin = dates[dates.length - 1];
  const debut = dates[Math.max(0, dates.length - 1 - fenetre)];
  const out: Progression[] = [];
  for (const s of suivis) {
    const a = jours.find((j) => j.users_id === s.users_id && jour10(j.jour) === debut);
    const b = jours.find((j) => j.users_id === s.users_id && jour10(j.jour) === fin);
    if (!a || !b || a.points === null || b.points === null) continue;
    out.push({ pseudo: s.pseudo, gagne: b.points - a.points, rangDebut: a.rang, rangFin: b.rang });
  }
  return out.sort((x, y) => y.gagne - x.gagne || x.pseudo.localeCompare(y.pseudo));
}

export interface JoueurPopulaire {
  joueur: string;
  n: number; // nombre de picks
  adversaires: number; // nombre de joueurs suivis différents
}

// Les joueurs NBA les plus pickés par tes adversaires (sur tout l'historique relevé).
export function picksPopulaires(picks: TtflSuiviPick[], n = 10): JoueurPopulaire[] {
  const par = new Map<string, { n: number; ids: Set<number> }>();
  for (const p of picks) {
    const e = par.get(p.joueur) ?? { n: 0, ids: new Set<number>() };
    e.n += 1;
    e.ids.add(p.users_id);
    par.set(p.joueur, e);
  }
  return [...par.entries()]
    .map(([joueur, e]) => ({ joueur, n: e.n, adversaires: e.ids.size }))
    .sort((a, b) => b.n - a.n || b.adversaires - a.adversaires || a.joueur.localeCompare(b.joueur))
    .slice(0, n);
}
