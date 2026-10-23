"use server";

import { createClient } from "@/lib/supabase/server";
import { validerAbonnement } from "@/lib/push";

export type ResultatPush = { ok: true } | { ok: false; error: string };

// Range l'abonnement push de CET appareil (un par appareil). Règle de la base : seul le propriétaire peut écrire.
export async function enregistrerAbonnement(brut: unknown): Promise<ResultatPush> {
  const v = validerAbonnement(brut);
  if (!v.ok) return { ok: false, error: v.erreur };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Session expirée : reconnecte-toi." };
  const { error } = await supabase.from("ttfl_push_abonnements").upsert(v.abonnement, { onConflict: "endpoint" });
  if (error) return { ok: false, error: "Enregistrement impossible (la table des abonnements existe-t-elle ?)." };
  return { ok: true };
}

export async function supprimerAbonnement(endpoint: string): Promise<ResultatPush> {
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint)) return { ok: false, error: "Adresse invalide." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Session expirée : reconnecte-toi." };
  const { error } = await supabase.from("ttfl_push_abonnements").delete().eq("endpoint", endpoint);
  return error ? { ok: false, error: "Suppression impossible." } : { ok: true };
}
