// Récap « Top 30 de la nuit » (page d'accueil). LECTURE SEULE : les scores viennent de la table
// `ttfl_resultats_nuit`, remplie chaque matin par le moteur (pont/resultats_nuit.py). Rien n'est recalculé ici.
import { normaliserNom } from "@/lib/planning";

export const TAILLE_TOP = 30;

export interface LigneNuit {
  player: string;
  team: string | null;
  ttfl: number;
  minutes: number | null;
}

export interface LigneClassee extends LigneNuit {
  /** Rang de la soirée : les ex aequo partagent le même rang (1, 2, 2, 4…). */
  rang: number;
  /** Vrai pour le pick du compte de référence (mise en évidence). */
  monPick: boolean;
}

/** Toute la soirée classée par score décroissant (égalité : ordre alphabétique, rang identique). */
export function classerNuit(lignes: LigneNuit[], monPick: string | null = null): LigneClassee[] {
  const tri = [...lignes].sort((a, b) => b.ttfl - a.ttfl || a.player.localeCompare(b.player, "fr"));
  const cle = monPick ? normaliserNom(monPick) : null;
  let rang = 0;
  return tri.map((l, i) => {
    if (i === 0 || l.ttfl !== tri[i - 1].ttfl) rang = i + 1;
    return { ...l, rang, monPick: cle !== null && normaliserNom(l.player) === cle };
  });
}

export function topNuit(classees: LigneClassee[], n: number = TAILLE_TOP): LigneClassee[] {
  return classees.slice(0, n);
}

export interface ResultatPick {
  nom: string;
  /** null = le joueur n'a pas de score cette soirée (il n'a pas joué : 0 point). */
  rang: number | null;
  ttfl: number | null;
}

export function resultatDuPick(classees: LigneClassee[], pick: string | null): ResultatPick | null {
  if (!pick) return null;
  const l = classees.find((c) => c.monPick);
  return l ? { nom: pick, rang: l.rang, ttfl: l.ttfl } : { nom: pick, rang: null, ttfl: null };
}

export function rangOrdinal(rang: number): string {
  return rang === 1 ? "1er" : `${rang}e`;
}

export function scoreAffiche(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/** « mardi 17 novembre » (date de la soirée NBA, New York). */
export function titreSoiree(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
