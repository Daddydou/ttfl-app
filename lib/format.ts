import type { PlayerStatus, Mode } from "./types";

// --- Fraîcheur du run --------------------------------------------------------

// Âge (en ms) d'un horodatage ISO. Isolé ici pour que les pages serveur n'aient
// pas à appeler Date.now() directement pendant le rendu.
export function ageMs(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}

export interface Freshness {
  label: string; // "il y a 12 min"
  minutes: number;
  tone: "fresh" | "aging" | "stale" | "waiting";
}

// Heure de Paris (0-23) d'un instant donné.
export function heureParis(maintenant: Date = new Date()): number {
  // formatToParts : en fr-FR, format() renvoie « 14 h », pas « 14 ».
  const partie = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" })
    .formatToParts(maintenant)
    .find((p) => p.type === "hour");
  return Number(partie?.value ?? 0);
}

// Le moteur calcule toutes les 30 min de 16 h à 2 h (Paris). Entre 3 h et 16 h, aucun calcul n'est attendu :
// un run de la veille est normal, pas « périmé » (sinon le bandeau est rouge tous les après-midi pour rien).
export const DEBUT_CALCUL_SOIR = 16;

// Le calcul de fraîcheur combine deux choses : l'âge du run ET si l'injury
// report a bien été rafraîchi. Un run récent mais sur report périmé reste
// dangereux (un joueur a pu passer OUT), d'où le mélange.
export function freshness(
  computedAt: string,
  injuryFresh: boolean,
  maintenant: Date = new Date(),
): Freshness {
  const minutes = Math.max(
    0,
    Math.round((maintenant.getTime() - new Date(computedAt).getTime()) / 60000),
  );

  const h = heureParis(maintenant);
  let tone: Freshness["tone"];
  if (h >= 3 && h < DEBUT_CALCUL_SOIR && minutes >= 120) {
    tone = "waiting";
  } else if (!injuryFresh) {
    // Report non rafraîchi : jamais "vert", peu importe l'âge.
    tone = minutes < 60 ? "aging" : "stale";
  } else if (minutes < 30) {
    tone = "fresh";
  } else if (minutes < 120) {
    tone = "aging";
  } else {
    tone = "stale";
  }

  return { label: humanAge(minutes), minutes, tone };
}

// « 1 tâche », « 3 tâches » : remplace les « tâche(s) ». `pluriel` sert aux formes irrégulières.
export function nb(n: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${n} ${Math.abs(n) >= 2 ? pluriel : singulier}`;
}

export function humanAge(minutes: number): string {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `il y a ${h} h ${m} min` : `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

// --- Statut de disponibilité -------------------------------------------------

export function statusInfo(status: PlayerStatus | null): {
  label: string;
  color: string; // classe texte
  dot: string; // classe fond du point
} {
  const s = (status || "Available").toLowerCase();
  if (s === "out")
    return { label: "OUT", color: "text-out", dot: "bg-out" };
  if (s === "doubtful")
    return { label: "Doubtful", color: "text-doubt", dot: "bg-doubt" };
  if (s === "questionable")
    return { label: "Questionable", color: "text-quest", dot: "bg-quest" };
  if (s === "probable")
    return { label: "Probable", color: "text-avail", dot: "bg-avail" };
  return { label: "Available", color: "text-avail", dot: "bg-avail" };
}

// --- Divers ------------------------------------------------------------------

export function modeLabel(mode: Mode): string {
  return mode === "playoffs" ? "Playoffs" : "Saison régulière";
}

export function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(digits);
}

// Date FR courte : "mar. 10 mars".
export function frDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function todayISO(): string {
  // Date locale du navigateur/serveur au format YYYY-MM-DD.
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
