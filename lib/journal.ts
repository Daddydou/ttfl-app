// Journal des actions et de leurs conséquences (Admin → Journal). Logique PURE : filtres, masquage du pick secret,
// regroupement « demande → conséquences ». Les lignes sont écrites uniquement par des déclencheurs Supabase
// (ttfl/pont/migration_journal.sql) ; l'application ne fait que les lire.

import { soireeSecrete, type EtatSecret } from "@/lib/secret";

export type CategorieJournal = "calcul" | "plan" | "pick" | "envoi" | "commande" | "reglage" | "secret" | "absent" | "cloud" | "robot";
export type ResultatJournal = "ok" | "echec" | "alerte" | "info";
export type OrigineJournal = "app" | "pc" | "cloud" | "systeme";

export interface EntreeJournal {
  id: number;
  le: string;
  categorie: CategorieJournal;
  action: string;
  consequence: string | null;
  resultat: ResultatJournal;
  origine: OrigineJournal;
  compte: string | null;
  soiree: string | null;
  joueur: string | null;
  cause_id: number | null;
}

export const COLONNES_JOURNAL = "id,le,categorie,action,consequence,resultat,origine,compte,soiree,joueur,cause_id";

export const LIBELLES_CATEGORIE: Record<CategorieJournal, string> = {
  calcul: "Calcul",
  plan: "Plan 30",
  pick: "Pick",
  envoi: "Envoi au site",
  commande: "Demande Admin",
  reglage: "Réglage",
  secret: "Pick secret",
  absent: "Absent",
  cloud: "Cloud",
  robot: "Robot",
};

export const LIBELLES_ORIGINE: Record<OrigineJournal, string> = { app: "Application", pc: "PC", cloud: "Cloud", systeme: "Automatique" };

// Filtres proposés en haut de la page.
export type FiltreJournal = "tout" | "problemes" | "picks" | "calculs" | "admin" | "robots";
export const FILTRES: { id: FiltreJournal; libelle: string; categories?: CategorieJournal[] }[] = [
  { id: "tout", libelle: "Tout" },
  { id: "problemes", libelle: "Problèmes" },
  { id: "picks", libelle: "Picks", categories: ["pick", "envoi"] },
  { id: "calculs", libelle: "Calculs", categories: ["calcul", "plan"] },
  { id: "admin", libelle: "Admin", categories: ["commande", "reglage", "secret", "absent"] },
  { id: "robots", libelle: "Robots", categories: ["robot", "cloud"] },
];

export function filtreValide(v: string | undefined): FiltreJournal {
  return FILTRES.some((f) => f.id === v) ? (v as FiltreJournal) : "tout";
}

export function filtrer(entrees: EntreeJournal[], filtre: FiltreJournal): EntreeJournal[] {
  if (filtre === "tout") return entrees;
  if (filtre === "problemes") return entrees.filter((e) => e.resultat === "echec" || e.resultat === "alerte");
  const cats = FILTRES.find((f) => f.id === filtre)?.categories ?? [];
  return entrees.filter((e) => cats.includes(e.categorie));
}

// Périodes proposées (jours).
export const PERIODES = [1, 7, 30] as const;
export type PeriodeJours = (typeof PERIODES)[number];
export function periodeValide(v: string | undefined): PeriodeJours {
  const n = Number(v);
  return (PERIODES as readonly number[]).includes(n) ? (n as PeriodeJours) : 1;
}

// PICK SECRET : on retire entièrement les lignes du compte secret dont la soirée est encore secrète (comme le journal
// d'envoi). Une ligne du compte secret avec un joueur mais sans soirée est retirée par prudence.
export function masquerJournal(entrees: EntreeJournal[], etat: EtatSecret, aujourdhui: string, maintenantMs: number): EntreeJournal[] {
  return entrees.filter((e) => {
    if (!etat.actif || e.compte !== etat.compte) return true;
    if (e.soiree) return !soireeSecrete(etat, e.compte, e.soiree, aujourdhui, maintenantMs);
    return e.joueur === null;
  });
}

export interface GroupeJournal {
  entree: EntreeJournal;
  consequences: EntreeJournal[]; // ordre chronologique
}

// Regroupe les conséquences sous la demande qui les a causées. Une entrée dont la cause n'est pas dans la liste
// (filtrée, masquée, hors période) reste une ligne à part. Du plus récent au plus ancien.
export function grouperParCause(entrees: EntreeJournal[]): GroupeJournal[] {
  const ids = new Set(entrees.map((e) => e.id));
  const enfants = new Map<number, EntreeJournal[]>();
  const racines: EntreeJournal[] = [];
  for (const e of entrees) {
    if (e.cause_id !== null && ids.has(e.cause_id)) {
      const l = enfants.get(e.cause_id) ?? [];
      l.push(e);
      enfants.set(e.cause_id, l);
    } else racines.push(e);
  }
  const chrono = (a: EntreeJournal, b: EntreeJournal) => a.le.localeCompare(b.le) || a.id - b.id;
  return racines
    .sort((a, b) => -chrono(a, b))
    .map((entree) => ({ entree, consequences: (enfants.get(entree.id) ?? []).sort(chrono) }));
}

export const TON_RESULTAT: Record<ResultatJournal, string> = {
  ok: "text-avail",
  echec: "text-out",
  alerte: "text-quest",
  info: "text-fg-muted",
};
export const LIBELLES_RESULTAT: Record<ResultatJournal, string> = { ok: "OK", echec: "Échec", alerte: "Attention", info: "Info" };

export function quand(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// Recherche libre (action, conséquence, joueur, compte, soirée). Vide = tout.
export function rechercher(entrees: EntreeJournal[], q: string | undefined): EntreeJournal[] {
  const t = (q ?? "").trim().toLowerCase();
  if (!t) return entrees;
  return entrees.filter((e) =>
    [e.action, e.consequence, e.joueur, e.compte, e.soiree, LIBELLES_CATEGORIE[e.categorie]].some((v) => v && v.toLowerCase().includes(t)),
  );
}

export function rechercheValide(v: string | undefined): string {
  return (v ?? "").trim().slice(0, 60);
}

// Cellule CSV : guillemets doublés ; une cellule qui commence par = + - @ est neutralisée (pas de formule dans Excel).
function celluleCsv(v: string | number | null): string {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

// Export CSV (séparateur « ; », ouvert directement par Excel en français). Du plus récent au plus ancien.
export function versCsv(entrees: EntreeJournal[]): string {
  const entete = ["Date (Paris)", "Catégorie", "Action", "Conséquence", "Résultat", "Origine", "Compte", "Soirée", "Joueur"];
  const lignes = entrees.map((e) =>
    [
      quand(e.le), LIBELLES_CATEGORIE[e.categorie], e.action, e.consequence, LIBELLES_RESULTAT[e.resultat],
      LIBELLES_ORIGINE[e.origine], e.compte, e.soiree, e.joueur,
    ].map(celluleCsv).join(";"),
  );
  return "﻿" + [entete.map(celluleCsv).join(";"), ...lignes].join("\r\n") + "\r\n";
}
