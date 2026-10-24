import { createClient } from "@/lib/supabase/server";
import { Cookies } from "@/components/admin/Cookies";
import { PageHeader } from "@/components/ui/PageHeader";
import { secretsConfigures } from "@/lib/github-secrets";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import type { LigneCookie } from "@/lib/cookies";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cookies TTFL — Admin — TTFL" };

export default async function AdminCookiesPage() {
  const supabase = await createClient();
  // Table absente = liste vide : la carte s'affiche quand même, avec « date inconnue ».
  const { data } = await supabase
    .from("ttfl_cookie_renouvellements")
    .select("compte,renouvele_le,estime")
    .returns<LigneCookie[]>();

  return (
    <div className="space-y-5">
      <PageHeader titre="Cookies TTFL" retour={{ href: "/admin", libelle: "Admin" }} />
      <Cookies lignes={data ?? []} secretsPrets={secretsConfigures()} maintenantMs={heureServeur()} />
    </div>
  );
}
