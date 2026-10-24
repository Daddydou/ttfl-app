import { createClient } from "@/lib/supabase/server";
import { SecretPick, type SoireeSecreteVue } from "@/components/admin/SecretPick";
import { PageHeader } from "@/components/ui/PageHeader";
import { chargerSecret, heureCloture, soireeSecrete } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { aujourdhuiNY } from "@/lib/planning";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pick secret — Admin — TTFL" };

export default async function AdminSecretPage() {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const secret = await chargerSecret(supabase, aujourdhui);
  const maintenantMs = heureServeur();
  const soirees: SoireeSecreteVue[] = Object.keys(secret.lignes)
    .sort()
    .filter((d) => d >= aujourdhui)
    .map((d) => {
      const l = secret.lignes[d];
      const secrete = soireeSecrete(secret, secret.compte, d, aujourdhui, maintenantMs);
      return {
        soiree: d,
        libelle: new Date(`${d}T00:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }),
        cloture: heureCloture(secret, d),
        etat: secrete ? "secrete" : l.revele_le && l.motif === "force" ? "revelee_force" : "revelee_cloture",
      };
    });

  return (
    <div className="space-y-5">
      <PageHeader titre="Pick secret" retour={{ href: "/admin", libelle: "Admin" }} />
      <SecretPick actif={secret.actif} compte={secret.compte} soirees={soirees} lisible={secret.lisible} />
    </div>
  );
}
