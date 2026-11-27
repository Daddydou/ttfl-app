// Carte « Ce soir » de l'Accueil : tous les comptes en une vue (27/11/2026). Logique PURE, testable seule.
// LECTURE SEULE : rien n'est calculé ici, on ne fait que relier le pick voulu (ttfl_picks) à ce que le site TTFL a
// réellement (ttfl_envois, statut « confirme »).
import { COMPTES_EQUIPE, normaliserNom } from "@/lib/planning";

// Ordre d'affichage : 01, 02, puis l'équipe 03 à 12, puis 13.
export const COMPTES_CE_SOIR = ["01", "02", ...COMPTES_EQUIPE, "13"];

// Page Conseillés du compte : 01, 02 et 13 ont leur zone ; les comptes 03 à 12 passent par la zone équipe, vue pour UN compte.
export function hrefConseilles(compte: string): string {
  if (compte === "01" || compte === "02" || compte === "13") return `/ce-soir?pour=c${compte}`;
  return `/ce-soir?pour=equipe&compte=${compte}`;
}

export interface EnvoiSoir {
  compte: string;
  joueur: string | null;
  joueur_site?: string | null;
  statut: string;
}

// Comptes dont le pick voulu est CONFIRMÉ sur le site : statut « confirme » ET même joueur que le pick de l'application
// (un pick changé dans l'application mais pas encore renvoyé ne doit pas être vert).
export function comptesPosesSurTtfl(
  envois: EnvoiSoir[],
  picks: { compte: string; player: string }[],
): Set<string> {
  const voulu = new Map(picks.map((p) => [p.compte, normaliserNom(p.player)]));
  const poses = new Set<string>();
  for (const e of envois) {
    if (e.statut !== "confirme") continue;
    const surLeSite = e.joueur_site || e.joueur;
    if (surLeSite && voulu.get(e.compte) === normaliserNom(surLeSite)) poses.add(e.compte);
  }
  return poses;
}
