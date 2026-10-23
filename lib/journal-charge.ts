import type { SupabaseClient } from "@supabase/supabase-js";
import { chargerSecret } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { aujourdhuiNY } from "@/lib/planning";
import { COLONNES_JOURNAL, filtrer, masquerJournal, rechercher, type EntreeJournal, type FiltreJournal } from "@/lib/journal";

export const MAX_LIGNES_JOURNAL = 600; // lignes lues par période

// Lit le journal d'une période, retire le pick secret (soirée encore secrète), applique filtre + recherche.
// Utilisé par la page ET par l'export CSV : ce qui est masqué à l'écran l'est aussi dans le fichier.
export async function chargerJournal(
  supabase: SupabaseClient,
  opts: { jours: number; filtre: FiltreJournal; q: string },
): Promise<{ entrees: EntreeJournal[]; erreur: boolean }> {
  const aujourdhui = aujourdhuiNY();
  const maintenantMs = heureServeur();
  const depuis = new Date(maintenantMs - opts.jours * 86400000).toISOString();
  const [res, secret] = await Promise.all([
    supabase.from("ttfl_journal").select(COLONNES_JOURNAL).gte("le", depuis).order("id", { ascending: false }).limit(MAX_LIGNES_JOURNAL)
      .returns<EntreeJournal[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);
  const visibles = masquerJournal(res.data ?? [], secret, aujourdhui, maintenantMs);
  return { entrees: rechercher(filtrer(visibles, opts.filtre), opts.q), erreur: Boolean(res.error) };
}
