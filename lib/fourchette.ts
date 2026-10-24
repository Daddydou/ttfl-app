// Fourchette de score d'un pick : « mauvais soir / soir moyen / bon soir » + chance de dépasser 40.
//
// Les chiffres viennent de l'étude B14 du 24/10/2026 (ttfl/recherche/etude_b14_fourchette.py) : rejeu sur
// 4 saisons NBA (2022-23 à 2025-26), score TTFL RÉEL des joueurs classés par projection (forme + saison passée
// + plafond, sans match-up). Valables QUAND LE JOUEUR JOUE : un absent compte 0, ce n'est pas dans ces chiffres.
// Pour les recalibrer : relancer `python -m recherche.etude_b14_fourchette` et copier donnees/fourchette_calibrage.json ici.
//
// Point important : la projection du moteur n'est PAS une moyenne attendue. Elle contient volontairement une part
// de « plafond » (le bon soir du joueur) ; une projection de 43 donne en moyenne ≈ 34 de score réel.

export interface Fourchette {
  mauvais: number; // 1 soir sur 10 fait moins que ça (P10)
  moyen: number; // moyenne réelle
  median: number; // P50
  bon: number; // 1 soir sur 10 fait plus que ça (P90)
  chance40: number; // probabilité de faire 40 points ou plus (0 à 1)
  chance50: number; // probabilité de faire 50 points ou plus (0 à 1)
}

// Centre de chaque tranche de projection (moyenne des projections de la tranche, arrondie) et mesures réelles.
const POINTS: { proj: number; f: Fourchette }[] = [
  { proj: 30, f: { mauvais: 8, moyen: 23.9, median: 23, bon: 40, chance40: 0.11, chance50: 0.03 } },
  { proj: 34, f: { mauvais: 11, moyen: 27.5, median: 27, bon: 45, chance40: 0.18, chance50: 0.06 } },
  { proj: 38, f: { mauvais: 14, moyen: 31.0, median: 31, bon: 49, chance40: 0.27, chance50: 0.09 } },
  { proj: 42, f: { mauvais: 16, moyen: 34.4, median: 34, bon: 53, chance40: 0.36, chance50: 0.15 } },
  { proj: 46, f: { mauvais: 19, moyen: 37.0, median: 37, bon: 55, chance40: 0.43, chance50: 0.19 } },
  { proj: 51, f: { mauvais: 22, moyen: 40.6, median: 40, bon: 59, chance40: 0.52, chance50: 0.27 } },
  { proj: 60, f: { mauvais: 31, moyen: 50.8, median: 51, bon: 70, chance40: 0.76, chance50: 0.55 } },
];

const CLES: (keyof Fourchette)[] = ["mauvais", "moyen", "median", "bon", "chance40", "chance50"];

/** Fourchette pour une projection donnée (interpolation entre tranches, plafonnée aux extrémités). */
export function fourchette(projection: number | null | undefined): Fourchette | null {
  if (projection == null || !Number.isFinite(projection)) return null;
  if (projection <= POINTS[0].proj) return { ...POINTS[0].f };
  const dernier = POINTS[POINTS.length - 1];
  if (projection >= dernier.proj) return { ...dernier.f };
  for (let i = 1; i < POINTS.length; i++) {
    const b = POINTS[i];
    if (projection <= b.proj) {
      const a = POINTS[i - 1];
      const t = (projection - a.proj) / (b.proj - a.proj);
      const out = {} as Fourchette;
      for (const k of CLES) out[k] = a.f[k] + (b.f[k] - a.f[k]) * t;
      return out;
    }
  }
  return { ...dernier.f };
}

/** Phrase courte et lisible : « Mauvais soir ≈ 16 · moyen ≈ 34 · bon soir ≈ 53 — 36 % de chances de faire 40 ou plus ». */
export function phraseFourchette(projection: number | null | undefined): string | null {
  const f = fourchette(projection);
  if (!f) return null;
  const pct = Math.round(f.chance40 * 100);
  return `Mauvais soir ≈ ${Math.round(f.mauvais)} · moyen ≈ ${Math.round(f.moyen)} · bon soir ≈ ${Math.round(f.bon)} — ${pct} % de chances de faire 40 ou plus`;
}
