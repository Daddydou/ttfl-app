import sodium from "libsodium-wrappers";
import { nomSecret } from "@/lib/cookies";

// Pose un secret GitHub Actions (COOKIE_01 … COOKIE_13) du dépôt ttfl-auto : chiffrement « sealed box » avec la clé
// publique du dépôt (méthode documentée par GitHub). Jeton : variable d'environnement GITHUB_SECRETS_TOKEN (jeton
// fine-grained avec la seule permission « Secrets : lecture et écriture » sur ttfl-auto). La valeur du secret n'est
// jamais écrite dans un message d'erreur ni renvoyée.

const DEPOT = "Daddydou/ttfl-auto";

export function secretsConfigures(): boolean {
  return !!process.env.GITHUB_SECRETS_TOKEN;
}

type Reponse = { ok: true } | { ok: false; erreur: string };

export async function poserSecretCookie(compte: string, valeur: string, fetcher: typeof fetch = fetch): Promise<Reponse> {
  const nom = nomSecret(compte);
  if (!nom) return { ok: false, erreur: "Compte invalide." };
  const jeton = process.env.GITHUB_SECRETS_TOKEN;
  if (!jeton) return { ok: false, erreur: "Jeton GitHub non configuré (GITHUB_SECRETS_TOKEN)." };
  const entetes = {
    Authorization: `Bearer ${jeton}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ttfl-app-cookies",
  };
  try {
    const cle = await fetcher(`https://api.github.com/repos/${DEPOT}/actions/secrets/public-key`, { headers: entetes, cache: "no-store" });
    if (!cle.ok) return { ok: false, erreur: `GitHub a refusé la lecture de la clé publique (${cle.status}).` };
    const { key, key_id } = (await cle.json()) as { key: string; key_id: string };
    await sodium.ready;
    const chiffre = sodium.crypto_box_seal(sodium.from_string(valeur), sodium.from_base64(key, sodium.base64_variants.ORIGINAL));
    const encrypted_value = sodium.to_base64(chiffre, sodium.base64_variants.ORIGINAL);
    const put = await fetcher(`https://api.github.com/repos/${DEPOT}/actions/secrets/${nom}`, {
      method: "PUT",
      headers: { ...entetes, "Content-Type": "application/json" },
      body: JSON.stringify({ encrypted_value, key_id }),
    });
    if (put.status !== 201 && put.status !== 204) return { ok: false, erreur: `GitHub a refusé l'écriture du secret (${put.status}).` };
    return { ok: true };
  } catch {
    return { ok: false, erreur: "GitHub injoignable." };
  }
}
