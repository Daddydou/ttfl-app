// Plan glissant de 30 jours (comptes 01 et 02) : logique PURE d'affichage, testable seule, aucun accès réseau.
//
// Le plan lui-même est calculé sur le PC par le moteur (ttfl/moteur/plan30.py, poussé par ttfl/pont/push_plan30.py dans
// la table ttfl_plan30) : l'application ne le recalcule pas, elle le lit et le présente. Une ligne par compte et par
// formule (« profil ») : changer de formule à l'écran ne coûte aucun calcul.

import { etiquetteJour } from "@/lib/conseilles";
import { ajouterJours, joursEntre } from "@/lib/planning";

export type StatutJourPlan = "plan" | "valide" | "aucun";

export interface AlternativePlan {
  joueur: string;
  projection: number | null;
  reserve_le: string | null; // soirée où le plan utilise déjà ce joueur (null = libre)
}

export interface JourPlan30 {
  date: string; // AAAA-MM-JJ (date de New York)
  statut: StatutJourPlan;
  joueur: string | null;
  equipe: string | null;
  adversaire: string | null;
  position: string | null;
  projection: number | null;
  nb_matchs: number;
  alternatives: AlternativePlan[];
}

// Les poids de la formule, tels que le moteur les a utilisés, plus de quoi l'afficher.
export interface ReglagesPlan {
  libelle?: string;
  description?: string;
  ordre?: number;
  defaut?: boolean;
  actualisation?: number | null;
  poids_matchup_futur?: number | null;
  retour_moyenne?: number | null;
  exposant_presence?: number | null;
  marge_engagement?: number | null; // null = libre
}

export interface TtflPlan30 {
  compte: string;
  profil: string;
  debut: string;
  reference: string;
  calcule_le: string;
  total_projection: number | null;
  reglages: ReglagesPlan;
  jours: JourPlan30[];
}

export const JOURS_PLAN = 30;

// L'heure du serveur, lue hors du rendu (la page serveur est dynamique) : le composant, lui, reçoit l'heure en
// paramètre et reste pur, donc testable avec une heure fixe.
export function maintenantMs(): number {
  return Date.now();
}

// Les formules dans l'ordre voulu par le moteur (`ordre`), la formule par défaut en tête à égalité.
export function formulesTriees(plans: TtflPlan30[]): TtflPlan30[] {
  return [...plans].sort(
    (a, b) =>
      (a.reglages?.ordre ?? 99) - (b.reglages?.ordre ?? 99) ||
      Number(!!b.reglages?.defaut) - Number(!!a.reglages?.defaut) ||
      a.profil.localeCompare(b.profil),
  );
}

// La formule demandée si elle existe, sinon la formule par défaut du moteur, sinon la première.
export function formuleChoisie(plans: TtflPlan30[], id?: string | null): TtflPlan30 | null {
  const triees = formulesTriees(plans);
  return (
    triees.find((p) => p.profil === id) ?? triees.find((p) => p.reglages?.defaut) ?? triees[0] ?? null
  );
}

export function libelleFormule(p: TtflPlan30): string {
  return p.reglages?.libelle?.trim() || p.profil;
}

// La première soirée qui n'est pas passée ; à défaut (plan entièrement passé) la dernière.
export function jourParDefaut(plan: TtflPlan30, aujourdhui: string): string | null {
  if (plan.jours.length === 0) return null;
  return (plan.jours.find((j) => j.date >= aujourdhui) ?? plan.jours[plan.jours.length - 1]).date;
}

export interface OptionDate {
  date: string;
  libelle: string; // « mar. 20/10 »
  resume: string; // « Nikola Jokic · 52.3 » ou « aucun joueur »
  statut: StatutJourPlan;
}

// Les entrées de la liste déroulante : une par soirée du plan, passées exclues.
export function optionsDates(plan: TtflPlan30, aujourdhui: string): OptionDate[] {
  return plan.jours
    .filter((j) => j.date >= aujourdhui)
    .map((j) => {
      const e = etiquetteJour(j.date, aujourdhui);
      const nom = j.joueur ?? "aucun joueur";
      const proj = j.projection !== null && j.projection !== undefined ? ` · ${j.projection.toFixed(1)}` : "";
      return {
        date: j.date,
        libelle: e.relatif ? `${e.court} (${e.relatif})` : e.court,
        resume: j.joueur ? `${nom}${proj}` : nom,
        statut: j.statut,
      };
    });
}

// « du 20/10 au 18/11 »
export function fenetre(plan: TtflPlan30): string {
  const dates = plan.jours.map((j) => j.date);
  if (dates.length === 0) return "";
  const court = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return `du ${court(dates[0])} au ${court(dates[dates.length - 1])}`;
}

// Total attendu (projections) et décompte des soirées déjà validées.
export function bilanPlan(plan: TtflPlan30, aujourdhui: string): { total: number; nbValidees: number; nbSoirees: number } {
  const jours = plan.jours.filter((j) => j.date >= aujourdhui);
  return {
    total: jours.reduce((s, j) => s + (j.projection ?? 0), 0),
    nbValidees: jours.filter((j) => j.statut === "valide").length,
    nbSoirees: jours.length,
  };
}

// Nombre de jours en fin de fenêtre (30 jours à partir de la 1re soirée à venir) que le plan ne couvre pas, parce que
// le calendrier ou les projections de ces soirs ne sont pas encore connus. Deux jours de tolérance : une journée sans
// match NBA n'a pas de ligne dans le plan.
export function joursNonCouverts(plan: TtflPlan30, aujourdhui: string): number {
  const avenir = plan.jours.filter((j) => j.date >= aujourdhui);
  if (avenir.length === 0) return JOURS_PLAN;
  const fin = ajouterJours(avenir[0].date, JOURS_PLAN - 1);
  const manque = joursEntre(avenir[avenir.length - 1].date, fin);
  return manque > 2 ? manque : 0;
}

// Le plan est « vieux » quand il n'a pas été recalculé depuis plus de `heures` heures.
export function planPerime(plan: TtflPlan30, maintenantMs: number, heures = 30): boolean {
  return maintenantMs - new Date(plan.calcule_le).getTime() > heures * 3600 * 1000;
}

// Une phrase par poids actif, pour que la formule soit lisible (et vérifiable) sur l'écran.
export function decrireReglages(r: ReglagesPlan): string[] {
  const out: string[] = [];
  if (r.marge_engagement !== null && r.marge_engagement !== undefined) {
    out.push(
      r.marge_engagement === 0
        ? "le pick du soir est toujours le meilleur disponible"
        : `le pick du soir vaut au plus ${r.marge_engagement} pt${r.marge_engagement > 1 ? "s" : ""} de moins que le meilleur`,
    );
  }
  if (r.poids_matchup_futur !== null && r.poids_matchup_futur !== undefined && r.poids_matchup_futur !== 1) {
    out.push(`match-up des soirs futurs pris à ${Math.round(r.poids_matchup_futur * 100)} %`);
  }
  if (r.actualisation !== null && r.actualisation !== undefined && r.actualisation !== 1) {
    out.push(`valeur des soirs lointains réduite de ${((1 - r.actualisation) * 100).toFixed(1)} % par jour`);
  }
  if (r.retour_moyenne !== null && r.retour_moyenne !== undefined && r.retour_moyenne !== 1) {
    out.push("forme ramenée vers la moyenne de saison avec la distance");
  }
  if (r.exposant_presence) out.push("taux de présence récent pris en compte");
  return out;
}
