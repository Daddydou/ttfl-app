// Chargement des données de la grande page Stats. LECTURE SEULE (aucune écriture en base).
//
// Deux règles qui valent pour TOUTES les sous-pages :
//  1. Pick secret du compte 02 : tant que la soirée est ouverte, aucune ligne qui trahirait son joueur n'est gardée
//     (picks, x2, ligne « prudent » du suivi des formules). Les calculs ne voient donc jamais ces lignes.
//  2. PostgREST coupe à 1 000 lignes par requête : on lit par pages (lirePages) pour ne rien perdre en milieu de saison.

import type { SupabaseClient } from "@supabase/supabase-js";
import { masquerLignes, soireeSecrete, type EtatSecret } from "@/lib/secret";
import type { Mode, TtflProjection, TtflSuivi, TtflSuiviPick } from "@/lib/types";
import type { ScorePick } from "@/lib/stats-equipe";
import type { LigneSuivi } from "@/lib/suivi-formules";
import type { LigneX2 } from "@/lib/x2";
import type { JourSuivi } from "@/lib/stats-adversaires";
import type { Passage } from "@/lib/stats-systeme";
import type { ChoixVainqueur, MatchVainqueur } from "@/lib/vainqueurs";
import type { LigneAbsence, ProjectionNuit } from "@/lib/stats-moteur";

const TAILLE_PAGE = 1000;
const PAGES_MAX = 30; // garde-fou : 30 000 lignes au plus

type Reponse<T> = { data: T[] | null; error: unknown };

// Lit toutes les pages d'une requête. `construire(debut, fin)` renvoie la requête déjà limitée à la plage demandée.
export async function lirePages<T>(construire: (debut: number, fin: number) => PromiseLike<Reponse<T>>): Promise<T[]> {
  const tout: T[] = [];
  for (let page = 0; page < PAGES_MAX; page += 1) {
    const { data, error } = await construire(page * TAILLE_PAGE, page * TAILLE_PAGE + TAILLE_PAGE - 1);
    if (error || !data) break;
    tout.push(...data);
    if (data.length < TAILLE_PAGE) break;
  }
  return tout;
}

// Mode demandé dans l'URL, sinon celui du dernier calcul du moteur.
export async function resoudreMode(supabase: SupabaseClient, explicite?: string): Promise<Mode> {
  if (explicite === "regular" || explicite === "playoffs") return explicite;
  const { data } = await supabase
    .from("ttfl_latest_run")
    .select("mode")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.mode as Mode) ?? "regular";
}

export interface ContexteSecret {
  etat: EtatSecret;
  aujourdhui: string;
  maintenantMs: number;
}

// Tous les picks NOTÉS (score connu) de tous les comptes pour un mode, sans les soirées encore secrètes.
export async function chargerPicksNotes(supabase: SupabaseClient, mode: Mode, ctx: ContexteSecret): Promise<ScorePick[]> {
  const lignes = await lirePages<ScorePick>((debut, fin) =>
    supabase
      .from("ttfl_picks")
      .select("compte,pick_date,player,score")
      .eq("mode", mode)
      .not("score", "is", null)
      .order("pick_date", { ascending: true })
      .order("id", { ascending: true })
      .range(debut, fin)
      .returns<ScorePick[]>(),
  );
  return masquerLignes(lignes, ctx.etat, ctx.aujourdhui, ctx.maintenantMs).filter((p) => p.score !== null);
}

// Suivi des formules du Plan 30 : la ligne de la formule du compte 02 est retirée tant que sa soirée est secrète.
export async function chargerSuiviFormules(supabase: SupabaseClient, ctx: ContexteSecret): Promise<LigneSuivi[]> {
  const lignes = await lirePages<LigneSuivi>((debut, fin) =>
    supabase
      .from("ttfl_plan30_suivi")
      .select("profil,pick_date,joueur,projection,score_reel")
      .order("pick_date", { ascending: true })
      .range(debut, fin)
      .returns<LigneSuivi[]>(),
  );
  return lignes.filter((l) => !(l.profil === ctx.etat.profil && soireeSecrete(ctx.etat, ctx.etat.compte, l.pick_date, ctx.aujourdhui, ctx.maintenantMs)));
}

// Les x2 (tous statuts), sans ceux du compte secret sur une soirée encore secrète.
export async function chargerX2(supabase: SupabaseClient, ctx: ContexteSecret): Promise<LigneX2[]> {
  const lignes = await lirePages<LigneX2>((debut, fin) =>
    supabase.from("ttfl_x2").select("*").eq("mode", "regular").order("pick_date", { ascending: true }).range(debut, fin).returns<LigneX2[]>(),
  );
  return masquerLignes(lignes, ctx.etat, ctx.aujourdhui, ctx.maintenantMs);
}

export interface DonneesLigue {
  suivis: TtflSuivi[];
  jours: JourSuivi[];
  picks: TtflSuiviPick[];
  erreur: string | null;
}

// Joueurs suivis du Centre de surveillance (les adversaires), leurs points par jour et leurs picks.
export async function chargerLigue(supabase: SupabaseClient): Promise<DonneesLigue> {
  const [suivisRes, jours, picks] = await Promise.all([
    supabase.from("ttfl_suivis").select("*").eq("suivi", true).returns<TtflSuivi[]>(),
    lirePages<JourSuivi>((debut, fin) =>
      supabase.from("ttfl_suivis_jours").select("users_id,jour,points,rang").order("jour", { ascending: true }).range(debut, fin).returns<JourSuivi[]>(),
    ),
    lirePages<TtflSuiviPick>((debut, fin) =>
      supabase.from("ttfl_suivis_picks").select("users_id,pick_date,joueur").order("pick_date", { ascending: true }).range(debut, fin).returns<TtflSuiviPick[]>(),
    ),
  ]);
  return { suivis: suivisRes.data ?? [], jours, picks, erreur: suivisRes.error ? "Liste des adversaires illisible." : null };
}

export interface DonneesNba {
  projections: TtflProjection[];
  soiree: string | null;
  calculeLe: string | null;
}

// Les projections du DERNIER calcul du moteur pour un mode (classement des joueurs NBA du soir).
export async function chargerProjectionsNba(supabase: SupabaseClient, mode: Mode): Promise<DonneesNba> {
  const { data: run } = await supabase
    .from("ttfl_latest_run")
    .select("id,game_date,computed_at")
    .eq("mode", mode)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = run as { id: number; game_date: string; computed_at: string } | null;
  if (!r) return { projections: [], soiree: null, calculeLe: null };
  const projections = await lirePages<TtflProjection>((debut, fin) =>
    supabase.from("ttfl_projections").select("*").eq("run_id", r.id).order("rank", { ascending: true }).range(debut, fin).returns<TtflProjection[]>(),
  );
  return { projections, soiree: r.game_date, calculeLe: r.computed_at };
}

export interface DonneesVainqueurs {
  matchs: MatchVainqueur[];
  choix: Map<string, ChoixVainqueur>;
}

export async function chargerVainqueurs(supabase: SupabaseClient): Promise<DonneesVainqueurs> {
  const [matchs, choix] = await Promise.all([
    lirePages<MatchVainqueur>((debut, fin) =>
      supabase
        .from("ttfl_vainqueurs_matchs")
        .select("event_id,game_date,commence_time,equipe_dom,equipe_ext,abbr_dom,abbr_ext,prob_dom,cote_dom,cote_ext,nb_books,favori,serre,releve_le,resultat")
        .order("commence_time", { ascending: true })
        .range(debut, fin)
        .returns<MatchVainqueur[]>(),
    ),
    lirePages<ChoixVainqueur>((debut, fin) =>
      supabase.from("ttfl_vainqueurs_choix").select("event_id,choix,source,maj_le").order("event_id", { ascending: true }).range(debut, fin).returns<ChoixVainqueur[]>(),
    ),
  ]);
  return { matchs, choix: new Map(choix.map((c) => [c.event_id, c])) };
}

// Passages du moteur dans le cloud sur les `jours` derniers jours (mode réel seulement).
export async function chargerPassages(supabase: SupabaseClient, jours = 14): Promise<Passage[]> {
  const depuis = new Date(Date.now() - jours * 86400_000).toISOString();
  return lirePages<Passage>((debut, fin) =>
    supabase
      .from("ttfl_moteur_passages")
      .select("tache,mode,debut_le,fin_le,code,echecs")
      .eq("mode", "reel")
      .gte("debut_le", depuis)
      .order("debut_le", { ascending: false })
      .range(debut, fin)
      .returns<Passage[]>(),
  );
}

// Projection du DERNIER calcul du moteur pour chacune des soirées demandées (pour comparer aux scores réels).
export async function chargerProjectionsDesSoirees(supabase: SupabaseClient, mode: Mode, dates: string[]): Promise<ProjectionNuit[]> {
  const uniques = [...new Set(dates.map((d) => String(d).slice(0, 10)))].sort();
  if (uniques.length === 0) return [];
  const runs = await lirePages<{ id: number; game_date: string; computed_at: string }>((debut, fin) =>
    supabase
      .from("ttfl_runs")
      .select("id,game_date,computed_at")
      .eq("mode", mode)
      .in("game_date", uniques)
      .order("computed_at", { ascending: true })
      .range(debut, fin)
      .returns<{ id: number; game_date: string; computed_at: string }[]>(),
  );
  const dernierParSoiree = new Map<string, number>();
  for (const r of runs) dernierParSoiree.set(String(r.game_date).slice(0, 10), r.id); // tri croissant : le dernier gagne
  const ids = [...dernierParSoiree.values()];
  if (ids.length === 0) return [];
  const dateDuRun = new Map([...dernierParSoiree.entries()].map(([date, id]) => [id, date]));
  const lignes = await lirePages<{ run_id: number; player: string; projection: number | null }>((debut, fin) =>
    supabase
      .from("ttfl_projections")
      .select("run_id,player,projection")
      .in("run_id", ids)
      .order("run_id", { ascending: true })
      .order("rank", { ascending: true })
      .range(debut, fin)
      .returns<{ run_id: number; player: string; projection: number | null }[]>(),
  );
  return lignes.flatMap((l) => {
    const date = dateDuRun.get(l.run_id);
    return date ? [{ date, player: l.player, projection: l.projection }] : [];
  });
}

// Historique des statuts de blessure relevés (une ligne à chaque changement).
export async function chargerAbsences(supabase: SupabaseClient): Promise<LigneAbsence[]> {
  return lirePages<LigneAbsence>((debut, fin) =>
    supabase
      .from("ttfl_blesses_historique")
      .select("game_date,joueur_norm,statut,vu_le")
      .order("game_date", { ascending: true })
      .order("id", { ascending: true })
      .range(debut, fin)
      .returns<LigneAbsence[]>(),
  );
}
