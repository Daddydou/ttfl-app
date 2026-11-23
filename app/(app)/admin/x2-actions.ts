"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPTES_X2, MODES_X2, validerDemandeX2, type ModeX2 } from "@/lib/x2";
import { chargerLignesX2, ecrireX2, verifierX2 } from "@/lib/x2-pose";
import { aujourdhuiNY } from "@/lib/planning";
import { refusSecret } from "@/lib/secret";

export type ResultatX2 = { ok: true; message: string } | { ok: false; error: string };

const MODE_DB = "regular";

function revalider() {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/picks");
  revalidatePath("/ce-soir");
}

const MESSAGES: Record<ModeX2, string> = {
  off: "x2 arrêté : le moteur ne décide rien, le robot ne touche pas au x2.",
  blanc: "x2 à blanc : le moteur calcule et journalise, rien n'est posé sur le site.",
  reel: "x2 réel : le robot agit sur le site, pour les comptes cochés seulement.",
};

// Interrupteur du x2 : lu par le moteur (Python) et par le robot (Node). `comptes` = comptes sur lesquels le mode réel agit.
export async function reglerX2(mode: string, comptes: string[]): Promise<ResultatX2> {
  if (!MODES_X2.includes(mode as ModeX2)) return { ok: false, error: "Mode inconnu." };
  const liste = [...new Set(comptes)].filter((c) => COMPTES_X2.includes(c)).sort();
  if (mode === "reel" && liste.length === 0) {
    return { ok: false, error: "Coche au moins un compte avant de passer en réel (premier essai : un seul compte)." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_x2_reglage")
    .upsert({ id: 1, mode, comptes_reels: liste, maj_le: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  revalider();
  return { ok: true, message: `${MESSAGES[mode as ModeX2]}${mode === "reel" ? ` Comptes : ${liste.join(", ")}.` : ""}` };
}

// Pose (ou déplace) le x2 du mois sur une soirée : demandé à la main. Le robot le pose sur le site au prochain passage
// (≤ 10 min), seulement si le mode réel est actif pour ce compte. Le pick de la soirée doit exister (x2 lié au joueur).
export async function poserX2(compte: string, date: string): Promise<ResultatX2> {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const secret = await refusSecret(supabase, [compte], [date], aujourdhui);
  if (secret) return { ok: false, error: secret };

  const [pickRes, lignesRes] = await Promise.all([
    supabase.from("ttfl_picks").select("player").eq("mode", MODE_DB).eq("compte", compte).eq("pick_date", date).maybeSingle<{ player: string }>(),
    chargerLignesX2(supabase),
  ]);
  if (pickRes.error) return { ok: false, error: pickRes.error.message };
  if (lignesRes.erreur) return { ok: false, error: lignesRes.erreur };
  const lignes = lignesRes.lignes;
  const joueur = pickRes.data?.player ?? null;
  const refus = validerDemandeX2({ compte, date, aujourdhui, joueurDuPick: joueur, lignes });
  if (refus) return { ok: false, error: refus };

  const res = await ecrireX2(supabase, date, [{ compte, joueur: joueur as string }], lignes);
  if (res.ok) revalider();
  return res;
}

// Pose le x2 du mois sur le pick DÉJÀ enregistré de chaque compte donné, pour une soirée (sans toucher au joueur).
// Utilisé par le bouton « ×2 » à côté de « Changer » : un compte sans pick est simplement ignoré (et signalé).
export async function poserX2Comptes(date: string, comptes: string[]): Promise<ResultatX2> {
  const liste = [...new Set(comptes)].filter((c) => COMPTES_X2.includes(c));
  if (liste.length === 0) return { ok: false, error: "Aucun compte valide." };
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const secret = await refusSecret(supabase, liste, [date], aujourdhui);
  if (secret) return { ok: false, error: secret };

  const [picksRes, lignesRes] = await Promise.all([
    supabase.from("ttfl_picks").select("compte,player").eq("mode", MODE_DB).eq("pick_date", date).in("compte", liste).returns<{ compte: string; player: string }[]>(),
    chargerLignesX2(supabase),
  ]);
  if (picksRes.error) return { ok: false, error: picksRes.error.message };
  if (lignesRes.erreur) return { ok: false, error: lignesRes.erreur };
  const affectations = (picksRes.data ?? []).map((p) => ({ compte: p.compte, joueur: p.player }));
  if (affectations.length === 0) return { ok: false, error: "Il faut d'abord un pick sur cette soirée : le x2 est lié au joueur." };

  const refus = verifierX2({ date, aujourdhui, affectations, lignes: lignesRes.lignes });
  if (refus) return { ok: false, error: refus };
  const res = await ecrireX2(supabase, date, affectations, lignesRes.lignes);
  if (!res.ok) return res;
  revalider();
  const sansPick = liste.filter((c) => !affectations.some((a) => a.compte === c));
  return { ok: true, message: sansPick.length > 0 ? `${res.message} (Sans pick, ignoré : ${sansPick.join(", ")}.)` : res.message };
}

// Retire le x2 du mois : le robot le retire du site au prochain passage.
export async function retirerX2(compte: string, mois: string): Promise<ResultatX2> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ttfl_x2")
    .select("pick_date,date_site")
    .eq("mode", MODE_DB)
    .eq("compte", compte)
    .eq("mois", mois)
    .maybeSingle<{ pick_date: string; date_site: string | null }>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Aucun x2 enregistré pour ce mois." };
  const secret = await refusSecret(supabase, [compte], [data.pick_date.slice(0, 10)], aujourdhuiNY());
  if (secret) return { ok: false, error: secret };
  const requete = data.date_site
    ? supabase.from("ttfl_x2").update({ statut: "a_retirer", message: "retrait demandé depuis l'application", maj_le: new Date().toISOString() })
    : supabase.from("ttfl_x2").delete();
  const { error: e2 } = await requete.eq("mode", MODE_DB).eq("compte", compte).eq("mois", mois);
  if (e2) return { ok: false, error: e2.message };
  revalider();
  return {
    ok: true,
    message: data.date_site
      ? `Retrait demandé : le robot enlève le x2 du site dans les 10 minutes. Le moteur en proposera un autre ce mois-ci si le compte est automatique (02 à 13).`
      : "x2 prévu annulé (il n'était pas encore posé sur le site).",
  };
}
