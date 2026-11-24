// Chargement (serveur) du top 30 des prochaines soirées pour la page Adversaires. Lecture seule : les projections
// viennent du moteur (mêmes runs que « Conseillés »), l'application ne calcule rien.

import type { createClient } from "@/lib/supabase/server";
import { chargerSoiree } from "@/lib/conseilles-data";
import { fusionnerSoiree, joursProposes, NB_JOURS } from "@/lib/conseilles";
import { topDeLaNuit, type NuitTop } from "@/lib/adversaires-reprises";
import type { Nuit } from "@/lib/planning";
import type { Mode, TtflManualAbsent } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface TopNuits {
  nuits: NuitTop[];
  erreur: string | null;
}

export async function chargerTopNuits(supabase: Supabase, mode: Mode, aujourdhui: string): Promise<TopNuits> {
  const [nuitsRes, absentsRes] = await Promise.all([
    supabase.from("ttfl_nuits").select("*").eq("mode", mode).returns<Nuit[]>(),
    supabase.from("ttfl_manual_absents").select("*").returns<TtflManualAbsent[]>(),
  ]);
  if (nuitsRes.error) return { nuits: [], erreur: nuitsRes.error.message };
  const dates = joursProposes(nuitsRes.data ?? [], aujourdhui, NB_JOURS);
  const absents = absentsRes.data ?? [];
  const soirees = await Promise.all(dates.map((d) => chargerSoiree(supabase, mode, d)));
  return {
    nuits: soirees.map((s, i) => topDeLaNuit(fusionnerSoiree(s.avance, s.soir), absents, dates[i])),
    erreur: soirees.find((s) => s.erreur)?.erreur ?? null,
  };
}
