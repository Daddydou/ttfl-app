// Mode hors-ligne léger : on garde, DANS LE NAVIGATEUR de l'utilisateur, une photo du dernier pick du soir et des
// picks validés à venir. Elle sert uniquement à la page /hors-ligne.html quand le réseau manque. Aucune page
// authentifiée ni aucun appel Supabase n'est mis en cache : la photo est effacée à la déconnexion (page /login).
// LECTURE SEULE : rien n'est calculé ici, on recopie ce que Supabase a déjà fourni.

export const CLE_HORS_LIGNE = "ttfl:hors-ligne";
export const MAX_PICKS_A_VENIR = 7;

export type PhotoHorsLigne = {
  enregistreLe: string; // ISO
  soiree: string | null; // date de la soirée du dernier calcul (YYYY-MM-DD)
  pickDuSoir: string | null; // pick validé du compte de référence pour cette soirée
  aVenir: { date: string; joueur: string }[]; // picks validés à venir, du plus proche au plus lointain
};

export function construirePhoto(
  entree: {
    soiree: string | null;
    pickDuSoir: string | null;
    aVenir: { pick_date: string; player: string }[];
  },
  maintenant: Date = new Date(),
): PhotoHorsLigne {
  return {
    enregistreLe: maintenant.toISOString(),
    soiree: entree.soiree,
    pickDuSoir: entree.pickDuSoir,
    aVenir: entree.aVenir.slice(0, MAX_PICKS_A_VENIR).map((p) => ({ date: p.pick_date, joueur: p.player })),
  };
}

// Accès au stockage : toujours entouré de try/catch (navigation privée, stockage bloqué ou plein).
export function ecrirePhoto(photo: PhotoHorsLigne, stockage?: Pick<Storage, "setItem">): boolean {
  try {
    (stockage ?? window.localStorage).setItem(CLE_HORS_LIGNE, JSON.stringify(photo));
    return true;
  } catch {
    return false;
  }
}

export function effacerPhoto(stockage?: Pick<Storage, "removeItem">): void {
  try {
    (stockage ?? window.localStorage).removeItem(CLE_HORS_LIGNE);
  } catch {
    // rien à faire : au pire la photo reste jusqu'à la prochaine connexion
  }
}

export function lirePhoto(stockage?: Pick<Storage, "getItem">): PhotoHorsLigne | null {
  try {
    const brut = (stockage ?? window.localStorage).getItem(CLE_HORS_LIGNE);
    if (!brut) return null;
    const p = JSON.parse(brut) as Partial<PhotoHorsLigne>;
    if (typeof p.enregistreLe !== "string" || !Array.isArray(p.aVenir)) return null;
    return {
      enregistreLe: p.enregistreLe,
      soiree: typeof p.soiree === "string" ? p.soiree : null,
      pickDuSoir: typeof p.pickDuSoir === "string" ? p.pickDuSoir : null,
      aVenir: p.aVenir.filter((x) => x && typeof x.date === "string" && typeof x.joueur === "string"),
    };
  } catch {
    return null;
  }
}
