"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Mode, PlayerStatus } from "@/lib/types";
import { COMPTE_REF } from "@/lib/compte";
import {
  COMPTE_VALIDE,
  JOURS_CYCLE,
  ajouterJours,
  bloquesPourSoiree,
  normaliserNom,
  type PickLigne,
} from "@/lib/planning";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// --- Picks -------------------------------------------------------------------

// Enregistre le pick du soir. La table a une contrainte unique (mode, pick_date, compte)
// donc un upsert : re-picker le même soir pour le même compte remplace, il n'y a qu'un
// pick par soir ET par compte (compte 01 par défaut = écrans actuels de l'application).
export async function pickPlayer(
  mode: Mode,
  pickDate: string,
  player: string,
  compte: string = COMPTE_REF,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_picks")
    .upsert(
      { mode, pick_date: pickDate, player, compte },
      { onConflict: "mode,pick_date,compte" },
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/ce-soir");
  revalidatePath("/picks");
  revalidatePath("/stats");
  return { ok: true, message: `${player} enregistré comme pick du ${pickDate}.` };
}

// Saisit (ou corrige) le score réel d'un pick a posteriori. Le PC recalculera
// ttfl_season_stats à son prochain push ; on met aussi à jour l'affichage ici.
export async function setScore(
  pickId: number,
  score: number | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_picks")
    .update({ score })
    .eq("id", pickId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/picks");
  revalidatePath("/stats");
  return { ok: true };
}

export async function deletePick(pickId: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("ttfl_picks").delete().eq("id", pickId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/picks");
  revalidatePath("/stats");
  return { ok: true };
}

// --- Planning « Mes picks » : plusieurs soirées, plusieurs comptes -------------

export interface JoueurDuSoir {
  player: string;
  team: string | null;
  opponent: string | null;
  projection: number | null;
  status: PlayerStatus | null;
  source: "soir" | "avance";
}

type LigneProjection = {
  run_id: number;
  player: string;
  team: string | null;
  opponent: string | null;
  projection: number | null;
  status: PlayerStatus | null;
};

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Joueurs proposés pour une soirée : projections du dernier run « à l'avance » (tous les
// joueurs, cycle non appliqué), complétées et écrasées par le dernier run du push du soir
// (blessures fraîches, mais Top 10 seulement). Appelé à l'ouverture de la liste d'une soirée.
export async function listerJoueursDuSoir(
  mode: Mode,
  date: string,
): Promise<
  | { ok: true; joueurs: JoueurDuSoir[]; avanceSeule: boolean }
  | { ok: false; error: string }
> {
  if (!DATE_ISO.test(date)) return { ok: false, error: "Date invalide." };
  const supabase = await createClient();

  const [avance, soir] = await Promise.all([
    supabase
      .from("ttfl_runs")
      .select("id")
      .eq("mode", mode)
      .eq("game_date", date)
      .like("note", "AVANCE%")
      .order("computed_at", { ascending: false })
      .limit(1)
      .returns<{ id: number }[]>(),
    supabase
      .from("ttfl_runs")
      .select("id")
      .eq("mode", mode)
      .eq("game_date", date)
      .or("note.is.null,note.not.like.AVANCE*")
      .order("computed_at", { ascending: false })
      .limit(1)
      .returns<{ id: number }[]>(),
  ]);
  const erreurRuns = avance.error ?? soir.error;
  if (erreurRuns) return { ok: false, error: erreurRuns.message };

  const idAvance = avance.data?.[0]?.id;
  const idSoir = soir.data?.[0]?.id;
  const ids = [idAvance, idSoir].filter((x): x is number => typeof x === "number");
  if (ids.length === 0) return { ok: true, joueurs: [], avanceSeule: false };

  const { data, error } = await supabase
    .from("ttfl_projections")
    .select("run_id,player,team,opponent,projection,status")
    .in("run_id", ids)
    .returns<LigneProjection[]>();
  if (error) return { ok: false, error: error.message };

  // L'« avance » d'abord, le run du soir écrase (données plus fraîches).
  const parNom = new Map<string, JoueurDuSoir>();
  for (const idRun of [idAvance, idSoir]) {
    if (idRun === undefined) continue;
    const source = idRun === idAvance ? "avance" : "soir";
    for (const l of (data ?? []).filter((x) => x.run_id === idRun)) {
      parNom.set(normaliserNom(l.player), {
        player: l.player,
        team: l.team,
        opponent: l.opponent,
        projection: l.projection,
        status: l.status,
        source,
      });
    }
  }
  const joueurs = [...parNom.values()].sort(
    (a, b) => (b.projection ?? -1) - (a.projection ?? -1),
  );
  return { ok: true, joueurs, avanceSeule: idSoir === undefined };
}

function comptesValides(comptes: string[]): string[] | null {
  const liste = [...new Set(comptes)];
  return liste.length > 0 && liste.every((c) => COMPTE_VALIDE.test(c)) ? liste : null;
}

// Enregistre le pick d'une soirée pour une liste de comptes (une zone). C'est l'état VOULU :
// le robot du PC le compare ensuite à ce qui est posé sur le site TTFL.
export async function pickPlayerComptes(
  mode: Mode,
  pickDate: string,
  player: string,
  comptes: string[],
): Promise<ActionResult> {
  if (mode !== "regular") {
    return { ok: false, error: "Le planning est disponible en saison régulière." };
  }
  const joueur = player.trim();
  const liste = comptesValides(comptes);
  if (!DATE_ISO.test(pickDate)) return { ok: false, error: "Date invalide." };
  if (!joueur || joueur.length > 80) return { ok: false, error: "Joueur invalide." };
  if (!liste) return { ok: false, error: "Comptes invalides." };

  const supabase = await createClient();

  // Cycle de 30 jours revérifié côté serveur : l'écran désactive déjà ces joueurs, mais la
  // liste affichée peut être périmée (autre appareil, pick remonté du site entre-temps).
  const { data: voisins, error: errVoisins } = await supabase
    .from("ttfl_picks")
    .select("pick_date,player,compte")
    .eq("mode", mode)
    .in("compte", liste)
    .gte("pick_date", ajouterJours(pickDate, -JOURS_CYCLE))
    .lte("pick_date", ajouterJours(pickDate, JOURS_CYCLE))
    .returns<PickLigne[]>();
  if (errVoisins) return { ok: false, error: errVoisins.message };

  const bloques = bloquesPourSoiree(voisins ?? [], liste, pickDate)[normaliserNom(joueur)];
  if (bloques && bloques.length > 0) {
    return {
      ok: false,
      error: `${joueur} est déjà pické à ${JOURS_CYCLE} jours ou moins sur le(s) compte(s) ${bloques.join(", ")}.`,
    };
  }

  const { error } = await supabase.from("ttfl_picks").upsert(
    liste.map((compte) => ({
      mode,
      pick_date: pickDate,
      player: joueur,
      compte,
      source: "app",
    })),
    { onConflict: "mode,pick_date,compte" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/ce-soir");
  revalidatePath("/picks");
  revalidatePath("/stats");
  return {
    ok: true,
    message: `${joueur} enregistré le ${pickDate} pour ${liste.length} compte(s).`,
  };
}

// Retire le pick d'une soirée pour une liste de comptes. Ne retire RIEN sur le site TTFL :
// si le pick y est déjà posé, le robot le signalera comme conflit.
export async function retirerPickComptes(
  mode: Mode,
  pickDate: string,
  comptes: string[],
): Promise<ActionResult> {
  const liste = comptesValides(comptes);
  if (!DATE_ISO.test(pickDate)) return { ok: false, error: "Date invalide." };
  if (!liste) return { ok: false, error: "Comptes invalides." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_picks")
    .delete()
    .eq("mode", mode)
    .eq("pick_date", pickDate)
    .in("compte", liste);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/ce-soir");
  revalidatePath("/picks");
  revalidatePath("/stats");
  return { ok: true };
}

// --- Absents manuels ---------------------------------------------------------

export async function addAbsent(
  player: string,
  dateDebut: string,
  dateFin: string | null,
  raison: string | null,
): Promise<ActionResult> {
  if (!player.trim()) return { ok: false, error: "Nom du joueur requis." };
  if (dateFin && dateFin < dateDebut)
    return { ok: false, error: "La date de fin précède la date de début." };

  const supabase = await createClient();
  const { error } = await supabase.from("ttfl_manual_absents").insert({
    player: player.trim(),
    date_debut: dateDebut,
    date_fin: dateFin,
    raison: raison?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/absents");
  return { ok: true, message: `${player.trim()} ajouté aux absents.` };
}

export async function deleteAbsent(id: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_manual_absents")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/absents");
  return { ok: true };
}
