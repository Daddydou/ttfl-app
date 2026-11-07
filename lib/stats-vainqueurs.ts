// Statistiques « Vainqueurs » : mes pronos face aux résultats réels, et la fiabilité des cotes. Logique PURE, testée dans
// tests/stats-vainqueurs.test.ts. Seuls les matchs terminés (résultat connu) comptent.

import { choixEffectif, type ChoixVainqueur, type MatchVainqueur } from "@/lib/vainqueurs";
import { grouper, pourcent } from "@/lib/stats-outils";

type Choix = Map<string, ChoixVainqueur>;

const termines = (ms: MatchVainqueur[]) => ms.filter((m) => m.resultat);

export interface BilanVainqueurs {
  juges: number; // matchs terminés où j'avais un choix
  bons: number;
  taux: number | null; // % de bons pronos
  favorisJuges: number; // matchs terminés avec un favori connu
  favorisGagnent: number;
  tauxFavori: number | null; // % de fois où le favori des cotes a gagné
  suivisFavori: number; // mes choix identiques au favori
  partFavoriSuivi: number | null;
  outsiders: { n: number; bons: number; taux: number | null }; // quand j'ai pris l'autre équipe que le favori
}

export function bilanVainqueurs(matchs: MatchVainqueur[], choix: Choix): BilanVainqueurs {
  let juges = 0;
  let bons = 0;
  let suivis = 0;
  let outN = 0;
  let outBons = 0;
  let favJuges = 0;
  let favGagnent = 0;
  for (const m of termines(matchs)) {
    if (m.favori) {
      favJuges += 1;
      if (m.favori === m.resultat) favGagnent += 1;
    }
    const eff = choixEffectif(m, choix.get(m.event_id));
    if (!eff) continue;
    juges += 1;
    const bon = eff === m.resultat;
    if (bon) bons += 1;
    if (m.favori && eff === m.favori) suivis += 1;
    else if (m.favori) {
      outN += 1;
      if (bon) outBons += 1;
    }
  }
  return {
    juges,
    bons,
    taux: pourcent(bons, juges),
    favorisJuges: favJuges,
    favorisGagnent: favGagnent,
    tauxFavori: pourcent(favGagnent, favJuges),
    suivisFavori: suivis,
    partFavoriSuivi: pourcent(suivis, juges),
    outsiders: { n: outN, bons: outBons, taux: pourcent(outBons, outN) },
  };
}

export interface SoireeProno {
  date: string;
  juges: number;
  bons: number;
  taux: number | null;
}

export function parSoireeProno(matchs: MatchVainqueur[], choix: Choix): SoireeProno[] {
  const groupes = grouper(termines(matchs), (m) => m.game_date.slice(0, 10));
  return [...groupes.entries()]
    .map(([date, ms]) => {
      let juges = 0;
      let bons = 0;
      for (const m of ms) {
        const eff = choixEffectif(m, choix.get(m.event_id));
        if (!eff) continue;
        juges += 1;
        if (eff === m.resultat) bons += 1;
      }
      return { date, juges, bons, taux: pourcent(bons, juges) };
    })
    .filter((s) => s.juges > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface Tranche {
  label: string;
  n: number;
  gagnent: number;
  taux: number | null;
}

// Le favori gagne-t-il aussi souvent que les cotes le disent ? Par tranche de probabilité du favori.
export function parTranche(matchs: MatchVainqueur[]): Tranche[] {
  const defs = [
    { label: "50–60 %", min: 0.5, max: 0.6 },
    { label: "60–70 %", min: 0.6, max: 0.7 },
    { label: "70–80 %", min: 0.7, max: 0.8 },
    { label: "80 % et +", min: 0.8, max: 1.0001 },
  ];
  const jouables = termines(matchs).filter((m) => m.favori && m.prob_dom !== null && m.prob_dom !== undefined);
  return defs.map((d) => {
    const dedans = jouables.filter((m) => {
      const p = Math.max(Number(m.prob_dom), 1 - Number(m.prob_dom));
      return p >= d.min && p < d.max;
    });
    const gagnent = dedans.filter((m) => m.favori === m.resultat).length;
    return { label: d.label, n: dedans.length, gagnent, taux: pourcent(gagnent, dedans.length) };
  });
}

// Matchs « serrés » (cotes quasi égales) : mon taux de réussite dessus.
export function surMatchsSerres(matchs: MatchVainqueur[], choix: Choix): { n: number; bons: number; taux: number | null } {
  let n = 0;
  let bons = 0;
  for (const m of termines(matchs).filter((x) => x.serre)) {
    const eff = choixEffectif(m, choix.get(m.event_id));
    if (!eff) continue;
    n += 1;
    if (eff === m.resultat) bons += 1;
  }
  return { n, bons, taux: pourcent(bons, n) };
}
