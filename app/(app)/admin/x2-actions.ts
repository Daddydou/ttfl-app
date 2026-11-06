"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPTES_X2, MODES_X2, validerDemandeX2, libelleMois, type LigneX2, type ModeX2 } from "@/lib/x2";
import { aujourdhuiNY, normaliserNom } from "@/lib/planning";
import { refusSecret } from "@/lib/secret";

export type ResultatX2 = { ok: true; message: string } | { ok: false; error: string };

const MODE_DB = "regular";

function revalider() {
  revalidatePath("/admin", "layout");
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

  const [pickRes, lignesRes, regRes] = await Promise.all([
    supabase.from("ttfl_picks").select("player").eq("mode", MODE_DB).eq("compte", compte).eq("pick_date", date).maybeSingle<{ player: string }>(),
    supabase.from("ttfl_x2").select("*").eq("mode", MODE_DB).returns<LigneX2[]>(),
    supabase.from("ttfl_x2_reglage").select("mode,comptes_reels").eq("id", 1).maybeSingle<{ mode: string; comptes_reels: string[] }>(),
  ]);
  if (pickRes.error) return { ok: false, error: pickRes.error.message };
  if (lignesRes.error) return { ok: false, error: lignesRes.error.message };
  const lignes = lignesRes.data ?? [];
  const joueur = pickRes.data?.player ?? null;
  const refus = validerDemandeX2({ compte, date, aujourdhui, joueurDuPick: joueur, lignes });
  if (refus) return { ok: false, error: refus };

  const mois = date.slice(0, 7);
  const existante = lignes.find((l) => l.compte === compte && l.mois === mois);
  const { error } = await supabase.from("ttfl_x2").upsert(
    {
      mode: MODE_DB,
      compte,
      mois,
      pick_date: date,
      player: joueur,
      joueur_cle: normaliserNom(joueur as string).replace(/ /g, ""),
      source: "app",
      statut: "voulu",
      date_site: existante?.date_site ?? null,
      rang: null,
      message: "demandé depuis l'application",
      maj_le: new Date().toISOString(),
    },
    { onConflict: "mode,compte,mois" },
  );
  if (error) return { ok: false, error: error.message };
  revalider();
  const reg = regRes.data;
  const actif = reg?.mode === "reel" && (reg.comptes_reels ?? []).includes(compte);
  return {
    ok: true,
    message: actif
      ? `x2 de ${libelleMois(mois)} demandé pour le compte ${compte} : le robot le pose sur le site dans les 10 minutes.`
      : `x2 enregistré, mais le robot n'agit pas encore sur le compte ${compte} (réglage « x2 » : ${reg?.mode ?? "off"}). Il sera posé dès que tu l'activeras.`,
  };
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
