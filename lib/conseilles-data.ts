// Chargement (serveur) des projections d'UNE soirée : run « à l'avance » + run « du soir » + cotes.
// La logique de classement est dans lib/conseilles.ts (pure) ; ici, seulement les lectures Supabase.

import type { createClient } from "@/lib/supabase/server";
import type { Mode, TtflCotes, TtflProjection, TtflRun } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface SoireeChargee {
  avance: TtflProjection[];
  soir: TtflProjection[];
  runSoir: TtflRun | null; // run du push du soir (blessures fraîches), s'il existe
  runAvance: TtflRun | null;
  cotes: TtflCotes[];
  erreur: string | null;
}

const estAvance = (r: TtflRun) => (r.note ?? "").startsWith("AVANCE");

export async function chargerSoiree(supabase: Supabase, mode: Mode, date: string): Promise<SoireeChargee> {
  const [runsRes, cotesRes] = await Promise.all([
    supabase
      .from("ttfl_runs")
      .select("*")
      .eq("mode", mode)
      .eq("game_date", date)
      .order("computed_at", { ascending: false })
      .limit(60)
      .returns<TtflRun[]>(),
    supabase.from("ttfl_cotes").select("*").eq("mode", mode).eq("game_date", date).returns<TtflCotes[]>(),
  ]);

  const runs = runsRes.data ?? [];
  const runSoir = runs.find((r) => !estAvance(r)) ?? null;
  const runAvance = runs.find(estAvance) ?? null;
  const ids = [...new Set([runSoir?.id, runAvance?.id].filter((x): x is number => typeof x === "number"))];

  let projections: TtflProjection[] = [];
  let erreurProj: string | null = null;
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("ttfl_projections")
      .select("*")
      .in("run_id", ids)
      .returns<TtflProjection[]>();
    projections = data ?? [];
    erreurProj = error?.message ?? null;
  }

  return {
    avance: runAvance ? projections.filter((p) => p.run_id === runAvance.id) : [],
    // Sans run « à l'avance », un seul run : on le range côté « soir » quel que soit son numéro.
    soir: runSoir ? projections.filter((p) => p.run_id === runSoir.id) : [],
    runSoir,
    runAvance,
    cotes: cotesRes.data ?? [],
    erreur: runsRes.error?.message ?? erreurProj,
  };
}
