import { createClient } from "@/lib/supabase/server";
import { VainqueursListe } from "@/components/VainqueursListe";
import { BlessesListe, DatesBlesses, VainqueursNav } from "@/components/BlessesListe";
import { PageHeader } from "@/components/ui/PageHeader";
import { aujourdhuiNY, ajouterJours } from "@/lib/planning";
import { maintenantMs } from "@/lib/plan30";
import { dateBlessesValide, type Blesse, type MatchSoiree } from "@/lib/blesses";
import type { ChoixVainqueur, MatchVainqueur, PronoKt } from "@/lib/vainqueurs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vainqueurs — TTFL" };

export default async function VainqueursPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; date?: string }>;
}) {
  const { vue, date: dateParam } = await searchParams;
  const supabase = await createClient();

  // Sous-onglet « Blessés » : Out / Doubtful des équipes qui jouent, une liste déroulante par match.
  if (vue === "blesses") {
    const aujourdhui = aujourdhuiNY();
    const demain = ajouterJours(aujourdhui, 1);
    const date = dateBlessesValide(dateParam, aujourdhui, demain);
    const { data: matchsSoiree } = await supabase
      .from("ttfl_vainqueurs_matchs")
      .select("event_id,game_date,commence_time,equipe_dom,equipe_ext,abbr_dom,abbr_ext")
      .eq("game_date", date)
      .order("commence_time")
      .returns<MatchSoiree[]>();
    // Table absente ou vide : on n'affiche simplement aucun blessé (jamais d'erreur sur cette page).
    const { data: blesses } = await supabase
      .from("ttfl_blesses")
      .select("game_date,joueur,joueur_norm,equipe_abbr,equipe,statut,statut_brut,motif,retour_prevu,source,maj_le")
      .eq("game_date", date)
      .returns<Blesse[]>();
    return (
      <div className="space-y-4">
        <PageHeader titre="Vainqueurs" sousTitre="Les joueurs Out ou Doubtful, équipe par équipe" />
        <VainqueursNav vue="blesses" />
        <DatesBlesses courant={date} aujourdhui={aujourdhui} demain={demain} />
        <BlessesListe date={date} matchs={matchsSoiree ?? []} blesses={blesses ?? []} maintenantMs={maintenantMs()} />
      </div>
    );
  }

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
        .select("event_id,choix,source,maj_le")
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
      <VainqueursNav vue="matchs" />
      <VainqueursListe matchs={liste} choix={choix ?? []} kt={kt ?? []} maintenantMs={maintenantMs()} />
    </div>
  );
}
