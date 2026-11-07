import { createClient } from "@/lib/supabase/server";
import { ModeTabs } from "@/components/ModeTabs";
import { BarresH, Carte, GrilleTuiles, Tableau, Tuile, Vide } from "@/components/stats/blocs";
import { chargerProjectionsNba, resoudreMode } from "@/lib/stats-donnees";
import { parDefense, parPoste, plusEnForme, plusReguliers, repartitionStatuts, resumeSoirNba, topProjections } from "@/lib/stats-nba";
import { dateCourte, fmt, fmtSigne } from "@/lib/stats-outils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Joueurs NBA — Stats TTFL" };

// Le dernier calcul du moteur : les meilleurs joueurs du soir, leur forme, les défenses les plus permissives.
// Ce sont les projections du moteur (affichage seul) : rien n'est recalculé ici.
export default async function StatsJoueursNbaPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode: explicite } = await searchParams;
  const supabase = await createClient();
  const mode = await resoudreMode(supabase, explicite);
  const { projections, soiree } = await chargerProjectionsNba(supabase, mode);

  if (projections.length === 0) {
    return (
      <div className="space-y-4">
        <ModeTabs base="/stats/joueurs-nba" current={mode} />
        <Vide>Pas encore de calcul du moteur pour ce mode.</Vide>
      </div>
    );
  }

  const resume = resumeSoirNba(projections);
  const top = topProjections(projections, 12);
  const defenses = parDefense(projections);
  const permissives = defenses.slice(0, 6);
  const fermees = [...defenses].reverse().slice(0, 6);
  const postes = parPoste(projections);
  const enForme = plusEnForme(projections, 8);
  const reguliers = plusReguliers(projections, 8);
  const statuts = repartitionStatuts(projections);

  return (
    <div className="space-y-5">
      <ModeTabs base="/stats/joueurs-nba" current={mode} />

      <GrilleTuiles>
        <Tuile label="Joueurs analysés" valeur={String(resume.nJoueurs)} detail={soiree ? `soirée du ${dateCourte(soiree)}` : undefined} />
        <Tuile label="Meilleure projection" valeur={resume.meilleure ? fmt(resume.meilleure.projection) : "—"} detail={resume.meilleure?.player} ton="bon" />
      </GrilleTuiles>

      <Carte titre="Les meilleures projections du soir" aide="Score TTFL attendu, selon le moteur.">
        <BarresH items={top.map((p) => ({ label: p.player, valeur: p.projection ?? 0, texte: fmt(p.projection), detail: [p.team, p.opponent ? `vs ${p.opponent}` : null].filter(Boolean).join(" ") }))} />
      </Carte>

      {enForme.length > 0 && (
        <Carte titre="Les plus en forme" aide="Moyenne des 5 derniers matchs moins moyenne de la saison.">
          <BarresH items={enForme.map((j) => ({ label: j.joueur, valeur: Math.max(0, j.ecart), texte: fmtSigne(j.ecart), detail: `${fmt(j.moy5)} sur 5 matchs · ${fmt(j.saison)} saison`, ton: "bon" }))} />
        </Carte>
      )}

      {reguliers.length > 0 && (
        <Carte titre="Les plus réguliers" aide="Parmi les meilleures projections, ceux dont les scores varient le moins (écart faible = joueur constant).">
          <Tableau colonnes={["Joueur", "Proj.", "Écart"]} lignes={reguliers.map((j) => [j.joueur, fmt(j.projection), fmt(j.ecart10)])} />
        </Carte>
      )}

      {permissives.length > 0 && (
        <Carte titre="Défenses les plus permissives ce soir" aide="Facteur de match-up moyen : au-dessus de 1, la défense concède plus que la moyenne.">
          <BarresH items={permissives.map((d) => ({ label: d.adversaire, valeur: d.matchup, texte: d.matchup.toFixed(2), detail: `${d.n} joueurs`, ton: "bon" }))} max={1.3} />
        </Carte>
      )}

      {fermees.length > 0 && (
        <Carte titre="Défenses les plus fermées ce soir" aide="Facteur de match-up moyen sous 1 : plus difficile pour les joueurs en face.">
          <BarresH items={fermees.map((d) => ({ label: d.adversaire, valeur: d.matchup, texte: d.matchup.toFixed(2), detail: `${d.n} joueurs`, ton: "mauvais" }))} max={1.3} />
        </Carte>
      )}

      {postes.length > 0 && (
        <Carte titre="Par poste" aide="Projection et forme moyennes des joueurs analysés.">
          <Tableau colonnes={["Poste", "Joueurs", "Proj.", "Forme"]} lignes={postes.map((p) => [p.poste, p.n, fmt(p.projection), fmt(p.forme)])} />
        </Carte>
      )}

      {statuts.length > 0 && (
        <Carte titre="Statuts des joueurs analysés" aide="Disponibles, incertains, absents.">
          <BarresH items={statuts.map((s) => ({ label: s.statut, valeur: s.n }))} />
        </Carte>
      )}
    </div>
  );
}
