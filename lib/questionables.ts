// Joueurs « Questionable » à afficher à côté d'un joueur pické (règle d'affichage du 2026-11-18).
//
// Lecture seule : le moteur relève le rapport de blessures toutes les 15 à 30 minutes et écrit UNE ligne à chaque
// changement de statut dans ttfl_blesses_historique (game_date, joueur_norm, statut). Le dernier statut connu d'un joueur
// pour une soirée est donc le plus récent. L'application n'en tire que l'affichage : aucune décision ici (la règle de
// remplacement vit dans le moteur et le robot).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ajouterJours, aujourdhuiNY } from "@/lib/planning";

// Nombre de soirées à venir couvertes (aujourd'hui compris) : au-delà, le rapport officiel n'existe pas encore.
export const SOIREES_COUVERTES = 4;

// Même clé que le moteur (moteur/injuries.normalize_name) : accents retirés, tout ce qui n'est pas lettre ou chiffre retiré.
export function cleCompacte(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Clé d'un (soirée, joueur) dans l'ensemble renvoyé par `lireQuestionables`.
export function cleQuestionable(date: string, joueur: string): string {
  return `${date.slice(0, 10)}|${cleCompacte(joueur)}`;
}

interface LigneHistorique {
  game_date: string;
  joueur_norm: string;
  statut: string;
}

// Dernier statut de chaque (soirée, joueur) puis on ne garde que les Questionable. Lignes dans l'ordre des changements.
export function questionablesDepuis(lignes: LigneHistorique[]): string[] {
  const dernier = new Map<string, string>();
  for (const l of lignes) dernier.set(`${String(l.game_date).slice(0, 10)}|${l.joueur_norm}`, l.statut);
  return [...dernier.entries()].filter(([, statut]) => statut.toLowerCase() === "questionable").map(([cle]) => cle);
}

// Clés « soirée|joueur » des Questionable des prochaines soirées. Ne lève jamais d'erreur : en cas de souci de lecture,
// aucune pastille n'est affichée (le reste de la page n'en dépend pas).
export async function lireQuestionables(supabase: SupabaseClient): Promise<string[]> {
  try {
    const debut = aujourdhuiNY();
    const fin = ajouterJours(debut, SOIREES_COUVERTES - 1);
    const { data, error } = await supabase
      .from("ttfl_blesses_historique")
      .select("game_date,joueur_norm,statut")
      .gte("game_date", debut)
      .lte("game_date", fin)
      .order("id", { ascending: true })
      .limit(5000)
      .returns<LigneHistorique[]>();
    if (error || !data) return [];
    return questionablesDepuis(data);
  } catch {
    return [];
  }
}
