import { createClient } from "@/lib/supabase/server";
import { Carte, Colonnes, GrilleTuiles, Tableau, Tuile, Vide } from "@/components/stats/blocs";
import { chargerPassages } from "@/lib/stats-donnees";
import { bilanSysteme } from "@/lib/stats-systeme";
import { dateCourte, fmt, fmtPourcent } from "@/lib/stats-outils";
import { heureParis } from "@/lib/vainqueurs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Système — Stats TTFL" };

// Santé du moteur dans le cloud sur 14 jours : passages réussis, échecs et durées. Lecture seule.
export default async function StatsSystemePage() {
  const supabase = await createClient();
  const passages = await chargerPassages(supabase, 14);
  if (passages.length === 0) return <Vide>Aucun passage du moteur enregistré sur les 14 derniers jours.</Vide>;

  const b = bilanSysteme(passages);

  return (
    <div className="space-y-5">
      <GrilleTuiles>
        <Tuile label="Passages (14 j)" valeur={String(b.passages)} detail={`${b.echecs} en échec`} />
        <Tuile label="Réussite" valeur={fmtPourcent(b.tauxReussite)} ton={b.echecs === 0 ? "bon" : "neutre"} />
        <Tuile label="Durée moyenne" valeur={b.dureeMoyenne === null ? "—" : `${fmt(b.dureeMoyenne, 0)} s`} />
        <Tuile label="Dernier passage" valeur={b.dernier ? heureParis(b.dernier) : "—"} detail={b.dernier ? dateCourte(b.dernier.slice(0, 10)) : undefined} />
      </GrilleTuiles>

      <Carte titre="Passages par jour" aide="Rouge = jour avec au moins un échec.">
        <Colonnes titre="Passages du moteur par jour" items={b.parJour.map((j) => ({ label: dateCourte(j.jour), valeur: j.passages, ton: j.echecs > 0 ? "mauvais" : "neutre" }))} />
      </Carte>

      <Carte titre="Par tâche" aide="Chaque tâche du moteur : nombre de passages, échecs et durée moyenne.">
        <Tableau
          colonnes={["Tâche", "Passages", "Échecs", "Durée"]}
          lignes={b.parTache.map((t) => [t.tache, t.passages, t.echecs, t.dureeMoyenne === null ? "—" : `${fmt(t.dureeMoyenne, 0)} s`])}
        />
      </Carte>

      {b.echecsRecents.length > 0 && (
        <Carte titre="Derniers échecs" aide="Les plus récents d'abord.">
          <Tableau
            colonnes={["Tâche", "Jour", "Code"]}
            lignes={b.echecsRecents.map((p) => [p.tache, `${dateCourte(p.debut_le.slice(0, 10))} ${heureParis(p.debut_le)}`, p.code ?? "—"])}
          />
        </Carte>
      )}
    </div>
  );
}
