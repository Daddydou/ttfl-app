// Historique « Mes picks » : les 13 comptes, leurs totaux de points (24/10/2026).
import { COMPTE_REF } from "@/lib/compte";
import { pointsSite } from "@/lib/stats-equipe";
import type { TtflPick } from "@/lib/types";

// Les 13 comptes de l'historique, dans l'ordre d'affichage.
export const COMPTES_HISTORIQUE = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, "0"));

export interface ResumeCompte {
  compte: string;
  picks: number;
  notes: number;
  total: number;
  moyenne: number | null;
}

// Total et moyenne par compte (seuls les picks notés comptent).
export function resumerComptes(picks: TtflPick[], comptes: string[] = COMPTES_HISTORIQUE): ResumeCompte[] {
  return comptes.map((compte) => {
    const lignes = picks.filter((p) => p.compte === compte);
    const notes = lignes.filter((p) => p.score !== null);
    const total = notes.reduce((s, p) => s + pointsSite(p), 0); // points du site : x2 compté
    const brut = notes.reduce((s, p) => s + (p.score ?? 0), 0); // la moyenne reste sur le score brut des picks
    return { compte, picks: lignes.length, notes: notes.length, total, moyenne: notes.length ? brut / notes.length : null };
  });
}

// Compte demandé dans l'adresse (?compte=07) ; inconnu ou absent : le compte principal.
export function compteValide(c?: string): string {
  return c && COMPTES_HISTORIQUE.includes(c) ? c : COMPTE_REF;
}
