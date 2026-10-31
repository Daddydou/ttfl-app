// Blessés de la soirée (Out / Doubtful) : logique PURE d'affichage (aucun accès réseau).
//
// Le moteur (ttfl/pont/blesses.py) écrit ttfl_blesses à chaque passage : c'est le même rapport que celui qui écarte les
// joueurs du classement (NBA officiel, ESPN en secours ; Day-To-Day d'ESPN rangé en Doubtful). L'application ne fait que
// l'afficher, regroupé par match de la soirée. Aucun effet sur les picks.
import type { MatchVainqueur } from "@/lib/vainqueurs";

export type StatutBlesse = "Out" | "Doubtful";

export interface Blesse {
  game_date: string; // soirée (date de New York)
  joueur: string;
  joueur_norm: string;
  equipe_abbr: string | null;
  equipe: string | null;
  statut: StatutBlesse;
  statut_brut: string | null; // « Day-To-Day » quand ESPN sert de source
  motif: string | null; // « Left Knee — Sprain »
  retour_prevu: string | null; // AAAA-MM-JJ
  source: "nba" | "espn";
  maj_le: string;
}

export type MatchSoiree = Pick<
  MatchVainqueur,
  "event_id" | "game_date" | "commence_time" | "equipe_dom" | "equipe_ext" | "abbr_dom" | "abbr_ext"
>;

export interface EquipeBlessee {
  abbr: string | null;
  nom: string;
  joueurs: Blesse[]; // Out d'abord, puis Doubtful, puis ordre alphabétique
}

export interface MatchBlesses {
  match: MatchSoiree;
  ext: EquipeBlessee;
  dom: EquipeBlessee;
  nbOut: number;
  nbDoubtful: number;
}

export function trierBlesses(liste: Blesse[]): Blesse[] {
  const rang = (b: Blesse) => (b.statut === "Out" ? 0 : 1);
  return [...liste].sort((a, b) => rang(a) - rang(b) || a.joueur.localeCompare(b.joueur, "fr"));
}

function equipe(abbr: string | null, nom: string, blesses: Blesse[]): EquipeBlessee {
  const joueurs = abbr ? trierBlesses(blesses.filter((b) => b.equipe_abbr === abbr)) : [];
  return { abbr, nom, joueurs };
}

// Les matchs de la soirée dans l'ordre des coups d'envoi, avec les blessés de chaque équipe.
export function blessesParMatch(matchs: MatchSoiree[], blesses: Blesse[]): MatchBlesses[] {
  return [...matchs]
    .sort((a, b) => a.commence_time.localeCompare(b.commence_time))
    .map((m) => {
      const ext = equipe(m.abbr_ext, m.equipe_ext, blesses);
      const dom = equipe(m.abbr_dom, m.equipe_dom, blesses);
      const tous = [...ext.joueurs, ...dom.joueurs];
      return {
        match: m,
        ext,
        dom,
        nbOut: tous.filter((b) => b.statut === "Out").length,
        nbDoubtful: tous.filter((b) => b.statut === "Doubtful").length,
      };
    });
}

// Les blessés d'UN match (la page Vainqueurs liste plusieurs soirées : seuls les blessés de la date du match comptent).
// null = aucun rapport lu pour cette soirée (le moteur ne tient à jour que ce soir et demain) : on n'affiche rien,
// plutôt qu'un faux « aucun blessé ».
export function blessesDuMatch(m: MatchSoiree, blesses: Blesse[]): MatchBlesses | null {
  const dujour = blesses.filter((b) => b.game_date === m.game_date);
  if (dujour.length === 0) return null;
  return blessesParMatch([m], dujour)[0];
}

// Joueurs du rapport dont l'équipe n'a pas pu être identifiée : on ne les cache pas, on les montre à part.
export function blessesSansEquipe(blesses: Blesse[]): Blesse[] {
  return trierBlesses(blesses.filter((b) => !b.equipe_abbr));
}

// Libellé du statut : « Day-To-Day » (ESPN) reste visible, il compte comme Doubtful.
export function libelleStatut(b: Blesse): string {
  if (b.statut === "Doubtful" && b.statut_brut && b.statut_brut.toLowerCase().includes("day")) return "Day-To-Day";
  return b.statut;
}

// Dernière mise à jour du moteur pour cette soirée (ISO), ou null.
export function derniereMaj(blesses: Blesse[]): string | null {
  return blesses.map((b) => b.maj_le).filter(Boolean).sort().pop() ?? null;
}

// D'où vient le rapport : « nba » (officiel) ou « espn » (secours / lendemain). Mélange impossible dans une soirée.
export function sourceBlesses(blesses: Blesse[]): "nba" | "espn" | null {
  return blesses[0]?.source ?? null;
}
