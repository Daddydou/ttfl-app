import { createClient } from "@/lib/supabase/server";
import { VainqueursListe } from "@/components/VainqueursListe";
import { PageHeader } from "@/components/ui/PageHeader";
import { aujourdhuiNY, ajouterJours } from "@/lib/planning";
import { maintenantMs } from "@/lib/plan30";
import type { ChoixVainqueur, MatchVainqueur, PronoKt } from "@/lib/vainqueurs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vainqueurs — TTFL" };

export default async function VainqueursPage() {
  const supabase = await createClient();
  // La veille comprise : on garde les matchs de la soirée en cours (finis ou non) avec leur résultat.
  const depuis = ajouterJours(aujourdhuiNY(), -1);

  const { data: matchs } = await supabase
    .from("ttfl_vainqueurs_matchs")
    .select(
      "event_id,game_date,commence_time,equipe_dom,equipe_ext,abbr_dom,abbr_ext,prob_dom,cote_dom,cote_ext,nb_books,favori,serre,releve_le,resultat",
    )
    .gte("game_date", depuis)
    .order("commence_time")
    .returns<MatchVainqueur[]>();
  const liste = matchs ?? [];

  const { data: choix } = liste.length
    ? await supabase
        .from("ttfl_vainqueurs_choix")
        .select("event_id,choix,source")
        .in("event_id", liste.map((m) => m.event_id))
        .returns<ChoixVainqueur[]>()
    : { data: [] as ChoixVainqueur[] };

  // Ce qui est enregistré chez Thomas (relu par le PC). Table absente ou vide : on n'affiche simplement rien.
  const { data: kt } = liste.length
    ? await supabase
        .from("ttfl_vainqueurs_kt")
        .select("event_id,cote,statut,maj_le")
        .in("event_id", liste.map((m) => m.event_id))
        .returns<PronoKt[]>()
    : { data: [] as PronoKt[] };

  return (
    <div className="space-y-4">
      <PageHeader titre="Vainqueurs" sousTitre="Le favori des bookmakers pour chaque match" />
      <VainqueursListe matchs={liste} choix={choix ?? []} kt={kt ?? []} maintenantMs={maintenantMs()} />
    </div>
  );
}
