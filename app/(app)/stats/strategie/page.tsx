import { createClient } from "@/lib/supabase/server";
import { ModeTabs } from "@/components/ModeTabs";
import { BarresH, Carte, GrilleTuiles, Lignes, Tableau, Tuile } from "@/components/stats/blocs";
import { aujourdhuiNY } from "@/lib/planning";
import { maintenantMs } from "@/lib/plan30";
import { chargerSecret } from "@/lib/secret";
import { chargerPicksNotes, chargerSuiviFormules, chargerX2, resoudreMode } from "@/lib/stats-donnees";
import { bilanX2, detailFormules, nomFormule } from "@/lib/stats-strategie";
import { dateCourte, fmt, fmtEntier, fmtSigne } from "@/lib/stats-outils";
import { LIBELLES_STATUT, libelleMois, type StatutX2 } from "@/lib/x2";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stratégie — Stats TTFL" };

export default async function StatsStrategiePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode: explicite } = await searchParams;
  const supabase = await createClient();
  const mode = await resoudreMode(supabase, explicite);
  const aujourdhui = aujourdhuiNY();
  const etat = await chargerSecret(supabase, aujourdhui);
  const ctx = { etat, aujourdhui, maintenantMs: maintenantMs() };
  const [lignesSuivi, lignesX2, picks] = await Promise.all([chargerSuiviFormules(supabase, ctx), chargerX2(supabase, ctx), chargerPicksNotes(supabase, mode, ctx)]);

  const f = detailFormules(lignesSuivi);
  const x2 = bilanX2(lignesX2, picks);

  return (
    <div className="space-y-5">
      <ModeTabs base="/stats/strategie" current={mode} />

      <Carte titre="Les formules du Plan 30" aide="Chaque formule joue son n°1 chaque soir sur un compte virtuel (rien n'est envoyé sur TTFL). On ne compare que les soirées notées pour toutes.">
        {f.soirees.length === 0 ? (
          <p className="text-sm text-fg-muted">Pas encore assez de soirées notées pour comparer les formules.</p>
        ) : (
          <div className="space-y-4">
            <GrilleTuiles>
              <Tuile label="Soirées comparées" valeur={String(f.soirees.length)} detail={`${f.egalites} égalités`} />
              <Tuile
                label="Meilleure formule"
                valeur={nomFormule([...f.profils].sort((a, b) => (f.cumuls[b]?.at(-1) ?? 0) - (f.cumuls[a]?.at(-1) ?? 0))[0])}
                detail="au total de points"
                ton="bon"
              />
            </GrilleTuiles>
            <BarresH
              items={f.profils.map((p) => ({
                label: nomFormule(p),
                valeur: f.cumuls[p]?.at(-1) ?? 0,
                detail: `${f.victoires[p] ?? 0} soirées gagnées`,
              }))}
            />
            <Lignes
              titre="Cumul de points par formule"
              labels={f.soirees.map((s) => dateCourte(s.date))}
              series={f.profils.map((p) => ({ nom: nomFormule(p), valeurs: f.cumuls[p] ?? [] }))}
            />
            <Tableau
              colonnes={["Formule", "Projeté", "Réel", "Écart"]}
              lignes={f.profils.map((p) => [nomFormule(p), fmt(f.projection[p]?.projection), fmt(f.projection[p]?.reel), fmtSigne(f.projection[p]?.ecart)])}
            />
          </div>
        )}
      </Carte>

      <Carte titre="Les bonus ×2" aide="Le ×2 double le score d'un pick : le gain est donc le score lui-même. Le ×2 est posé à la main ou par l'automate selon le compte.">
        {x2.total === 0 ? (
          <p className="text-sm text-fg-muted">Aucun ×2 enregistré pour l&apos;instant.</p>
        ) : (
          <div className="space-y-4">
            <GrilleTuiles>
              <Tuile label="×2 posés" valeur={String(x2.poses)} detail={`${x2.comptesServis} comptes · ${x2.joues} joués`} />
              <Tuile label="Points gagnés" valeur={fmtEntier(x2.pointsGagnes)} detail={`moy. ${fmt(x2.moyenneGain)} par ×2`} ton="bon" />
            </GrilleTuiles>
            {x2.moyenneGain !== null && x2.moyennePicks !== null && (
              <p className="text-[13px] text-fg-muted">
                Un ×2 rapporte en moyenne {fmt(x2.moyenneGain)} points contre {fmt(x2.moyennePicks)} pour un pick ordinaire des mêmes comptes.
              </p>
            )}
            <Tableau
              colonnes={["Statut", "Nombre"]}
              lignes={Object.entries(x2.parStatut).map(([s, n]) => [LIBELLES_STATUT[s as StatutX2] ?? s, n])}
            />
            {x2.parMois.length > 0 && (
              <Tableau colonnes={["Mois", "Posés", "Gain"]} lignes={x2.parMois.map((m) => [libelleMois(m.mois), m.poses, fmtEntier(m.gain)])} />
            )}
          </div>
        )}
      </Carte>

    </div>
  );
}
