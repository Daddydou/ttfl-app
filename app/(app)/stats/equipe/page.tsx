import { createClient } from "@/lib/supabase/server";
import { ModeTabs } from "@/components/ModeTabs";
import { BarresH, Carte, Colonnes, GrilleTuiles, Lignes, Tableau, Tuile, Vide } from "@/components/stats/blocs";
import { aujourdhuiNY } from "@/lib/planning";
import { maintenantMs } from "@/lib/plan30";
import { chargerSecret } from "@/lib/secret";
import { chargerPicksNotes, resoudreMode } from "@/lib/stats-donnees";
import { cumulEquipe, parCompte, parJoueur, parSoiree, plusRentables, plusUtilises, syntheseEquipe, victoiresParCompte } from "@/lib/stats-equipe";
import { dateCourte, fmt, fmtEntier } from "@/lib/stats-outils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Équipe — Stats TTFL" };

export default async function StatsEquipePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode: explicite } = await searchParams;
  const supabase = await createClient();
  const mode = await resoudreMode(supabase, explicite);
  const aujourdhui = aujourdhuiNY();
  const etat = await chargerSecret(supabase, aujourdhui);
  const picks = await chargerPicksNotes(supabase, mode, { etat, aujourdhui, maintenantMs: maintenantMs() });

  if (picks.length === 0) {
    return (
      <div className="space-y-4">
        <ModeTabs base="/stats/equipe" current={mode} />
        <Vide>Pas encore de score noté pour l&apos;équipe dans ce mode.</Vide>
      </div>
    );
  }

  const synth = syntheseEquipe(picks);
  const comptes = parCompte(picks);
  const soirees = parSoiree(picks);
  const cumul = cumulEquipe(soirees);
  const victoires = new Map(victoiresParCompte(picks).map((v) => [v.compte, v.victoires]));
  const joueurs = parJoueur(picks);
  const utilises = plusUtilises(joueurs).slice(0, 8);
  const rentables = plusRentables(joueurs).slice(0, 8);
  const dernieres = soirees.slice(-14);

  return (
    <div className="space-y-5">
      <ModeTabs base="/stats/equipe" current={mode} />

      <GrilleTuiles>
        <Tuile label="Total équipe" valeur={fmtEntier(synth.total)} detail={`${synth.nPicks} picks · ${synth.nComptes} comptes`} />
        <Tuile label="Moyenne / pick" valeur={fmt(synth.moyennePick)} detail={`${synth.nSoirees} soirées`} />
        <Tuile
          label="Meilleure soirée"
          valeur={synth.meilleureSoiree ? fmt(synth.meilleureSoiree.moyenne) : "—"}
          detail={synth.meilleureSoiree ? `${dateCourte(synth.meilleureSoiree.date)} · moy. par pick` : undefined}
          ton="bon"
        />
        <Tuile
          label="Pire soirée"
          valeur={synth.pireSoiree ? fmt(synth.pireSoiree.moyenne) : "—"}
          detail={synth.pireSoiree ? `${dateCourte(synth.pireSoiree.date)} · moy. par pick` : undefined}
          ton="mauvais"
        />
      </GrilleTuiles>

      <Carte titre="Classement des comptes" aide="Moyenne par pick, du meilleur au moins bon. Sous chaque compte : ses points et ses soirées gagnées (meilleur score du soir).">
        <BarresH
          items={[...comptes]
            .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0))
            .map((c) => ({
              label: `Compte ${c.compte}`,
              valeur: c.moyenne ?? 0,
              texte: fmt(c.moyenne),
              detail: `${c.total} pts · ${victoires.get(c.compte) ?? 0} victoires`,
            }))}
        />
      </Carte>

      <Carte titre="Détail par compte" aide="Les extrêmes et la régularité de chaque compte.">
        <Tableau
          colonnes={["Compte", "Picks", "Zéros", "Bons soirs", "Écart"]}
          lignes={comptes.map((c) => [`Compte ${c.compte}`, c.n, c.zeros, c.bonsSoirs, fmt(c.ecartType)])}
        />
      </Carte>

      {cumul.length > 1 && (
        <Carte titre="Points cumulés de l'équipe" aide="Total de points de l'équipe, soirée après soirée.">
          <Lignes titre="Points cumulés" labels={cumul.map((c) => dateCourte(c.date))} series={[{ nom: "Cumul", valeurs: cumul.map((c) => c.cumul) }]} />
        </Carte>
      )}

      <Carte titre="Les dernières soirées" aide="Moyenne par pick de l'équipe ; vert = 40 ou plus, rouge = moins de 20.">
        <Colonnes
          titre="Moyenne par pick, dernières soirées"
          reperes={[20, 40]}
          items={dernieres.map((s) => ({ label: dateCourte(s.date), valeur: s.moyenne, ton: s.moyenne >= 40 ? "bon" : s.moyenne < 20 ? "mauvais" : "neutre" }))}
        />
      </Carte>

      {utilises.length > 0 && (
        <Carte titre="Les joueurs les plus joués" aide="Nombre de picks de l'équipe, et sur combien de comptes différents.">
          <BarresH items={utilises.map((j) => ({ label: j.player, valeur: j.n, detail: `${j.comptes} comptes · moy. ${fmt(j.moyenne)}` }))} />
        </Carte>
      )}

      {rentables.length > 0 && (
        <Carte titre="Les plus rentables" aide="Meilleure moyenne par pick, parmi les joueurs pickés au moins 3 fois.">
          <BarresH items={rentables.map((j) => ({ label: j.player, valeur: j.moyenne, texte: fmt(j.moyenne), detail: `${j.n} picks`, ton: "bon" }))} />
        </Carte>
      )}
    </div>
  );
}
