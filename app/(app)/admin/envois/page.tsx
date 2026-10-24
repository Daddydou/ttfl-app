import { createClient } from "@/lib/supabase/server";
import { JournalEnvois, type EntreeJournal } from "@/components/admin/JournalEnvois";
import { PageHeader } from "@/components/ui/PageHeader";
import { chargerSecret, masquerLignes } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { aujourdhuiNY } from "@/lib/planning";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal d'envoi — Admin — TTFL" };

export default async function AdminEnvoisPage() {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const [journalRes, secret] = await Promise.all([
    supabase
      .from("ttfl_envois_journal")
      .select("id,le,pick_date,compte,joueur,statut,message")
      .order("id", { ascending: false })
      .limit(40)
      .returns<EntreeJournal[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);
  // Pick secret du compte 02 : ses lignes (joueur !) sont retirées tant que la soirée est secrète.
  const journal = masquerLignes(journalRes.data ?? [], secret, aujourdhui, heureServeur());

  return (
    <div className="space-y-5">
      <PageHeader titre="Journal d'envoi" retour={{ href: "/admin", libelle: "Admin" }} />
      <JournalEnvois entrees={journal} disponible={!journalRes.error} />
    </div>
  );
}
