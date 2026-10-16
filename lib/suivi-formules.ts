// Suivi des formules du Plan 30 : logique PURE d'affichage (aucun accès réseau).
//
// Le PC (ttfl/pont/plan30_suivi.py) fait jouer chaque formule sur un compte VIRTUEL (jamais envoyé sur TTFL) avec son
// propre cycle de 30 jours, plus une base « glouton » (la meilleure projection du soir), et remplit le score TTFL réel
// le lendemain. Ici on compare : même échantillon de soirées pour tout le monde, sinon la comparaison serait faussée.

export const GLOUTON = "glouton";

export interface LigneSuivi {
  profil: string;
  pick_date: string; // AAAA-MM-JJ
  joueur: string;
  projection: number | null;
  score_reel: number | null;
}

export interface ResumeFormule {
  profil: string;
  total: number;
  moyenne: number | null;
  joursAZero: number;
  ecartGlouton: number | null; // null pour la base elle-même ou s'il n'y a pas de base
}

export interface RapportSuivi {
  soirees: number; // soirées notées pour TOUS les comptes virtuels
  enAttente: number; // picks dont le score réel n'est pas encore connu
  formules: ResumeFormule[]; // meilleur total d'abord
}

const arrondi = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

export function rapportSuivi(lignes: LigneSuivi[]): RapportSuivi {
  const profils = [...new Set(lignes.map((l) => l.profil))];
  const parSoiree = new Map<string, Map<string, number>>();
  let enAttente = 0;
  for (const l of lignes) {
    if (l.score_reel === null || l.score_reel === undefined) {
      enAttente += 1;
      continue;
    }
    const d = l.pick_date.slice(0, 10);
    if (!parSoiree.has(d)) parSoiree.set(d, new Map());
    parSoiree.get(d)!.set(l.profil, Number(l.score_reel));
  }
  const communes = [...parSoiree.entries()].filter(([, s]) => profils.every((p) => s.has(p))).map(([d]) => d);

  const brut = profils.map((profil) => {
    const scores = communes.map((d) => parSoiree.get(d)!.get(profil)!);
    const total = scores.reduce((a, b) => a + b, 0);
    return {
      profil,
      total: arrondi(total),
      moyenne: scores.length ? arrondi(total / scores.length, 2) : null,
      joursAZero: scores.filter((s) => s === 0).length,
    };
  });
  const base = brut.find((f) => f.profil === GLOUTON)?.total ?? null;
  const formules: ResumeFormule[] = brut
    .map((f) => ({
      ...f,
      ecartGlouton: f.profil === GLOUTON || base === null ? null : arrondi(f.total - base),
    }))
    .sort((a, b) => b.total - a.total);
  return { soirees: communes.length, enAttente, formules };
}
