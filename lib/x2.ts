// x2 (bonus ×2) : logique pure de l'application. Décisions du 06/11/2026.
// Le x2 est posé sur une SOIRÉE du site mais il est LIÉ AU JOUEUR : si le pick de la soirée change, le robot le retire.
// L'application ne calcule pas le choix automatique (comptes 02 à 13 : c'est le moteur) ; elle permet de régler
// l'interrupteur, de poser ou retirer un x2 à la main, et de voir l'état de la saison.
import { normaliserNom } from "@/lib/planning";

export const MODES_X2 = ["off", "blanc", "reel"] as const;
export type ModeX2 = (typeof MODES_X2)[number];

export const LIBELLES_X2: Record<ModeX2, { titre: string; detail: string }> = {
  off: { titre: "Arrêté", detail: "Le moteur ne décide rien et le robot ne touche pas au x2." },
  blanc: {
    titre: "À blanc",
    detail: "Le moteur calcule et journalise ce qu'il ferait. Rien n'est posé ni retiré sur le site.",
  },
  reel: {
    titre: "Réel",
    detail: "Le moteur décide et le robot pose / retire le x2 sur le site, mais SEULEMENT pour les comptes cochés ci-dessous.",
  },
};

export function lireModeX2(valeur: unknown): ModeX2 {
  return MODES_X2.includes(valeur as ModeX2) ? (valeur as ModeX2) : "off";
}

export const MOIS_SAISON = ["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"] as const;
export const COMPTES_X2 = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, "0"));
export const COMPTES_AUTO_X2 = COMPTES_X2.filter((c) => c !== "01"); // le 01 reste à la main

export type StatutX2 = "voulu" | "pose" | "a_retirer" | "annule_site" | "echec";

export interface LigneX2 {
  compte: string;
  mois: string;
  pick_date: string;
  player: string;
  source: "app" | "auto" | "site";
  statut: StatutX2;
  date_site: string | null;
  message: string | null;
  rang: number | null;
}

export const LIBELLES_STATUT: Record<StatutX2, string> = {
  voulu: "Prévu (pas encore posé)",
  pose: "Posé sur le site",
  a_retirer: "À retirer",
  annule_site: "Retiré à la main sur le site",
  echec: "Échec (nouvel essai au prochain passage)",
};

export function libelleMois(mois: string): string {
  const d = new Date(`${mois}-01T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function moisDe(date: string): string {
  return date.slice(0, 7);
}

/** Vérifie une demande de x2 faite à la main (bouton de l'application). Renvoie un message d'erreur ou null. */
export function validerDemandeX2(args: {
  compte: string;
  date: string;
  aujourdhui: string;
  joueurDuPick: string | null;
  lignes: Pick<LigneX2, "compte" | "mois" | "player" | "statut">[];
}): string | null {
  const { compte, date, aujourdhui, joueurDuPick, lignes } = args;
  if (!COMPTES_X2.includes(compte)) return "Compte inconnu.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Date invalide.";
  const mois = moisDe(date);
  if (!(MOIS_SAISON as readonly string[]).includes(mois)) return "Pas de x2 en dehors de novembre 2026 → avril 2027.";
  if (date < aujourdhui) return "Cette soirée est passée.";
  if (!joueurDuPick) return "Il faut d'abord un pick sur cette soirée : le x2 est lié au joueur.";
  const cle = normaliserNom(joueurDuPick);
  const dejaUtilise = lignes.find(
    (l) => l.compte === compte && l.mois !== mois && ["voulu", "pose"].includes(l.statut) && normaliserNom(l.player) === cle,
  );
  if (dejaUtilise) return `Ce joueur a déjà reçu un x2 sur le compte ${compte} (${libelleMois(dejaUtilise.mois)}) : un joueur ne reçoit qu'un seul x2 par saison.`;
  return null;
}

/** Synthèse par compte : un état par mois de la saison (null = rien de prévu). */
export function grilleSaison(lignes: LigneX2[], comptes: string[] = COMPTES_X2): { compte: string; mois: Record<string, LigneX2 | null> }[] {
  return comptes.map((compte) => ({
    compte,
    mois: Object.fromEntries(MOIS_SAISON.map((m) => [m, lignes.find((l) => l.compte === compte && l.mois === m) ?? null])),
  }));
}
