import type { TtflSuivi } from "@/lib/types";

// Lecture seule : tout vient du robot (ttfl-auto/lire-suivis.js) qui relève la page « Centre de surveillance » du site TTFL.

// Le site TTFL renvoie le pick d'hier avec le score collé au nom : « Nikola Jokić · 76 pts » ou
// « Victor Wembanyama · 89×2=178 pts ». Seul le nom compte (c'était la cause de l'affichage cassé : le texte long
// poussait le nom hors de l'écran, et un même joueur apparaissait en plusieurs lignes selon son score).
export function nomJoueurSuivi(brut: string): string {
  return String(brut ?? "").replace(/\s*[·•]\s.*$/u, "").trim();
}

// Un adversaire par ligne, classé par rang TTFL (le meilleur d'abord, rang inconnu à la fin).
export function adversairesParRang(suivis: TtflSuivi[]): TtflSuivi[] {
  return [...suivis].sort((a, b) => (a.rang ?? Infinity) - (b.rang ?? Infinity));
}

export function fmtRang(rang: number | null): string {
  return rang === null ? "—" : `#${rang.toLocaleString("fr-FR")}`;
}

// --- Scores des adversaires (vue ttfl_suivis_scores : points du jour = écart de points entre deux relevés) ---------

export interface ScoreSuivi {
  users_id: number;
  soiree: string;
  score_du_jour: number | null;
}

export interface ResumeScores {
  n: number; // soirées avec un score connu
  moyenne: number | null;
  meilleur: number | null;
  parSoiree: Map<string, number>;
}

// Regroupe les scores par adversaire : moyenne, meilleur score et score de chaque soirée.
// `depuisSoiree` (AAAA-MM-JJ, inclus) limite la fenêtre ; absent = tout ce qui est fourni.
export function scoresParAdversaire(scores: ScoreSuivi[], depuisSoiree?: string): Map<number, ResumeScores> {
  const out = new Map<number, ResumeScores>();
  for (const s of scores) {
    if (s.score_du_jour === null || (depuisSoiree && s.soiree < depuisSoiree)) continue;
    const r = out.get(s.users_id) ?? { n: 0, moyenne: null, meilleur: null, parSoiree: new Map<string, number>() };
    if (r.parSoiree.has(s.soiree)) continue; // une seule valeur par soirée
    r.parSoiree.set(s.soiree, s.score_du_jour);
    out.set(s.users_id, r);
  }
  for (const r of out.values()) {
    const vals = [...r.parSoiree.values()];
    r.n = vals.length;
    r.moyenne = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    r.meilleur = vals.length ? Math.max(...vals) : null;
  }
  return out;
}
