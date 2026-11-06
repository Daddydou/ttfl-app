// Affichage du x2 (bonus ×2) à côté d'un pick, partout dans l'application.
// Le x2 est LIÉ AU JOUEUR : on ne montre le badge que si le joueur affiché est bien celui du x2 (comparaison par nom normalisé).
// Soirée secrète du compte 02 : aucun badge (même règle que pour le joueur lui-même).
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliserNom } from "@/lib/planning";
import { soireeSecrete, type EtatSecret } from "@/lib/secret";

export type EtatBadgeX2 = "pose" | "voulu";
export interface EntreeX2 {
  etat: EtatBadgeX2;
  player: string;
}
export type CarteX2 = Record<string, EntreeX2>; // clé « compte|AAAA-MM-JJ » (objet simple : passe tel quel aux composants client)

export const cleX2 = (compte: string, date: string) => `${compte}|${String(date).slice(0, 10)}`;

interface LigneBrute {
  compte: string;
  pick_date: string;
  player: string;
  statut: string;
}

/** Construit la carte à partir des lignes de `ttfl_x2` (fonction pure, testée). */
export function construireCarteX2(
  lignes: LigneBrute[],
  secret?: { etat: EtatSecret; aujourdhui: string; maintenantMs: number },
): CarteX2 {
  const carte: CarteX2 = {};
  for (const l of lignes) {
    if (l.statut !== "pose" && l.statut !== "voulu") continue; // a_retirer / annule_site / echec : pas de badge
    const date = String(l.pick_date).slice(0, 10);
    if (secret && soireeSecrete(secret.etat, l.compte, date, secret.aujourdhui, secret.maintenantMs)) continue;
    carte[cleX2(l.compte, date)] = { etat: l.statut, player: l.player };
  }
  return carte;
}

/** Le x2 de ce compte et de cette soirée, seulement si le joueur affiché est celui du x2. */
export function x2Pour(carte: CarteX2 | undefined, compte: string, date: string, joueur?: string | null): EtatBadgeX2 | null {
  if (!carte || !joueur) return null;
  const e = carte[cleX2(compte, date)];
  if (!e) return null;
  return normaliserNom(e.player) === normaliserNom(joueur) ? e.etat : null;
}

/** Lit les lignes brutes (à lancer dans le Promise.all de la page, en même temps que le secret). Tolérant : erreur = aucune ligne. */
export async function lireLignesX2(supabase: SupabaseClient, depuis?: string): Promise<LigneBrute[]> {
  let q = supabase.from("ttfl_x2").select("compte,pick_date,player,statut").eq("mode", "regular").in("statut", ["pose", "voulu"]);
  if (depuis) q = q.gte("pick_date", depuis);
  const { data, error } = await q.returns<LigneBrute[]>();
  return error || !data ? [] : data;
}
