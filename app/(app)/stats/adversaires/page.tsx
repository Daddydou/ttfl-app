import { createClient } from "@/lib/supabase/server";
import { BarresH, Carte, GrilleTuiles, Lignes, Tuile, Vide } from "@/components/stats/blocs";
import { chargerLigue } from "@/lib/stats-donnees";
import { evolution, picksPopulaires, progression, resumeLigue } from "@/lib/stats-adversaires";
import { dateCourte, fmt, fmtEntier, fmtSigne } from "@/lib/stats-outils";
import { fmtRang } from "@/lib/adversaires";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adversaires — Stats TTFL" };

// Les joueurs suivis dans le Centre de surveillance TTFL : leurs points, leur évolution et les picks qu'ils se partagent.
// Lecture seule. Aucun pick du compte 02 n'est concerné ici (ce sont les picks des ADVERSAIRES, relevés sur le site).
export default async function StatsAdversairesPage() {
  const supabase = await createClient();
  const { suivis, jours, picks, erreur } = await chargerLigue(supabase);

  if (suivis.length === 0) {
    return <Vide>{erreur ?? "Aucun adversaire suivi pour l'instant (Centre de surveillance TTFL)."}</Vide>;
  }

  const ligue = resumeLigue(suivis);
  const courbe = evolution(suivis, jours, 6);
  const prog = progression(suivis, jours, 7).slice(0, 8);
  const populaires = picksPopulaires(picks, 10);

  return (
    <div className="space-y-5">
      <GrilleTuiles>
        <Tuile label="Adversaires suivis" valeur={String(ligue.nSuivis)} detail={`moyenne du groupe : ${fmt(ligue.moyenneGroupe)}`} />
        <Tuile label="En tête (points)" valeur={ligue.leader ? fmtEntier(ligue.leader.points) : "—"} detail={ligue.leader?.pseudo} ton="bon" />
        <Tuile label="Meilleur rang" valeur={ligue.meilleurRang ? fmtRang(ligue.meilleurRang.rang) : "—"} detail={ligue.meilleurRang?.pseudo} />
      </GrilleTuiles>

      {courbe.labels.length > 1 && (
        <Carte titre="Évolution des points" aide="Les six adversaires les plus en vue, jour après jour (relevés du Centre de surveillance).">
          <Lignes titre="Points des adversaires" labels={courbe.labels.map(dateCourte)} series={courbe.series.map((s) => ({ nom: s.nom, valeurs: s.valeurs }))} />
        </Carte>
      )}

      {prog.length > 0 && (
        <Carte titre="Qui progresse (7 jours)" aide="Points gagnés sur la dernière semaine.">
          <BarresH
            items={prog.map((p) => ({
              label: p.pseudo,
              valeur: p.gagne,
              detail: p.rangDebut !== null && p.rangFin !== null ? `rang ${p.rangDebut} → ${p.rangFin} (${fmtSigne(p.rangDebut - p.rangFin, 0)})` : undefined,
              ton: "bon",
            }))}
          />
        </Carte>
      )}

      {populaires.length > 0 && (
        <Carte titre="Les picks préférés des adversaires" aide="Joueurs les plus pickés par les adversaires suivis, et par combien d'entre eux.">
          <BarresH items={populaires.map((j) => ({ label: j.joueur, valeur: j.n, detail: `${j.adversaires} adversaires` }))} />
        </Carte>
      )}
    </div>
  );
}
