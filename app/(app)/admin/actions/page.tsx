import { createClient } from "@/lib/supabase/server";
import { ActionsPC } from "@/components/admin/ActionsPC";
import { HistoriqueCommandes, type Commande } from "@/components/admin/HistoriqueCommandes";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Actions — Admin — TTFL" };

export default async function AdminActionsPage() {
  const supabase = await createClient();
  const commandesRes = await supabase
    .from("ttfl_commandes")
    .select("*")
    .order("id", { ascending: false })
    .limit(30)
    .returns<Commande[]>();
  const commandes = commandesRes.data ?? [];
  const actives = commandes.filter((c) => c.statut === "en_attente" || c.statut === "en_cours").map((c) => c.type);

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Actions"
        sousTitre="Chaque action part au moteur (environ 2 à 5 min) ; le résultat arrive dans l'historique."
        retour={{ href: "/admin", libelle: "Admin" }}
      />
      {commandesRes.error && (
        <p className="rounded-[14px] bg-out/10 px-3 py-2 text-[13px] text-out">{commandesRes.error.message}</p>
      )}
      <ActionsPC actives={actives} />
      <HistoriqueCommandes commandes={commandes} />
    </div>
  );
}
