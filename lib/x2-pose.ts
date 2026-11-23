// Pose du x2 (bonus ×2) à la main : logique serveur PARTAGÉE par tous les écrans où l'on pose ou modifie un joueur
// (Admin → x2, Conseillés, Mes picks, répartition, Plan 30...). 23/11/2026.
// Le x2 est lié au JOUEUR et à une SOIRÉE : une ligne ttfl_x2 par (compte, mois). Le robot (ttfl-auto) la pose sur le
// site au prochain passage, seulement si l'interrupteur x2 est en « réel » pour ce compte. Rien n'est calculé ici.
import type { createClient } from "@/lib/supabase/server";
import { normaliserNom } from "@/lib/planning";
import { libelleMois, moisDe, validerDemandeX2, type LigneX2 } from "@/lib/x2";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MODE_DB = "regular";

export interface AffectationX2 {
  compte: string;
  joueur: string;
}

export type EcritureX2 = { ok: true; message: string } | { ok: false; error: string };

const libComptes = (comptes: string[]) => (comptes.length > 1 ? `les comptes ${comptes.join(", ")}` : `le compte ${comptes[0]}`);

/** Lit toutes les lignes x2 (utile pour valider avant d'écrire). */
export async function chargerLignesX2(supabase: Supabase): Promise<{ lignes: LigneX2[]; erreur: string | null }> {
  const { data, error } = await supabase.from("ttfl_x2").select("*").eq("mode", MODE_DB).returns<LigneX2[]>();
  return { lignes: data ?? [], erreur: error ? error.message : null };
}

/**
 * Vérifie qu'un x2 peut être posé sur chaque (compte, joueur) de la soirée. Renvoie un message d'erreur ou null.
 * À appeler AVANT d'écrire le pick : si le x2 est refusé, rien n'est enregistré (pas de pick à moitié fait).
 */
export function verifierX2(args: {
  date: string;
  aujourdhui: string;
  affectations: AffectationX2[];
  lignes: Pick<LigneX2, "compte" | "mois" | "player" | "statut">[];
}): string | null {
  const { date, aujourdhui, affectations, lignes } = args;
  const plusieurs = new Set(affectations.map((a) => a.compte)).size > 1;
  for (const a of affectations) {
    const refus = validerDemandeX2({ compte: a.compte, date, aujourdhui, joueurDuPick: a.joueur, lignes });
    if (refus) return plusieurs ? `x2 impossible pour le compte ${a.compte} : ${refus}` : refus;
  }
  return null;
}

/** Écrit (ou déplace) le x2 du mois pour chaque compte, puis dit en clair ce qui va se passer. */
export async function ecrireX2(
  supabase: Supabase,
  date: string,
  affectations: AffectationX2[],
  lignes: Pick<LigneX2, "compte" | "mois" | "date_site">[],
): Promise<EcritureX2> {
  const mois = moisDe(date);
  const maj = new Date().toISOString();
  const { error } = await supabase.from("ttfl_x2").upsert(
    affectations.map((a) => ({
      mode: MODE_DB,
      compte: a.compte,
      mois,
      pick_date: date,
      player: a.joueur,
      joueur_cle: normaliserNom(a.joueur).replace(/ /g, ""),
      source: "app",
      statut: "voulu",
      date_site: lignes.find((l) => l.compte === a.compte && l.mois === mois)?.date_site ?? null,
      rang: null,
      message: "demandé depuis l'application",
      maj_le: maj,
    })),
    { onConflict: "mode,compte,mois" },
  );
  if (error) return { ok: false, error: error.message };

  const { data: reg } = await supabase
    .from("ttfl_x2_reglage")
    .select("mode,comptes_reels")
    .eq("id", 1)
    .maybeSingle<{ mode: string; comptes_reels: string[] }>();
  const comptes = affectations.map((a) => a.compte);
  const actifs = comptes.filter((c) => reg?.mode === "reel" && (reg.comptes_reels ?? []).includes(c));
  const inactifs = comptes.filter((c) => !actifs.includes(c));
  const parties: string[] = [];
  if (actifs.length > 0) {
    parties.push(`x2 de ${libelleMois(mois)} demandé pour ${libComptes(actifs)} : le robot le pose sur le site dans les 10 minutes.`);
  }
  if (inactifs.length > 0) {
    parties.push(
      `x2 enregistré pour ${libComptes(inactifs)}, mais le robot n'agit pas encore dessus (réglage « x2 » : ${reg?.mode ?? "off"}). Il sera posé dès que tu l'activeras.`,
    );
  }
  return { ok: true, message: parties.join(" ") };
}
