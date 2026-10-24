// « Toi vs les repères modèle » : comparaison À SOIRÉES ÉGALES.
// Avant, le total du compte 01 (toutes ses soirées) était comparé au total complet du repère, calculé parfois sur
// d'autres soirées (ex. repère commencé le 22/10, picks du 01 depuis le 20/10) : l'écart était faux. On ne compare
// maintenant que les soirées où le compte 01 ET le repère ont un score.

export interface DetailRepere {
  date: string;
  score: number;
}

export interface PickScore {
  pick_date: string;
  score: number | null;
}

export interface ComparaisonRepere {
  n: number; // soirées comparées
  toi: number; // ton total sur ces soirées
  repere: number; // total du repère sur ces mêmes soirées
  delta: number; // toi − repère
  moyenneToi: number | null;
  moyenneRepere: number | null;
}

export function comparerSurMemesSoirees(detail: DetailRepere[], picks: PickScore[]): ComparaisonRepere {
  const miens = new Map<string, number>();
  for (const p of picks) if (p.score !== null && p.score !== undefined) miens.set(String(p.pick_date).slice(0, 10), p.score);
  let n = 0;
  let toi = 0;
  let repere = 0;
  for (const d of detail) {
    const s = miens.get(String(d.date).slice(0, 10));
    if (s === undefined) continue;
    n += 1;
    toi += s;
    repere += d.score;
  }
  return {
    n,
    toi,
    repere,
    delta: toi - repere,
    moyenneToi: n ? toi / n : null,
    moyenneRepere: n ? repere / n : null,
  };
}
