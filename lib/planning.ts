// Logique PURE du planning « Mes picks » (aucun accès réseau, testable seule).
//
// Un pick par soirée ET par compte TTFL ('01' … '12') :
//   - 01 et 02 = comptes principaux, chacun sa propre zone de saisie ;
//   - 03 à 12  = équipe : une zone qui écrit le même joueur sur les 10 comptes
//     (les comptes pourront diverger plus tard sans changer le modèle).
// Le cycle de 30 jours se calcule PAR COMPTE, picks déjà posés d'avance inclus.

export type ZoneId = "c01" | "c02" | "c13" | "equipe";

export interface Zone {
  id: ZoneId;
  label: string;
  comptes: string[];
}

export const COMPTES_EQUIPE = ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

export const ZONES: Zone[] = [
  { id: "c01", label: "Compte 1", comptes: ["01"] },
  { id: "c02", label: "Compte 2", comptes: ["02"] },
  { id: "c13", label: "Compte 13", comptes: ["13"] }, // ajouté le 2026-10-18 : plan 30 jours, formule Ambitieuse
  { id: "equipe", label: "Équipe", comptes: COMPTES_EQUIPE },
];

export function zoneDe(id?: string | null): Zone {
  return ZONES.find((z) => z.id === id) ?? ZONES[0];
}

// Dernier compte choisi (Conseillés ?pour=, Mes picks ?zone=) : retenu dans un cookie par le proxy, relu par les
// pages quand l'adresse ne précise rien. On ne change ainsi pas de compte en changeant d'onglet.
export const COOKIE_ZONE = "ttfl_zone";

export function zoneChoisie(request: { pathname: string; searchParams: URLSearchParams }): string | null {
  const id =
    request.pathname === "/ce-soir"
      ? request.searchParams.get("pour")
      : request.pathname === "/picks"
        ? request.searchParams.get("zone")
        : null;
  return id && ZONES.some((z) => z.id === id) ? id : null;
}

export const COMPTE_VALIDE = /^(0[1-9]|1[0-4])$/; // 01 à 14 (le 13 existe depuis le 2026-10-18 ; 14 réservé)

// Un joueur pické est indisponible pour le même compte à ≤ 30 jours, dans les deux sens
// (comme le robot : prudent). Même règle que ttfl-auto/src/ttfl-http.js.
export const JOURS_CYCLE = 30;

// --- Noms --------------------------------------------------------------------

// Comparaison tolérante : accents, casse, ponctuation, suffixes Jr./Sr./II/III/IV.
export function normaliserNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’`-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Dates (YYYY-MM-DD, calcul en UTC pour éviter les décalages de fuseau) -----

export function ajouterJours(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function dernierJourDuMois(ym: string): string {
  const [annee, mois] = ym.split("-").map(Number);
  return new Date(Date.UTC(annee, mois, 0)).toISOString().slice(0, 10);
}

export function libelleMois(ym: string): string {
  return new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function estMoisValide(ym: string | null | undefined): ym is string {
  return !!ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

// Mois à proposer en onglets : ceux qui contiennent des soirées connues, le mois en cours
// et le suivant, sans doublon, du plus ancien au plus récent.
export function moisDisponibles(dates: string[], aujourdhui: string): string[] {
  const ensemble = new Set(dates.map((d) => d.slice(0, 7)));
  ensemble.add(aujourdhui.slice(0, 7));
  ensemble.add(ajouterJours(dernierJourDuMois(aujourdhui.slice(0, 7)), 1).slice(0, 7));
  return [...ensemble].sort();
}

// --- Picks et cycle ----------------------------------------------------------

export interface PickLigne {
  pick_date: string;
  player: string;
  compte: string;
}

// Pick posé par le robot (table ttfl_picks_auto), PAS validé par l'utilisateur : case vide remplie ou joueur
// indisponible remplacé par le contrôle de 23 h 30, ou pick automatique des comptes 03 à 12.
export interface PickAuto {
  pick_date: string;
  compte: string;
  player: string;
  origine: string;
}

// Une marque ne vaut que tant que le joueur du pick est celui de la marque : si l'utilisateur change de joueur,
// le pick devient le sien et n'est plus « auto ».
export function estPickAuto(autos: PickAuto[], compte: string, date: string, joueur: string | null): boolean {
  if (!joueur) return false;
  const cle = normaliserNom(joueur);
  return autos.some((a) => a.compte === compte && a.pick_date === date && normaliserNom(a.player) === cle);
}

// Comptes dont le pick de la soirée est « auto » (triés).
export function comptesAuto(autos: PickAuto[], picks: PickLigne[], date: string): string[] {
  return picks
    .filter((p) => p.pick_date === date && estPickAuto(autos, p.compte, date, p.player))
    .map((p) => p.compte)
    .sort();
}

// Joueurs indisponibles pour une soirée, par compte : { "nom normalisé": ["03", "04"] }.
// La soirée elle-même est ignorée (re-picker le même soir remplace, ça ne bloque pas).
export function bloquesPourSoiree(
  picks: PickLigne[],
  comptes: string[],
  date: string,
): Record<string, string[]> {
  const sortie: Record<string, string[]> = {};
  for (const p of picks) {
    if (!comptes.includes(p.compte) || p.pick_date === date) continue;
    if (Math.abs(joursEntre(p.pick_date, date)) > JOURS_CYCLE) continue;
    const cle = normaliserNom(p.player);
    if (!sortie[cle]) sortie[cle] = [];
    if (!sortie[cle].includes(p.compte)) sortie[cle].push(p.compte);
  }
  return sortie;
}

export interface ResumeZone {
  etat: "aucun" | "unique" | "partiel" | "mixte";
  nPicks: number;
  nComptes: number;
  joueurs: { player: string; n: number }[]; // du plus fréquent au moins fréquent
}

// Ce qui est choisi pour une soirée dans une zone.
//  unique  = tous les comptes de la zone ont le même joueur
//  partiel = un seul joueur, mais pas sur tous les comptes
//  mixte   = plusieurs joueurs différents
export function resumeZone(picks: PickLigne[], comptes: string[], date: string): ResumeZone {
  const dujour = picks.filter((p) => p.pick_date === date && comptes.includes(p.compte));
  const parJoueur = new Map<string, { player: string; n: number }>();
  for (const p of dujour) {
    const cle = normaliserNom(p.player);
    const existant = parJoueur.get(cle);
    if (existant) existant.n += 1;
    else parJoueur.set(cle, { player: p.player, n: 1 });
  }
  const joueurs = [...parJoueur.values()].sort((a, b) => b.n - a.n);
  let etat: ResumeZone["etat"] = "aucun";
  if (joueurs.length === 1) etat = dujour.length === comptes.length ? "unique" : "partiel";
  else if (joueurs.length > 1) etat = "mixte";
  return { etat, nPicks: dujour.length, nComptes: comptes.length, joueurs };
}

// --- État d'envoi (ttfl_envois) ----------------------------------------------

export interface EnvoiLigne {
  pick_date: string;
  compte: string;
  joueur: string;
  statut: string;
  message: string | null;
}

export type EtatEnvoi = "aucun" | "a_envoyer" | "pose" | "partiel" | "conflit" | "echec";

// Vocabulaire UNIQUE de l'état d'un envoi sur le site TTFL (statut de ttfl_envois), partout dans l'app.
// « Qui a choisi » (robot ou toi) est une autre information, jamais mélangée à celle-ci.
export const LIBELLES_STATUT_ENVOI: Record<string, string> = {
  confirme: "Posé sur TTFL",
  propose: "En cours d'envoi",
  conflit: "Conflit",
  echec: "Échec d'envoi",
  refuse: "Échec d'envoi",
};
export const libelleStatutEnvoi = (statut: string | null): string =>
  statut ? (LIBELLES_STATUT_ENVOI[statut] ?? statut) : "—";

export interface ResumeEnvoi {
  etat: EtatEnvoi;
  label: string;
  detail: string | null;
}

// Résume ce que le site TTFL a réellement, pour une soirée et une zone.
//  nPicks = nombre de comptes de la zone qui ont un pick voulu dans l'application.
export function resumeEnvois(envois: EnvoiLigne[], nPicks: number): ResumeEnvoi {
  const conflit = envois.find((e) => e.statut === "conflit");
  if (conflit) return { etat: "conflit", label: "Conflit", detail: conflit.message };
  const echec = envois.find((e) => e.statut === "echec" || e.statut === "refuse");
  if (echec) return { etat: "echec", label: "Échec d'envoi", detail: echec.message };
  const confirmes = envois.filter((e) => e.statut === "confirme").length;
  if (nPicks > 0 && confirmes >= nPicks) return { etat: "pose", label: "Posé sur TTFL", detail: null };
  if (confirmes > 0) return { etat: "partiel", label: `${confirmes}/${Math.max(nPicks, confirmes)} posés`, detail: null };
  if (nPicks > 0) return { etat: "a_envoyer", label: "À envoyer", detail: null };
  return { etat: "aucun", label: "", detail: null };
}

// --- Soirées -----------------------------------------------------------------

// Une ligne de la vue ttfl_nuits.
export interface Nuit {
  mode: string;
  game_date: string;
  n_runs: number;
  n_soir: number; // runs du push du soir (hors « AVANCE »)
  max_candidats: number | null;
  dernier_calcul: string;
}

// Soirée dont les projections viennent seulement du calcul « à l'avance »
// (blessures inconnues, cycle non appliqué).
export function avanceSeule(n: Nuit | undefined): boolean {
  return !!n && n.n_soir === 0;
}

export function aDesProjections(n: Nuit | undefined): boolean {
  return !!n && (n.max_candidats ?? 0) > 0;
}

// Date du jour (YYYY-MM-DD) à New York : une soirée NBA se date là-bas, ni à Paris ni en UTC.
export function aujourdhuiNY(maintenant: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
}
