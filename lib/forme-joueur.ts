// Forme récente d'un joueur (logique PURE). Les chiffres viennent du moteur (moteur/historique.py) ; ici seulement de la
// mise en phrases : aucun score n'est recalculé.

import type { HistoriqueJoueur } from "@/lib/types";

export const SEUIL_BON_SOIR = 40; // même repère que « S'il joue » (chances de faire 40 ou plus)
const ECART_TENDANCE = 2; // en dessous de 2 points d'écart entre moy5 et moy10, la forme est dite stable

const f1 = (n: number): string => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f0 = (n: number): string => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

// « dim. 25 oct. » : date du match à New York, sans dépendre du fuseau de l'appareil.
export function dateCourte(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export type Tendance = "hausse" | "baisse" | "stable";

// Forme des 5 derniers matchs comparée à celle des 10 derniers (il faut au moins 6 matchs pour que ça veuille dire).
export function tendance(h: HistoriqueJoueur): Tendance | null {
  if (h.n10 < 6 || h.moy5 === null || h.moy10 === null) return null;
  const ecart = h.moy5 - h.moy10;
  if (ecart >= ECART_TENDANCE) return "hausse";
  if (ecart <= -ECART_TENDANCE) return "baisse";
  return "stable";
}

const LIBELLE_TENDANCE: Record<Tendance, string> = {
  hausse: "en hausse sur les 5 derniers matchs",
  baisse: "en baisse sur les 5 derniers matchs",
  stable: "forme stable",
};

// Lecture de la forme en une ou deux phrases : ce que montrent les derniers matchs, et ce que la forme affichée mélange.
export function lectureForme(h: HistoriqueJoueur): string {
  if (h.moy10 === null || h.n10 === 0) return "Pas encore de match joué cette saison.";
  const n = h.n10;
  const portee = n >= 10 ? "ses 10 derniers matchs" : n === 1 ? "son seul match de la saison" : `ses ${n} matchs de la saison`;
  let debut = `${f1(h.moy10)} de moyenne TTFL sur ${portee}`;
  if (h.min10 !== null) debut += `, ${f0(h.min10)} min par match`;
  const t = tendance(h);
  let phrase = `${debut}${t ? ` · ${LIBELLE_TENDANCE[t]}` : ""}.`;
  if (h.prior !== undefined && (h.poids_prior ?? 0) >= 0.2) {
    phrase += ` La forme affichée mélange cette saison avec la précédente (${f1(h.prior)} de moyenne) : ${f0((h.poids_prior ?? 0) * 100)} % pour la saison passée, car peu de matchs sont joués.`;
  }
  return phrase;
}

export interface Repere {
  libelle: string;
  valeur: string;
}

// Repères chiffrés, dans l'ordre d'affichage. Un repère sans donnée (ou sans sens, faute de matchs) est omis.
export function reperes(h: HistoriqueJoueur): Repere[] {
  const out: Repere[] = [];
  const sur = h.n10 >= 10 ? "10 matchs" : `${h.n10} match${h.n10 > 1 ? "s" : ""}`;
  if (h.moy5 !== null && h.n10 > 5) out.push({ libelle: "Moyenne 5 matchs", valeur: f1(h.moy5) });
  if (h.moy10 !== null) out.push({ libelle: `Moyenne ${sur}`, valeur: f1(h.moy10) });
  if (h.saison.moy !== null && h.saison.n > h.n10) out.push({ libelle: `Saison (${h.saison.n} matchs)`, valeur: f1(h.saison.moy) });
  if (h.mediane10 !== null && h.n10 >= 3) out.push({ libelle: "Médiane", valeur: f1(h.mediane10) });
  if (h.meilleur10 !== null && h.pire10 !== null && h.n10 >= 2) {
    out.push({ libelle: "Meilleur · pire", valeur: `${f0(h.meilleur10)} · ${f0(h.pire10)}` });
  }
  if (h.n10 >= 3) out.push({ libelle: `Matchs à ${SEUIL_BON_SOIR}+`, valeur: `${h.bons_soirs10} sur ${h.n10}` });
  if (h.ecart10 !== null) out.push({ libelle: "Irrégularité (± pts)", valeur: f1(h.ecart10) });
  if (h.min10 !== null) out.push({ libelle: "Minutes / match", valeur: f0(h.min10) });
  if (h.pts10 !== null && h.reb10 !== null && h.pds10 !== null) {
    out.push({ libelle: "Pts · reb · pds", valeur: `${f1(h.pts10)} · ${f1(h.reb10)} · ${f1(h.pds10)}` });
  }
  return out;
}

// Historiques par nom de joueur (normalisé), en gardant la première ligne rencontrée : l'appelant trie du plus récent au
// plus ancien. Sert au Plan 30 jours, qui ne porte pas lui-même l'historique.
export function indexerHistoriques(
  lignes: { player: string; historique?: HistoriqueJoueur | null }[],
  normaliser: (nom: string) => string,
): Record<string, HistoriqueJoueur> {
  const out: Record<string, HistoriqueJoueur> = {};
  for (const l of lignes) {
    const cle = normaliser(l.player);
    if (l.historique && !(cle in out)) out[cle] = l.historique;
  }
  return out;
}
