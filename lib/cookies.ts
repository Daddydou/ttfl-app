// Renouvellement des cookies TTFL depuis le téléphone (amélioration 2 du 23/10) : logique PURE, testable seule.
// Le cookie « se souvenir de moi » (TTFLhash + TTFLmail) de chaque compte dure environ 2 mois ; il est rangé comme
// secret GitHub COOKIE_01 … COOKIE_13 (jamais dans la base, jamais dans un journal, jamais renvoyé à l'écran).

export const COMPTES_COOKIES = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, "0"));
export const DUREE_COOKIE_JOURS = 60; // durée de vie approximative d'un cookie
export const SEUIL_BIENTOT_JOURS = 45; // à partir de là, l'application invite à le renouveler

export type StatutCookie = "ok" | "bientot" | "expire" | "inconnu";

export function nomSecret(compte: string): string | null {
  return COMPTES_COOKIES.includes(compte) ? `COOKIE_${compte}` : null;
}

// Nettoie ce que l'utilisateur a collé : retire « Cookie: », les retours à la ligne et les guillemets autour.
// Renvoie le cookie normalisé « TTFLhash=…; TTFLmail=… », ou une erreur SANS jamais recopier la valeur collée.
export function validerCookie(brut: string): { ok: true; cookie: string } | { ok: false; erreur: string } {
  let t = String(brut ?? "").replace(/[\r\n]+/g, " ").trim();
  t = t.replace(/^cookie\s*:\s*/i, "").replace(/^["'`]+|["'`]+$/g, "").trim();
  if (t.length < 20 || t.length > 2000) return { ok: false, erreur: "Cookie trop court ou trop long." };
  const morceaux = t.split(";").map((s) => s.trim()).filter(Boolean);
  const valeurs = new Map<string, string>();
  for (const m of morceaux) {
    const i = m.indexOf("=");
    if (i <= 0) return { ok: false, erreur: "Format inattendu : attendu « TTFLhash=…; TTFLmail=… »." };
    valeurs.set(m.slice(0, i).trim(), m.slice(i + 1).trim());
  }
  const hash = valeurs.get("TTFLhash");
  const mail = valeurs.get("TTFLmail");
  if (!hash || !mail) return { ok: false, erreur: "Il manque TTFLhash ou TTFLmail dans ce que tu as collé." };
  if (hash.length < 8 || mail.length < 3) return { ok: false, erreur: "Valeurs trop courtes : le cookie semble incomplet." };
  // Caractères permis dans une valeur de cookie (pas d'espace, de guillemet ni de point-virgule).
  if (!/^[A-Za-z0-9%._~+/=@-]+$/.test(hash) || !/^[A-Za-z0-9%._~+/=@-]+$/.test(mail)) {
    return { ok: false, erreur: "Caractères inattendus dans le cookie." };
  }
  return { ok: true, cookie: `TTFLhash=${hash}; TTFLmail=${mail}` };
}

export function ageJours(renouveleLe: string | null, maintenant = Date.now()): number | null {
  if (!renouveleLe) return null;
  const t = Date.parse(renouveleLe);
  return Number.isFinite(t) ? Math.max(0, Math.floor((maintenant - t) / 86400000)) : null;
}

export function statutCookie(jours: number | null): StatutCookie {
  if (jours === null) return "inconnu";
  if (jours >= DUREE_COOKIE_JOURS) return "expire";
  if (jours >= SEUIL_BIENTOT_JOURS) return "bientot";
  return "ok";
}

export const LIBELLES_COOKIE: Record<StatutCookie, { texte: string; classe: string }> = {
  ok: { texte: "À jour", classe: "text-avail" },
  bientot: { texte: "À renouveler bientôt", classe: "text-quest" },
  expire: { texte: "Expiré ou presque", classe: "text-out" },
  inconnu: { texte: "Date inconnue", classe: "text-fg-muted" },
};

export interface LigneCookie {
  compte: string;
  renouvele_le: string | null;
  estime: boolean;
}

export function resumeCookies(lignes: LigneCookie[], maintenant = Date.now()) {
  const parCompte = new Map(lignes.map((l) => [l.compte, l]));
  return COMPTES_COOKIES.map((compte) => {
    const l = parCompte.get(compte);
    const jours = ageJours(l?.renouvele_le ?? null, maintenant);
    return { compte, jours, estime: !!l?.estime, statut: statutCookie(jours) };
  });
}
