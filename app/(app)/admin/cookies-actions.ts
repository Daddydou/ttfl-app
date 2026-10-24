"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPTES_COOKIES, validerCookie } from "@/lib/cookies";
import { poserSecretCookie, secretsConfigures } from "@/lib/github-secrets";

export type ResultatCookie = { ok: true; message: string } | { ok: false; error: string };

// Renouvelle le cookie d'un compte depuis le téléphone : le pose comme secret GitHub (COOKIE_xx), note la date du
// renouvellement, puis demande le contrôle des 13 connexions (exécuté dans le cloud) pour vérifier qu'il marche.
// La valeur du cookie n'est ni journalisée, ni renvoyée, ni stockée dans la base.
export async function renouvelerCookie(compte: string, cookieBrut: string): Promise<ResultatCookie> {
  if (!COMPTES_COOKIES.includes(compte)) return { ok: false, error: "Compte inconnu." };
  const v = validerCookie(cookieBrut);
  if (!v.ok) return { ok: false, error: v.erreur };
  if (!secretsConfigures()) {
    return { ok: false, error: "Le jeton GitHub des secrets n'est pas encore configuré (variable GITHUB_SECRETS_TOKEN sur Vercel)." };
  }

  const supabase = await createClient();
  const { data: utilisateur } = await supabase.auth.getUser();
  if (!utilisateur.user) return { ok: false, error: "Session expirée : reconnecte-toi." };

  const pose = await poserSecretCookie(compte, v.cookie);
  if (!pose.ok) return { ok: false, error: pose.erreur };

  const { error } = await supabase
    .from("ttfl_cookie_renouvellements")
    .upsert({ compte, renouvele_le: new Date().toISOString(), estime: false }, { onConflict: "compte" });
  // Contrôle des connexions dans la foulée (au plus une demande à la fois, comme les autres boutons de l'Admin).
  const { data: actives } = await supabase
    .from("ttfl_commandes").select("id").eq("type", "cookies").in("statut", ["en_attente", "en_cours"]).limit(1);
  if (!actives || actives.length === 0) await supabase.from("ttfl_commandes").insert({ type: "cookies", params: {} });

  revalidatePath("/admin", "layout"); // et ses sous-pages (Actions, Cookies, Secret…)
  return {
    ok: true,
    message: `Cookie du compte ${compte} enregistré sur GitHub. Vérification des connexions lancée (environ 2 min)${error ? " — mais la date n'a pas pu être notée." : "."}`,
  };
}
