import { createClient } from "@/lib/supabase/server";
import { BarresH, Carte, Colonnes, GrilleTuiles, Tuile, Vide } from "@/components/stats/blocs";
import { chargerVainqueurs } from "@/lib/stats-donnees";
import { bilanVainqueurs, parSoireeProno, parTranche, surMatchsSerres } from "@/lib/stats-vainqueurs";
import { dateCourte, fmtPourcent } from "@/lib/stats-outils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vainqueurs — Stats TTFL" };

// Le jeu « vainqueur de chaque match » : mes pronos face aux résultats, et la fiabilité des favoris des cotes.
export default async function StatsVainqueursPage() {
  const supabase = await createClient();
  const { matchs, choix } = await chargerVainqueurs(supabase);
  const bilan = bilanVainqueurs(matchs, choix);

  if (bilan.favorisJuges === 0 && bilan.juges === 0) {
    return <Vide>Pas encore de match terminé dans le jeu des vainqueurs.</Vide>;
  }

  const soirees = parSoireeProno(matchs, choix).slice(-14);
  const tranches = parTranche(matchs);
  const serres = surMatchsSerres(matchs, choix);

  return (
    <div className="space-y-5">
      <GrilleTuiles>
        <Tuile label="Mes bons pronos" valeur={fmtPourcent(bilan.taux)} detail={`${bilan.bons} sur ${bilan.juges} matchs`} ton="bon" />
        <Tuile label="Le favori gagne" valeur={fmtPourcent(bilan.tauxFavori)} detail={`${bilan.favorisGagnent} sur ${bilan.favorisJuges} matchs`} />
        <Tuile label="Je suis le favori" valeur={fmtPourcent(bilan.partFavoriSuivi)} detail={`${bilan.suivisFavori} choix sur ${bilan.juges}`} />
        <Tuile label="Quand je prends l'outsider" valeur={fmtPourcent(bilan.outsiders.taux)} detail={`${bilan.outsiders.bons} sur ${bilan.outsiders.n}`} />
      </GrilleTuiles>

      {soirees.length > 0 && (
        <Carte titre="Mes pronos soirée par soirée" aide="Part de bons pronos ; vert = 70 % ou plus, rouge = moins de 40 %.">
          <Colonnes
            titre="Taux de bons pronos par soirée"
            reperes={[50]}
            items={soirees.map((s) => ({ label: dateCourte(s.date), valeur: s.taux ?? 0, ton: (s.taux ?? 0) >= 70 ? "bon" : (s.taux ?? 0) < 40 ? "mauvais" : "neutre" }))}
          />
        </Carte>
      )}

      {tranches.some((t) => t.n > 0) && (
        <Carte titre="Les cotes sont-elles fiables ?" aide="Plus le favori est annoncé fort, plus il devrait gagner. Un taux nettement plus bas que la tranche annoncée = favori surcoté.">
          <BarresH items={tranches.map((t) => ({ label: t.label, valeur: t.taux ?? 0, texte: fmtPourcent(t.taux), detail: `${t.gagnent} sur ${t.n}` }))} max={100} />
        </Carte>
      )}

      {serres.n > 0 && (
        <Carte titre="Matchs serrés" aide="Matchs où les cotes sont quasi égales : un vrai pile ou face.">
          <GrilleTuiles>
            <Tuile label="Mes bons pronos" valeur={fmtPourcent(serres.taux)} detail={`${serres.bons} sur ${serres.n}`} />
          </GrilleTuiles>
        </Carte>
      )}
    </div>
  );
}
