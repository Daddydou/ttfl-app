"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MODES_CLOUD, type ModeCloud } from "@/lib/cloud";

export type ResultatCloud = { ok: true; message: string } | { ok: false; error: string };

const MESSAGES: Record<ModeCloud, string> = {
  off: "Moteur cloud arrêté : seul le PC travaille.",
  simulation: "Moteur cloud en essai : il tourne à blanc aux heures prévues, le PC reste en charge.",
  reel: "Le cloud est en charge : le PC s'arrête de lui-même dès sa prochaine tâche.",
};

// Interrupteur du moteur dans le cloud (migration sans PC). Lu par Supabase (planning) et par chaque tâche du PC.
export async function reglerCloud(mode: string): Promise<ResultatCloud> {
  if (!MODES_CLOUD.includes(mode as ModeCloud)) return { ok: false, error: "Mode inconnu." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_cloud_reglage")
    .update({ mode, maj_le: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: MESSAGES[mode as ModeCloud] };
}
