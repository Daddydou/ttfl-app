import { createClient } from "@/lib/supabase/server";
import { VainqueursListe } from "@/components/VainqueursListe";
import { PageHeader } from "@/components/ui/PageHeader";
import { aujourdhuiNY, ajouterJours } from "@/lib/planning";
import { maintenantMs } from "@/lib/plan30";
import { indexerPicks, type Blesse, type PickCompte } from "@/lib/blesses";
import { chargerSecret, masquerLignes } from "@/lib/secret";
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

  // Blessés (Out / Doubtful) de ce soir et de demain, écrits par le moteur : affichés dans une liste déroulante de chaque
  // match. Table absente ou vide : aucun blessé affiché, jamais d'erreur sur cette page.
  const { data: blesses } = await supabase
    .from("ttfl_blesses")
    .select("game_date,joueur,joueur_norm,equipe_abbr,equipe,statut,statut_brut,motif,retour_prevu,source,maj_le")
    .gte("game_date", depuis)
    .returns<Blesse[]>();

  // Les picks de mes comptes sur ces soirées : affichés (C1, C2...) à côté des joueurs blessés. Pick secret du compte 02 :
  // sa ligne est retirée tant que la soirée n'est ni close ni révélée (sinon son étiquette trahirait son joueur).
  // Lecture impossible : aucune étiquette, jamais d'erreur sur cette page.
  const datesBlessees = [...new Set((blesses ?? []).map((b) => b.game_date))];
  const aujourdhui = aujourdhuiNY();
  const [secret, picksRes] = await Promise.all([
    chargerSecret(supabase, aujourdhui),
    datesBlessees.length
      ? supabase.from("ttfl_picks").select("pick_date,compte,player").in("pick_date", datesBlessees).returns<PickCompte[]>()
      : Promise.resolve({ data: [] as PickCompte[] }),
  ]);
  const picks = indexerPicks(masquerLignes(picksRes.data ?? [], secret, aujourdhui, maintenantMs()));

  return (
    <div className="space-y-4">
      <PageHeader titre="Vainqueurs" sousTitre="Le favori des bookmakers pour chaque match, avec les blessés" />
      <VainqueursListe matchs={liste} choix={choix ?? []} kt={kt ?? []} blesses={blesses ?? []} picks={picks} maintenantMs={maintenantMs()} />
    </div>
  );
}
