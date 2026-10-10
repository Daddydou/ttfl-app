// Onglet Admin : logique PURE (catalogue des actions du PC, état de l'exécuteur, import et opérations en masse sur les picks).
// Aucun accès réseau : testable seule. Les écritures sont dans app/(app)/admin/actions.ts.

import { bloquesPourSoiree, normaliserNom, type PickLigne } from "@/lib/planning";

// --- Catalogue des actions que l'application peut demander au PC --------------------------------------
// Les identifiants DOIVENT rester identiques à ceux de la liste blanche de l'exécuteur (ttfl-auto/src/commandes.js) :
// l'exécuteur refuse tout identifiant qu'il ne connaît pas.

export type GroupeAction = "calculs" | "donnees" | "synchro" | "suivi";

export interface ActionPC {
  id: string;
  groupe: GroupeAction;
  libelle: string;
  detail: string;
  param?: "date" | "nuits"; // paramètre optionnel
  confirmer?: string; // actions sensibles : message de confirmation
}

export const GROUPES: { id: GroupeAction; titre: string }[] = [
  { id: "calculs", titre: "Calculs et statistiques" },
  { id: "donnees", titre: "Données" },
  { id: "synchro", titre: "Synchronisation avec TTFL" },
  { id: "suivi", titre: "Suivi" },
];

export const ACTIONS_PC: ActionPC[] = [
  { id: "push_soir", groupe: "calculs", libelle: "Recalculer ce soir", param: "date",
    detail: "Relance le calcul des projections du soir (blessures à jour) et les statistiques de saison." },
  { id: "push_avance", groupe: "calculs", libelle: "Recalculer les prochaines soirées", param: "nuits",
    detail: "Projections à l'avance (blessures inconnues) pour les prochains jours. Peut durer plusieurs minutes." },
  { id: "benchmarks", groupe: "calculs", libelle: "Mettre à jour les repères",
    detail: "Recalcule « Moi vs les repères mobiles » du tableau de bord. Long : plusieurs minutes." },
  { id: "capture_resultats", groupe: "donnees", libelle: "Capturer les scores réels d'un soir", param: "date",
    detail: "Renseigne les vrais scores du Top 10 d'une soirée terminée (hier par défaut)." },
  { id: "archive_resultats", groupe: "donnees", libelle: "Archiver les résultats d'un soir", param: "date",
    detail: "Enregistre les scores réels de la soirée (hier par défaut) pour l'étude des blessures." },
  { id: "calendrier", groupe: "donnees", libelle: "Mettre à jour le calendrier TTFL",
    detail: "Relit sur le site TTFL les soirées des 30 prochains jours." },
  { id: "import_cotes", groupe: "donnees", libelle: "Importer les cotes de paris", param: "date",
    detail: "Récupère les lignes de paris du Top 10 (The Odds API).",
    confirmer: "Cet import consomme du quota The Odds API : environ 16 crédits sur 500 par mois. Continuer ?" },
  { id: "synchro_app", groupe: "synchro", libelle: "Envoyer mes picks sur le site TTFL",
    detail: "Envoie tout de suite les picks validés dans l'application vers le site TTFL.",
    confirmer: "Les picks de l'application vont être envoyés sur le site TTFL maintenant, remplacements compris. Continuer ?" },
  { id: "synchro_complet", groupe: "synchro", libelle: "Synchronisation complète (2 sens)",
    detail: "Envoie les picks vers le site ET remonte ceux posés sur le site.",
    confirmer: "La synchronisation complète va écrire sur le site TTFL et dans l'application. Continuer ?" },
  { id: "cookies", groupe: "synchro", libelle: "Vérifier les 12 connexions TTFL",
    detail: "Teste que les 12 comptes sont toujours connectés (les cookies durent environ 2 mois)." },
  { id: "controle_2330", groupe: "synchro", libelle: "Lancer le contrôle de 23 h 30 maintenant",
    detail: "Vérifie les blessures des comptes 03 à 12. Suit le réglage du PC : à blanc (il notifie seulement) tant que tu ne l'as pas activé en réel." },
  { id: "ombre", groupe: "suivi", libelle: "Suivi du match-up 0,6",
    detail: "Compare la formule actuelle et le match-up à 0,6 sur la saison en cours." },
];

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function dateReelle(iso: string): boolean {
  return DATE_ISO.test(iso) && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
}

// Paramètres d'une action, réduits à ce que l'exécuteur accepte (date AAAA-MM-JJ ou entier borné).
export function nettoyerParams(
  action: ActionPC,
  params: Record<string, unknown>,
): { params: Record<string, string | number> } | { error: string } {
  if (action.param === "date") {
    const d = params.date;
    if (d === undefined || d === null || d === "") return { params: {} };
    if (typeof d !== "string" || !dateReelle(d)) return { error: "Date invalide (format AAAA-MM-JJ)." };
    return { params: { date: d } };
  }
  if (action.param === "nuits") {
    const n = params.nuits;
    if (n === undefined || n === null || n === "") return { params: {} };
    const v = Number(n);
    if (!Number.isInteger(v) || v < 1 || v > 21) return { error: "Nombre de soirées invalide (1 à 21)." };
    return { params: { nuits: v } };
  }
  return { params: {} };
}

// --- État de l'exécuteur du PC ------------------------------------------------------------------------------

export type EtatExecuteur = "en_ligne" | "lent" | "hors_ligne" | "inconnu";

// L'exécuteur passe chaque minute (et signale sa présence toutes les 30 s pendant une longue action).
// `minutes` = temps écoulé depuis le dernier passage (null = jamais vu). La page serveur calcule l'âge avec ageMs().
export function etatExecuteur(minutes: number | null): { etat: EtatExecuteur; minutes: number | null } {
  if (minutes === null) return { etat: "inconnu", minutes: null };
  const m = Math.max(0, minutes);
  if (m < 3) return { etat: "en_ligne", minutes: m };
  if (m < 10) return { etat: "lent", minutes: m };
  return { etat: "hors_ligne", minutes: m };
}

export const STATUTS_COMMANDE: Record<string, { label: string; classe: string }> = {
  en_attente: { label: "En attente", classe: "bg-quest/15 text-quest" },
  en_cours: { label: "En cours", classe: "bg-court-500/15 text-court-400" },
  ok: { label: "Terminée", classe: "bg-avail/15 text-avail" },
  echec: { label: "Échec", classe: "bg-out/15 text-out" },
  annule: { label: "Annulée", classe: "bg-ink-850 text-ink-600" },
};

// --- Import de picks collés ----------------------------------------------------------------------------------

export interface LigneImport {
  n: number; // numéro de ligne dans le texte collé
  date: string; // AAAA-MM-JJ
  player: string;
}
export interface ErreurImport {
  n: number;
  texte: string;
  raison: string;
}

// Année de début de la saison : la saison NBA commence en octobre (juillet à décembre = année en cours).
export function anneeDebutSaison(aujourdhui: string): number {
  const [a, m] = aujourdhui.split("-").map(Number);
  return m >= 7 ? a : a - 1;
}

function iso(a: number, m: number, j: number): string | null {
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j ? d.toISOString().slice(0, 10) : null;
}

const SEP = "[;,\\t:–-]?";
const RE_ISO = new RegExp(`^(\\d{4})-(\\d{2})-(\\d{2})\\s*${SEP}\\s*(.+)$`);
const RE_FR = new RegExp(`^(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}|\\d{2}))?\\s*${SEP}\\s*(.+)$`);

// Formats acceptés (un pick par ligne, la date d'abord) :
//   2026-10-21;Nikola Jokic     21/10 Nikola Jokic     21/10/2026 - Nikola Jokic     (lignes vides et # ignorées)
export function parserImport(texte: string, aujourdhui: string): { lignes: LigneImport[]; erreurs: ErreurImport[] } {
  const lignes: LigneImport[] = [];
  const erreurs: ErreurImport[] = [];
  const parDate = new Map<string, number>();
  const debut = anneeDebutSaison(aujourdhui);

  texte.split(/\r?\n/).forEach((brut, i) => {
    const n = i + 1;
    const t = brut.trim();
    if (!t || t.startsWith("#")) return;

    let date: string | null = null;
    let reste = "";
    const a = RE_ISO.exec(t);
    const b = a ? null : RE_FR.exec(t);
    if (a) {
      date = iso(Number(a[1]), Number(a[2]), Number(a[3]));
      reste = a[4];
    } else if (b) {
      const mois = Number(b[2]);
      const annee = b[3] ? (b[3].length === 2 ? 2000 + Number(b[3]) : Number(b[3])) : mois >= 7 ? debut : debut + 1;
      date = iso(annee, mois, Number(b[1]));
      reste = b[4];
    } else {
      erreurs.push({ n, texte: t, raison: "format non reconnu (la date d'abord, puis le joueur)" });
      return;
    }
    if (!date) {
      erreurs.push({ n, texte: t, raison: "date impossible" });
      return;
    }
    const player = reste.replace(/^["'«]+|["'»]+$/g, "").replace(/\s+/g, " ").trim();
    if (player.length < 2 || player.length > 80 || !/\p{L}/u.test(player)) {
      erreurs.push({ n, texte: t, raison: "nom de joueur invalide" });
      return;
    }
    const dejaVue = parDate.get(date);
    if (dejaVue !== undefined) {
      erreurs.push({ n, texte: t, raison: `même soirée que la ligne ${dejaVue} (un pick par soirée et par compte)` });
      return;
    }
    parDate.set(date, n);
    lignes.push({ n, date, player });
  });

  return { lignes: lignes.sort((x, y) => x.date.localeCompare(y.date)), erreurs };
}

// --- Écritures en masse : le cycle de 30 jours est vérifié compte par compte AVANT d'écrire ----------------------

export interface Ecriture {
  compte: string;
  date: string;
  player: string;
}
export interface Probleme extends Ecriture {
  raison: string;
}

// Écrire un pick à une date REMPLACE celui que le compte avait déjà ce soir-là. Les lignes à écrire comptent entre elles
// pour le cycle (même joueur deux fois à moins de 30 jours = refusé), dans les deux sens.
export function planifierEcritures({
  lignes,
  comptes,
  existants,
}: {
  lignes: { date: string; player: string }[];
  comptes: string[];
  existants: PickLigne[];
}): { ecritures: Ecriture[]; problemes: Probleme[] } {
  const ecritures: Ecriture[] = [];
  const problemes: Probleme[] = [];
  const triees = [...lignes].sort((x, y) => x.date.localeCompare(y.date));

  for (const compte of comptes) {
    let travail = existants.filter((p) => p.compte === compte);
    for (const l of triees) {
      travail = travail.filter((p) => p.pick_date !== l.date); // remplacé
      const bloque = bloquesPourSoiree(travail, [compte], l.date)[normaliserNom(l.player)];
      if (bloque && bloque.length > 0) {
        problemes.push({ compte, date: l.date, player: l.player, raison: "déjà pické à 30 jours ou moins" });
        continue;
      }
      travail.push({ pick_date: l.date, player: l.player, compte });
      ecritures.push({ compte, date: l.date, player: l.player });
    }
  }
  return { ecritures, problemes };
}

// Copie des picks d'un compte vers d'autres : mêmes règles que l'import.
export function planifierCopie({
  source,
  destinations,
  existants,
}: {
  source: PickLigne[];
  destinations: string[];
  existants: PickLigne[];
}) {
  return planifierEcritures({
    lignes: source.map((p) => ({ date: p.pick_date, player: p.player })),
    comptes: destinations,
    existants,
  });
}

// Plage de dates d'une opération en masse. `futurSeulement` protège l'historique (les picks passés portent les scores).
export function validerPlage(debut: string, fin: string, aujourdhui: string, futurSeulement = false): string | null {
  if (!dateReelle(debut) || !dateReelle(fin)) return "Dates invalides (format AAAA-MM-JJ).";
  if (fin < debut) return "La date de fin précède la date de début.";
  if ((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86400000 > 400) return "Plage trop longue (400 jours au plus).";
  if (futurSeulement && debut < aujourdhui) return "Les picks passés ne peuvent pas être supprimés ici : ils portent les scores de l'historique.";
  return null;
}

export const MOT_CONFIRMATION = "SUPPRIMER";
