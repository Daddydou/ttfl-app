import { createClient } from "@/lib/supabase/server";
import { MoteurCloud } from "@/components/admin/MoteurCloud";
import { PageHeader } from "@/components/ui/PageHeader";
import { lireModeCloud } from "@/lib/cloud";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moteur dans le cloud — Admin — TTFL" };

export default async function AdminCloudPage() {
  const supabase = await createClient();
  const [cloudRes, lancementRes] = await Promise.all([
    supabase.from("ttfl_cloud_reglage").select("mode").eq("id", 1).maybeSingle<{ mode: string }>(),
    supabase
      .from("ttfl_robot_etat")
      .select("valeur,maj_le")
      .eq("cle", "reveil_moteur_envoi")
      .maybeSingle<{ valeur: { inputs?: { tache?: string } } | null; maj_le: string }>(),
  ]);
  const lancement = lancementRes.data;
  const tache = lancement?.valeur?.inputs?.tache;
  const dernier = lancement
    ? `${new Date(lancement.maj_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${tache ? ` (${tache})` : ""}`
    : null;

  return (
    <div className="space-y-5">
      <PageHeader titre="Moteur dans le cloud" retour={{ href: "/admin", libelle: "Admin" }} />
      <MoteurCloud mode={lireModeCloud(cloudRes.data?.mode)} dernier={dernier} />
    </div>
  );
}
