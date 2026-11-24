// Résumé du x2 par compte (23/11/2026) : pour chacun des 13 comptes, où en est le x2 du MOIS en cours (posé et validé ?
// à venir ? pas encore posé ?) et celui du mois suivant s'il est déjà prévu. Logique pure, lecture seule : l'application
// ne décide rien, elle lit `ttfl_x2` (moteur / robot / pose à la main).
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPTES_X2, moisDe, type StatutX2 } from "@/lib/x2";

export type EtatX2Mois =
  | "valide" //      posé sur le site ET soirée jouée : les points sont comptés
  | "pose_avenir" // posé sur le site, soirée pas encore jouée
  | "prevu" //       voulu, pas encore posé sur le site (soirée à venir)
  | "non_pose" //    voulu mais la soirée est passée sans que le x2 ait été posé
  | "retrait" //     retrait demandé, le robot l'enlève du site
  | "echec" //       pose en échec, nouvel essai au prochain passage
  | "retire_main" // retiré à la main sur le site : le robot ne le repose pas ce mois-ci
  | "secret" //      soirée secrète du compte 02 : rien n'est montré
  | "aucun"; //      aucun x2 prévu pour ce mois

export interface LigneResumeX2 {
  compte: string;
  mois: string;
  pick_date: string;
  player: string;
  statut: StatutX2;
  date_site: string | null;
}

export interface CelluleResumeX2 {
  etat: EtatX2Mois;
  date: string | null; // JJ/MM (null si aucun ou secret)
  joueur: string | null; // null si aucun ou secret
}

export interface ResumeCompteX2 {
  compte: string;
  ceMois: CelluleResumeX2;
  moisSuivant: CelluleResumeX2 | null; // null = rien de prévu pour le mois suivant
}

export interface SyntheseX2 {
  mois: string;
  valides: number;
  aVenir: number; // posés ou prévus, soirée à venir
  problemes: number; // non posés, échecs, retirés à la main
  sans: number; // aucun x2 ce mois-ci
  secrets: number;
}

const jj = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function moisSuivant(mois: string): string {
  const [a, m] = mois.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

export function etatDeLigne(l: LigneResumeX2, aujourdhui: string): EtatX2Mois {
  const date = String(l.pick_date).slice(0, 10);
  const passee = date < aujourdhui;
  switch (l.statut) {
    case "pose":
      return passee ? "valide" : "pose_avenir";
    case "voulu":
      return passee ? "non_pose" : "prevu";
    case "a_retirer":
      return "retrait";
    case "echec":
      return "echec";
    case "annule_site":
      return "retire_main";
  }
}

function cellule(
  l: LigneResumeX2 | undefined,
  aujourdhui: string,
  estSecret: (compte: string, date: string) => boolean,
): CelluleResumeX2 {
  if (!l) return { etat: "aucun", date: null, joueur: null };
  const date = String(l.pick_date).slice(0, 10);
  const dateSite = l.date_site ? String(l.date_site).slice(0, 10) : null;
  if (estSecret(l.compte, date) || (dateSite && estSecret(l.compte, dateSite))) {
    return { etat: "secret", date: null, joueur: null };
  }
  return { etat: etatDeLigne(l, aujourdhui), date: jj(date), joueur: l.player };
}

/** Un état par compte : le x2 du mois en cours et, s'il existe déjà, celui du mois suivant. */
export function resumerX2(
  lignes: LigneResumeX2[],
  aujourdhui: string,
  estSecret: (compte: string, date: string) => boolean = () => false,
  comptes: string[] = COMPTES_X2,
): ResumeCompteX2[] {
  const mois = moisDe(aujourdhui);
  const suivant = moisSuivant(mois);
  return comptes.map((compte) => {
    const deCompte = lignes.filter((l) => l.compte === compte);
    const ceMois = cellule(deCompte.find((l) => l.mois === mois), aujourdhui, estSecret);
    const ligneSuivante = deCompte.find((l) => l.mois === suivant);
    return { compte, ceMois, moisSuivant: ligneSuivante ? cellule(ligneSuivante, aujourdhui, estSecret) : null };
  });
}

export function synthetiser(resume: ResumeCompteX2[], aujourdhui: string): SyntheseX2 {
  const s: SyntheseX2 = { mois: moisDe(aujourdhui), valides: 0, aVenir: 0, problemes: 0, sans: 0, secrets: 0 };
  for (const r of resume) {
    switch (r.ceMois.etat) {
      case "valide": s.valides++; break;
      case "pose_avenir":
      case "prevu":
      case "retrait": s.aVenir++; break;
      case "non_pose":
      case "echec":
      case "retire_main": s.problemes++; break;
      case "secret": s.secrets++; break;
      case "aucun": s.sans++; break;
    }
  }
  return s;
}

/** Lit les lignes du mois en cours et des suivants (tolérant : erreur = aucune ligne). */
export async function lireLignesResumeX2(supabase: SupabaseClient, aujourdhui: string): Promise<LigneResumeX2[]> {
  const { data, error } = await supabase
    .from("ttfl_x2")
    .select("compte,mois,pick_date,player,statut,date_site")
    .eq("mode", "regular")
    .gte("mois", moisDe(aujourdhui))
    .returns<LigneResumeX2[]>();
  return error || !data ? [] : data;
}
