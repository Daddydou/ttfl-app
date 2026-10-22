// Page « Santé » de l'Admin (migration sans PC, 2026-10-22) : dernier passage de chaque tâche et retard éventuel.
// Logique PURE (aucun accès réseau, l'heure est passée en paramètre) : testée dans tests/sante.test.ts.

export type NiveauSante = "ok" | "retard" | "panne" | "inconnu" | "info";

export interface LigneEtat {
  cle: string;
  valeur: Record<string, unknown> | null;
  maj_le: string;
}

// Horodatages lus ailleurs que dans ttfl_robot_etat (dernière ligne de chaque table).
export interface SourcesSante {
  etats: LigneEtat[];
  dernierRun: string | null; // ttfl_runs.computed_at (mode regular) : projections du soir
  dernierPlan30: string | null; // ttfl_plan30.calcule_le
  dernierReleveCotes: string | null; // ttfl_vainqueurs_releves.releve_le
}

export interface TacheSante {
  id: string;
  titre: string;
  qui: "PC" | "Cloud" | "Supabase";
  derniere: string | null; // ISO
  niveau: NiveauSante;
  detail: string;
}

const MIN = 60000;

// Seuils en minutes : au-delà de `retard` → orange, au-delà de `panne` → rouge.
interface Regle {
  id: string;
  titre: string;
  qui: TacheSante["qui"];
  retard?: number;
  panne?: number;
  rythme: string; // ce qui est attendu, en clair
}

const REGLES: Record<string, Regle> = {
  commandes: { id: "commandes", titre: "Exécuteur du PC", qui: "PC", retard: 10, panne: 60, rythme: "passe chaque minute quand le PC est allumé" },
  executeur_cloud: { id: "executeur_cloud", titre: "Exécuteur cloud", qui: "Cloud", rythme: "à la demande, quand le PC ne répond pas" },
  secours: { id: "secours", titre: "Relais de secours", qui: "Cloud", rythme: "prend le relais de la synchro quand le PC dort" },
  reveil_secours: { id: "reveil_secours", titre: "Réveil Supabase → relais", qui: "Supabase", rythme: "lance le relais au bon moment (PC muet)" },
  synchro: { id: "synchro", titre: "Synchro app → site TTFL", qui: "PC", retard: 3 * 60, panne: 12 * 60, rythme: "toutes les 10 min de 8 h à minuit" },
  cookies: { id: "cookies", titre: "Connexions TTFL (cookies)", qui: "PC", retard: 36 * 60, panne: 72 * 60, rythme: "contrôle chaque matin à 9 h" },
  blessures: { id: "blessures", titre: "Rapport des blessures", qui: "PC", retard: 26 * 60, panne: 50 * 60, rythme: "exporté à chaque contrôle du soir" },
  resultats: { id: "resultats", titre: "Archive des résultats", qui: "PC", retard: 30 * 60, panne: 54 * 60, rythme: "chaque matin à 9 h 40" },
  run: { id: "run", titre: "Projections du soir", qui: "PC", retard: 26 * 60, panne: 50 * 60, rythme: "toutes les 30 min de 16 h à 2 h" },
  plan30: { id: "plan30", titre: "Plan 30 jours + pré-picks", qui: "PC", retard: 2 * 60, panne: 12 * 60, rythme: "toutes les 30 min" },
  cotes: { id: "cotes", titre: "Cotes des vainqueurs", qui: "PC", retard: 30 * 60, panne: 54 * 60, rythme: "un relevé par soirée de match" },
};

export function niveauAge(minutes: number | null, regle: Pick<Regle, "retard" | "panne">): NiveauSante {
  if (minutes === null || !Number.isFinite(minutes)) return "inconnu";
  if (regle.retard === undefined) return "info";
  if (regle.panne !== undefined && minutes >= regle.panne) return "panne";
  if (minutes >= regle.retard) return "retard";
  return "ok";
}

function horodatage(l: LigneEtat | undefined): string | null {
  if (!l) return null;
  const v = l.valeur ?? {};
  const candidat = typeof v.dernier_passage === "string" ? v.dernier_passage : typeof v.le === "string" ? v.le : l.maj_le;
  return candidat && Number.isFinite(Date.parse(candidat)) ? candidat : null;
}

function minutesDepuis(iso: string | null, maintenant: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.round((maintenant - t) / MIN)) : null;
}

function tache(regle: Regle, derniere: string | null, maintenant: number, detail?: string, forcer?: NiveauSante): TacheSante {
  const niveau = forcer ?? niveauAge(minutesDepuis(derniere, maintenant), regle);
  return { id: regle.id, titre: regle.titre, qui: regle.qui, derniere, niveau, detail: detail ?? regle.rythme };
}

// Toutes les tâches, dans l'ordre d'affichage (les plus importantes d'abord).
export function etatSante(s: SourcesSante, maintenant: number): TacheSante[] {
  const par = new Map(s.etats.map((e) => [e.cle, e]));
  const out: TacheSante[] = [];

  out.push(tache(REGLES.commandes, horodatage(par.get("commandes")), maintenant));

  const sy = par.get("synchro");
  const erreurs = Array.isArray(sy?.valeur?.erreurs) ? (sy?.valeur?.erreurs as unknown[]).length : 0;
  out.push(tache(REGLES.synchro, horodatage(sy), maintenant,
    erreurs ? `${erreurs} erreur(s) au dernier passage` : REGLES.synchro.rythme, erreurs ? "retard" : undefined));

  out.push(tache(REGLES.run, s.dernierRun, maintenant));
  out.push(tache(REGLES.plan30, s.dernierPlan30, maintenant));

  const ck = par.get("cookies");
  const echecs = Array.isArray(ck?.valeur?.echecs) ? (ck?.valeur?.echecs as string[]) : [];
  const valides = typeof ck?.valeur?.valides === "number" ? ck.valeur.valides : null;
  const total = typeof ck?.valeur?.total === "number" ? ck.valeur.total : null;
  out.push(tache(REGLES.cookies, horodatage(ck), maintenant,
    echecs.length ? `À renouveler : ${echecs.join(", ")}` : valides !== null && total !== null ? `${valides}/${total} valides` : REGLES.cookies.rythme,
    echecs.length ? "panne" : undefined));

  out.push(tache(REGLES.blessures, par.get("blessures")?.maj_le ?? null, maintenant));
  out.push(tache(REGLES.resultats, par.get("resultats")?.maj_le ?? null, maintenant));
  out.push(tache(REGLES.cotes, s.dernierReleveCotes, maintenant));

  for (const id of ["executeur_cloud", "secours", "reveil_secours"] as const) {
    out.push(tache(REGLES[id], horodatage(par.get(id)), maintenant));
  }
  return out;
}

// Résumé d'une ligne pour le haut de la section.
export function resumeSante(taches: TacheSante[]): { niveau: NiveauSante; texte: string } {
  const pannes = taches.filter((t) => t.niveau === "panne").length;
  const retards = taches.filter((t) => t.niveau === "retard").length;
  if (pannes) return { niveau: "panne", texte: `${pannes} tâche(s) à l'arrêt${retards ? `, ${retards} en retard` : ""}.` };
  if (retards) return { niveau: "retard", texte: `${retards} tâche(s) en retard.` };
  return { niveau: "ok", texte: "Tout tourne normalement." };
}
