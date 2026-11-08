// Stars absentes : les joueurs du TOP 30 des moyennes TTFL de la saison qui sont Out ou Doubtful (logique PURE, aucun
// accès réseau). Les blessés viennent de ttfl_blesses (même rapport que celui du moteur), le classement de
// ttfl_classement_moyennes. L'application ne calcule rien : elle croise deux tables déjà écrites par le moteur.
import type { Blesse } from "@/lib/blesses";

const ordreStatut = (b: Blesse) => (b.statut === "Out" ? 0 : 1);

export const TAILLE_TOP = 30;

export interface LigneClassement {
  cle: string; // même clé normalisée que ttfl_blesses.joueur_norm
  player: string;
  rang: number;
  moyenne: number | string | null;
}

export interface StarAbsente extends Blesse {
  rang: number;
  moyenne: number | null;
}

export interface SoireeStars {
  game_date: string;
  stars: StarAbsente[]; // Out d'abord, puis Doubtful, puis par rang
}

function enNombre(v: number | string | null): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Les blessés du top 30, regroupés par soirée (ordre chronologique), à partir de `depuis` (AAAA-MM-JJ, inclus).
export function starsAbsentes(
  blesses: Blesse[],
  classement: LigneClassement[],
  depuis: string,
  taille: number = TAILLE_TOP,
): SoireeStars[] {
  const parCle = new Map<string, LigneClassement>();
  for (const c of classement) if (c.rang <= taille) parCle.set(c.cle, c);

  const parSoiree = new Map<string, StarAbsente[]>();
  for (const b of blesses) {
    if (b.game_date < depuis) continue;
    if (b.statut !== "Out" && b.statut !== "Doubtful") continue;
    const c = parCle.get(b.joueur_norm);
    if (!c) continue;
    const star: StarAbsente = { ...b, joueur: c.player || b.joueur, rang: c.rang, moyenne: enNombre(c.moyenne) };
    const liste = parSoiree.get(b.game_date) ?? [];
    liste.push(star);
    parSoiree.set(b.game_date, liste);
  }

  return [...parSoiree.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([game_date, stars]) => ({
      game_date,
      // Out avant Doubtful ; à statut égal, le meilleur rang d'abord.
      stars: [...stars].sort((x, y) => ordreStatut(x) - ordreStatut(y) || x.rang - y.rang),
    }));
}

export function formaterMoyenne(m: number | null): string {
  return m === null ? "" : m.toFixed(1).replace(".", ",");
}
