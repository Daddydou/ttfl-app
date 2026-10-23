// Notifications push dans l'application (Web Push). Logique PURE + constantes.
// La clé PUBLIQUE est faite pour être publique (la clé privée vit uniquement dans les secrets de la fonction Supabase
// « ttfl-push »). Si les clés sont un jour renouvelées, changer cette constante ET redéployer la fonction.

export const VAPID_PUBLIC_KEY =
  "BCrqJl0IYw8pa-8H8dmsnveWL7zJxGy265R78cxx3zjzhxoM5lONS49Dmt0feN6zji_1wxVp0sMLWZaAUkR4rU0";

// La clé publique VAPID est en base64 « URL » ; PushManager.subscribe veut des octets.
export function cleVapidEnOctets(base64url: string): Uint8Array {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(base64);
  const out = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) out[i] = brut.charCodeAt(i);
  return out;
}

export interface AbonnementPush {
  endpoint: string;
  p256dh: string;
  auth: string;
  appareil?: string | null;
}

// Vérifie un abonnement reçu du navigateur avant de le ranger en base.
export function validerAbonnement(a: unknown): { ok: true; abonnement: AbonnementPush } | { ok: false; erreur: string } {
  if (!a || typeof a !== "object") return { ok: false, erreur: "Abonnement illisible." };
  const { endpoint, p256dh, auth, appareil } = a as Record<string, unknown>;
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) {
    return { ok: false, erreur: "Adresse d'abonnement invalide." };
  }
  if (typeof p256dh !== "string" || p256dh.length < 20 || p256dh.length > 200) return { ok: false, erreur: "Clé d'abonnement invalide." };
  if (typeof auth !== "string" || auth.length < 8 || auth.length > 100) return { ok: false, erreur: "Secret d'abonnement invalide." };
  return {
    ok: true,
    abonnement: { endpoint, p256dh, auth, appareil: typeof appareil === "string" ? appareil.slice(0, 120) : null },
  };
}
