// PICK SECRET du compte 02 (décision du 2026-10-20) : l'application ne montre pas le joueur choisi pour le compte 02
// tant que la soirée n'est pas close. Logique PURE (aucun accès réseau) + un chargeur tolérant.
//
// Le masquage est fait ICI, dans l'application, et pas dans la base : le robot du PC lit la base avec le même compte
// que l'application et doit continuer à voir les picks du 02 (sinon il les remplirait ou les remplacerait à tort).
//
// Une soirée est SECRÈTE pour le compte 02 quand toutes ces conditions sont réunies :
//   - l'interrupteur général est allumé (ttfl_secret_reglage.actif) ;
//   - la soirée n'est pas passée (date >= aujourd'hui à New York) ;
//   - elle n'a pas été révélée (ttfl_secret_pick.revele_le : révélation forcée, ou posée par le PC à la clôture) ;
//   - son heure de clôture (ttfl_secret_pick.cloture, écrite par le PC) n'est pas atteinte.
// Lecture impossible (erreur Supabase) = tout est secret : mieux vaut cacher à tort que révéler à tort.

import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPTE_SECRET = "02";
export const PROFIL_SECRET = "prudent"; // formule du compte 02 : sa ligne du suivi des formules est masquée aussi

export interface LigneSecret {
  soiree: string;
  cloture: string | null;
  revele_le: string | null;
  motif: string | null;
}

export interface EtatSecret {
  actif: boolean;
  compte: string;
  profil: string;
  lignes: Record<string, LigneSecret>;
  lisible: boolean; // false = lecture impossible : état par défaut « tout est secret »
}

export const ETAT_ILLISIBLE: EtatSecret = { actif: true, compte: COMPTE_SECRET, profil: PROFIL_SECRET, lignes: {}, lisible: false };

export const ETAT_ETEINT: EtatSecret = { actif: false, compte: COMPTE_SECRET, profil: PROFIL_SECRET, lignes: {}, lisible: true };

const jour = (d: string | null | undefined) => String(d ?? "").slice(0, 10);

// Le pick de ce compte, pour cette soirée, doit-il être caché ?
export function soireeSecrete(etat: EtatSecret, compte: string, date: string, aujourdhui: string, maintenantMs: number): boolean {
  if (!etat.actif || compte !== etat.compte) return false;
  const d = jour(date);
  if (d < aujourdhui) return false;
  const ligne = etat.lignes[d];
  if (ligne?.revele_le) return false;
  if (ligne?.cloture && maintenantMs >= Date.parse(ligne.cloture)) return false;
  return true;
}

// Retire d'une liste (picks, envois, marques auto, captures, journal…) les lignes du compte secret dont la soirée est
// encore secrète. `champDate` : nom du champ date de la ligne (pick_date par défaut).
export function masquerLignes<T extends { compte: string }>(
  lignes: T[],
  etat: EtatSecret,
  aujourdhui: string,
  maintenantMs: number,
  champDate: keyof T = "pick_date" as keyof T,
): T[] {
  return lignes.filter((l) => !soireeSecrete(etat, l.compte, String(l[champDate]), aujourdhui, maintenantMs));
}

// Les soirées d'une liste qui sont encore secrètes pour le compte secret.
export function soireesSecretes(etat: EtatSecret, dates: string[], aujourdhui: string, maintenantMs: number): string[] {
  return dates.filter((d) => soireeSecrete(etat, etat.compte, d, aujourdhui, maintenantMs));
}

// « 21:00 » (heure de Paris) : la clôture de la soirée, si le PC l'a enregistrée.
export function heureCloture(etat: EtatSecret, date: string): string | null {
  const c = etat.lignes[jour(date)]?.cloture;
  if (!c) return null;
  const t = Date.parse(c);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(t));
}

// Phrase d'état pour le bandeau.
export function libelleSecret(etat: EtatSecret, date: string): string {
  const h = heureCloture(etat, date);
  return h ? `Pick du compte ${etat.compte} secret jusqu'à la clôture de la soirée (${h}, heure de Paris).` : `Pick du compte ${etat.compte} secret jusqu'à la clôture de la soirée.`;
}

// --- Garde des écritures --------------------------------------------------------------------------------------------
// Écrire (ou retirer, ou copier) le pick du compte secret pour une soirée encore secrète se ferait À L'AVEUGLE : on
// refuse, avec un message qui ne dit rien du joueur. Pour modifier, il faut d'abord révéler la soirée (ou éteindre le secret).

export function plageDates(debut: string, fin: string, max = 400): string[] {
  const dates: string[] = [];
  const d = new Date(`${debut}T00:00:00Z`);
  const f = Date.parse(`${fin}T00:00:00Z`);
  while (d.getTime() <= f && dates.length < max) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

export async function refusSecret(supabase: unknown, comptes: string[], dates: string[], aujourdhui: string): Promise<string | null> {
  const etat = await chargerSecret(supabase, aujourdhui);
  if (!etat.actif || !comptes.includes(etat.compte)) return null;
  const maintenant = Date.now();
  const secrete = dates.find((d) => soireeSecrete(etat, etat.compte, d, aujourdhui, maintenant));
  if (!secrete) return null;
  return `Le pick du compte ${etat.compte} est secret pour le ${secrete.slice(8, 10)}/${secrete.slice(5, 7)} : révèle d'abord la soirée (Admin → Pick secret) ou désactive le secret.`;
}

// --- Chargement (tolérant : jamais d'exception, jamais de révélation en cas de doute) ------------------------------

export async function chargerSecret(supabase: unknown, aujourdhui: string): Promise<EtatSecret> {
  try {
    const sb = supabase as SupabaseClient;
    const reg = await sb.from("ttfl_secret_reglage").select("actif,compte,profil").eq("id", 1).maybeSingle();
    if (reg.error) return ETAT_ILLISIBLE;
    if (!reg.data) return ETAT_ILLISIBLE;
    const veille = new Date(`${aujourdhui}T00:00:00Z`);
    veille.setUTCDate(veille.getUTCDate() - 1);
    const lg = await sb
      .from("ttfl_secret_pick")
      .select("soiree,cloture,revele_le,motif")
      .gte("soiree", veille.toISOString().slice(0, 10))
      .returns<LigneSecret[]>();
    if (lg.error) return ETAT_ILLISIBLE;
    const lignes: Record<string, LigneSecret> = {};
    for (const l of lg.data ?? []) lignes[jour(l.soiree)] = { ...l, soiree: jour(l.soiree) };
    const r = reg.data as { actif: boolean; compte?: string; profil?: string };
    return { actif: !!r.actif, compte: r.compte || COMPTE_SECRET, profil: r.profil || PROFIL_SECRET, lignes, lisible: true };
  } catch {
    return ETAT_ILLISIBLE;
  }
}
