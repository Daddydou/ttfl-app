"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Mode } from "@/lib/types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// --- Picks -------------------------------------------------------------------

// Enregistre le pick du soir. La table a une contrainte unique (mode, pick_date)
// donc un upsert : re-picker le même soir remplace, il n'y a qu'un pick par soir.
export async function pickPlayer(
  mode: Mode,
  pickDate: string,
  player: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ttfl_picks")
    .upsert(
      { mode, pick_date: pickDate, player },
      { onConflict: "mode,pick_date" },
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/picks");
  revalidatePath("/stats");
  return { ok: true, message: `${player} enregistré comme pick du ${pickDate}.` };
}

// Saisit (ou corrige) le score réel d'un pick a posteriori. Le PC recalculera
// ttfl_season_stats à son prochain push ; on met aussi à jour l'affichage ici.
export async function setScore(
  pickId: number,
  score: number | null,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ttfl_picks")
    .update({ score })
    .eq("id", pickId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/picks");
  revalidatePath("/stats");
  return { ok: true };
}

export async function deletePick(pickId: number): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("ttfl_picks").delete().eq("id", pickId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/picks");
  revalidatePath("/stats");
  return { ok: true };
}

// --- Absents manuels ---------------------------------------------------------

export async function addAbsent(
  player: string,
  dateDebut: string,
  dateFin: string | null,
  raison: string | null,
): Promise<ActionResult> {
  if (!player.trim()) return { ok: false, error: "Nom du joueur requis." };
  if (dateFin && dateFin < dateDebut)
    return { ok: false, error: "La date de fin précède la date de début." };

  const supabase = createClient();
  const { error } = await supabase.from("ttfl_manual_absents").insert({
    player: player.trim(),
    date_debut: dateDebut,
    date_fin: dateFin,
    raison: raison?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/absents");
  return { ok: true, message: `${player.trim()} ajouté aux absents.` };
}

export async function deleteAbsent(id: number): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ttfl_manual_absents")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/absents");
  return { ok: true };
}
