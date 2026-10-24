import { createClient } from "@/lib/supabase/server";
import { GrilleSemaine, NavSemaine } from "@/components/GrilleSemaine";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  COMPTES_EQUIPE,
  JOURS_CYCLE,
  ajouterJours,
  aujourdhuiNY,
  type EnvoiLigne,
  type PickAuto,
  type PickLigne,
} from "@/lib/planning";
import { construireSemaine, datesDeLaSemaine } from "@/lib/semaine";

export const dynamic = "force-dynamic";
export const metadata = { title: "Semaine de l'équipe — TTFL" };

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

// LECTURE SEULE : montre les picks voulus de l'équipe (comptes 03 à 12) sur 7 soirées. Aucune écriture ici.
export default async function EquipePage({ searchParams }: { searchParams: Promise<{ debut?: string }> }) {
  const { debut: debutParam } = await searchParams;
  const debut = debutParam && DATE_ISO.test(debutParam) ? debutParam : aujourdhuiNY();
  const dates = datesDeLaSemaine(debut);
  const fin = dates[dates.length - 1];

  const supabase = await createClient();
  const [picksRes, envoisRes, autosRes] = await Promise.all([
    supabase
      .from("ttfl_picks")
      .select("pick_date,player,compte")
      .eq("mode", "regular")
      .in("compte", COMPTES_EQUIPE)
      .gte("pick_date", ajouterJours(debut, -JOURS_CYCLE))
      .lte("pick_date", ajouterJours(fin, JOURS_CYCLE))
      .returns<PickLigne[]>(),
    supabase
      .from("ttfl_envois")
      .select("pick_date,compte,joueur,statut,message")
      .eq("mode", "regular")
      .in("compte", COMPTES_EQUIPE)
      .gte("pick_date", debut)
      .lte("pick_date", fin)
      .returns<EnvoiLigne[]>(),
    // Marques « auto » (posé par le robot, pas validé par l'utilisateur). Une erreur (table pas encore créée) est ignorée.
    supabase
      .from("ttfl_picks_auto")
      .select("pick_date,compte,player,origine")
      .eq("mode", "regular")
      .in("compte", COMPTES_EQUIPE)
      .gte("pick_date", debut)
      .lte("pick_date", fin)
      .returns<PickAuto[]>(),
  ]);

  const semaine = construireSemaine({
    dates,
    comptes: COMPTES_EQUIPE,
    picks: picksRes.data ?? [],
    envois: envoisRes.data ?? [],
    autos: autosRes.error ? [] : (autosRes.data ?? []),
  });
  const erreur = picksRes.error?.message ?? envoisRes.error?.message ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        titre="Semaine de l'équipe"
        sousTitre="10 comptes × 7 soirées : doublons, cycle de 30 jours, comptes sans pick"
        retour={{ href: "/picks", libelle: "Mes picks" }}
      />
      <NavSemaine precedent={ajouterJours(debut, -7)} suivant={ajouterJours(debut, 7)} />
      {erreur && <p className="rounded-[14px] bg-out/10 px-3 py-2 text-[13px] text-out">{erreur}</p>}
      <GrilleSemaine semaine={semaine} />
    </div>
  );
}
