// Jeu « vainqueur de chaque match » : logique PURE d'affichage (aucun accès réseau).
//
// Le PC (ttfl/pont/vainqueurs.py) relève les cotes de victoire (The Odds API), en déduit la probabilité de chaque équipe
// (médiane des bookmakers, marge retirée) et propose le favori. 1 point par bon vainqueur ; on peut pronostiquer jusqu'au
// coup d'envoi du match. 'dom' = équipe à domicile, 'ext' = équipe à l'extérieur.

export type Cote = "dom" | "ext";

export interface MatchVainqueur {
  event_id: string;
  game_date: string; // soirée NBA (date de New York)
  commence_time: string; // ISO UTC
  equipe_dom: string;
  equipe_ext: string;
  abbr_dom: string | null;
  abbr_ext: string | null;
  prob_dom: number | null;
  cote_dom: number | null;
  cote_ext: number | null;
  nb_books: number | null;
  favori: Cote | null;
  serre: boolean;
  releve_le: string | null;
  resultat: Cote | null;
}

export interface ChoixVainqueur {
  event_id: string;
  choix: Cote;
  source: "auto" | "manuel";
  maj_le?: string | null; // heure du dernier changement (sert à dire « envoi chez Thomas en cours »)
}

// Ce que l'API Pronos NBA de Game Tracker (chez Thomas) a enregistré pour un match, relu par le PC à chaque passage.
export interface PronoKt {
  event_id: string;
  cote: Cote | null; // null = rien de posé chez Thomas
  statut: string | null;
  maj_le: string | null;
}

export type EtatKt = "identique" | "different" | "vide" | "inconnu";

// Le prono chez Thomas comparé à notre choix effectif. 'inconnu' : le PC n'a pas encore relu ce match.
export function etatKt(effectif: Cote | null, kt: PronoKt | undefined): EtatKt {
  if (!kt) return "inconnu";
  if (!kt.cote) return "vide";
  return effectif && kt.cote === effectif ? "identique" : "different";
}

export function autre(c: Cote): Cote {
  return c === "dom" ? "ext" : "dom";
}

// Le match a commencé : plus aucun pronostic possible.
export function commence(m: MatchVainqueur, maintenantMs: number): boolean {
  return new Date(m.commence_time).getTime() <= maintenantMs;
}

// Probabilité de victoire (0..1) de l'équipe `c`, ou null si inconnue.
export function probabilite(m: MatchVainqueur, c: Cote): number | null {
  if (m.prob_dom === null || m.prob_dom === undefined) return null;
  return c === "dom" ? m.prob_dom : 1 - m.prob_dom;
}

export function pourcent(p: number | null): string {
  return p === null ? "—" : `${Math.round(p * 100)} %`;
}

export function nomEquipe(m: MatchVainqueur, c: Cote): string {
  return c === "dom" ? m.equipe_dom : m.equipe_ext;
}

// Le choix effectif d'un match : le choix enregistré, sinon le favori proposé.
export function choixEffectif(m: MatchVainqueur, choix: ChoixVainqueur | undefined): Cote | null {
  return choix?.choix ?? m.favori;
}

export function heureParis(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

export interface Soiree {
  date: string;
  matchs: MatchVainqueur[];
}

// Les matchs regroupés par soirée NBA, dans l'ordre des coups d'envoi.
export function parSoiree(matchs: MatchVainqueur[]): Soiree[] {
  const tries = [...matchs].sort((a, b) => a.commence_time.localeCompare(b.commence_time));
  const out: Soiree[] = [];
  for (const m of tries) {
    const derniere = out[out.length - 1];
    if (derniere && derniere.date === m.game_date) derniere.matchs.push(m);
    else out.push({ date: m.game_date, matchs: [m] });
  }
  return out;
}

export interface BilanSoiree {
  nbMatchs: number;
  nbSerres: number;
  nbManuels: number;
  nbJuges: number;
  nbBons: number;
  nbChezThomas: number; // matchs avec un prono posé chez Thomas
}

export function bilanSoiree(
  matchs: MatchVainqueur[],
  choix: Map<string, ChoixVainqueur>,
  kt: Map<string, PronoKt> = new Map(),
): BilanSoiree {
  let nbChezThomas = 0;
  let nbSerres = 0;
  let nbManuels = 0;
  let nbJuges = 0;
  let nbBons = 0;
  for (const m of matchs) {
    const c = choix.get(m.event_id);
    if (m.serre) nbSerres += 1;
    if (kt.get(m.event_id)?.cote) nbChezThomas += 1;
    if (c?.source === "manuel") nbManuels += 1;
    const effectif = choixEffectif(m, c);
    if (m.resultat && effectif) {
      nbJuges += 1;
      if (effectif === m.resultat) nbBons += 1;
    }
  }
  return { nbMatchs: matchs.length, nbSerres, nbManuels, nbJuges, nbBons, nbChezThomas };
}
