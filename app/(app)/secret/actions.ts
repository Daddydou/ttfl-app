"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aujourdhuiNY, ajouterJours } from "@/lib/planning";

export type ResultatSecret = { ok: true; message: string } | { ok: false; error: string };

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

function revalider() {
  revalidatePath("/");
  revalidatePath("/ce-soir");
  revalidatePath("/picks");
  revalidatePath("/admin");
}

// Force la révélation du pick du compte 02 pour UNE soirée (à venir ou en cours). Pas de notification : tu le vois
// déjà dans l'application. Les heures de clôture écrites par le PC (cloture) ne sont pas touchées.
export async function revelerSoiree(soiree: string): Promise<ResultatSecret> {
  if (!DATE_ISO.test(soiree)) return { ok: false, error: "Date invalide." };
  const aujourdhui = aujourdhuiNY();
  if (soiree < aujourdhui || soiree > ajouterJours(aujourdhui, 14)) {
    return { ok: false, error: "Cette soirée n'est pas à venir : rien à révéler." };
  }
  const supabase = await createClient();
  const maintenant = new Date().toISOString();
  const { error } = await supabase
    .from("ttfl_secret_pick")
    .upsert({ soiree, revele_le: maintenant, motif: "force", notifie_le: maintenant, maj_le: maintenant }, { onConflict: "soiree" });
  if (error) return { ok: false, error: error.message };
  revalider();
  return { ok: true, message: "Pick révélé pour cette soirée." };
}

// Interrupteur général : éteint = plus aucun secret (tout est visible et le PC n'envoie plus de notification de
// clôture) ; allumé = le secret s'applique aux soirées pas encore révélées ni closes.
export async function reglerSecret(actif: boolean): Promise<ResultatSecret> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_secret_reglage")
    .update({ actif: !!actif, maj_le: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalider();
  return { ok: true, message: actif ? "Pick secret activé." : "Pick secret désactivé : tout est visible." };
}
