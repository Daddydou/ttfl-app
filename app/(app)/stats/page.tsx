import { createClient } from "@/lib/supabase/server";
import { ModeTabs } from "@/components/ModeTabs";
import { CarteLien, GrilleTuiles, Tuile } from "@/components/stats/blocs";
import { COMPTE_REF } from "@/lib/compte";
import { aujourdhuiNY } from "@/lib/planning";
import { maintenantMs } from "@/lib/plan30";
import { chargerSecret } from "@/lib/secret";
import { chargerPicksNotes, resoudreMode } from "@/lib/stats-donnees";
import { parCompte, syntheseEquipe } from "@/lib/stats-equipe";
import { fmt, fmtEntier } from "@/lib/stats-outils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats — TTFL" };

// Aperçu : quelques chiffres clés puis le menu des sous-pages (le détail est dans chacune).
export default async function StatsApercuPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode: explicite } = await searchParams;
  const supabase = await createClient();
  const mode = await resoudreMode(supabase, explicite);
  const aujourdhui = aujourdhuiNY();
  const etat = await chargerSecret(supabase, aujourdhui);
  const picks = await chargerPicksNotes(supabase, mode, { etat, aujourdhui, maintenantMs: maintenantMs() });

  const synth = syntheseEquipe(picks);
  const moi = parCompte(picks).find((c) => c.compte === COMPTE_REF);
  const suffixe = `?mode=${mode}`;

  return (
    <div className="space-y-5">
      <ModeTabs base="/stats" current={mode} />

      <GrilleTuiles>
        <Tuile label="Total équipe" valeur={synth.nPicks ? fmtEntier(synth.total) : "—"} detail={`${synth.nSoirees} soirées`} />
        <Tuile label="Moyenne équipe" valeur={fmt(synth.moyennePick)} detail="points par pick" />
        <Tuile label={`Compte ${COMPTE_REF}`} valeur={moi ? fmtEntier(moi.total) : "—"} detail={moi ? `${moi.n} picks` : undefined} />
        <Tuile label={`Moyenne compte ${COMPTE_REF}`} valeur={fmt(moi?.moyenne)} detail="points par pick" />
      </GrilleTuiles>

      <div className="space-y-2">
        <CarteLien href={`/stats/equipe${suffixe}`} titre="Équipe" resume="Classement des comptes, soirées, joueurs les plus rentables." />
        <CarteLien href={`/stats/mes-picks${suffixe}`} titre="Mes picks" resume="Ton compte : scores, forme, séries, repères du moteur." />
        <CarteLien href={`/stats/strategie${suffixe}`} titre="Stratégie" resume="Comparaison des formules du Plan 30 et bilan des bonus ×2." />
        <CarteLien href="/stats/adversaires" titre="Adversaires" resume="Les joueurs suivis : points, progression, picks préférés." />
        <CarteLien href={`/stats/joueurs-nba${suffixe}`} titre="Joueurs NBA" resume="Meilleures projections, forme, régularité, défenses permissives." />
        <CarteLien href="/stats/vainqueurs" titre="Vainqueurs" resume="Tes pronos face aux résultats, fiabilité des favoris." />
        <CarteLien href="/stats/systeme" titre="Système" resume="Santé du moteur dans le cloud : passages, échecs, durées." />
      </div>
    </div>
  );
}
