import { createClient } from "@/lib/supabase/server";
import { ActionsPC } from "@/components/admin/ActionsPC";
import { HistoriqueCommandes, type Commande } from "@/components/admin/HistoriqueCommandes";
import { PicksEnMasse } from "@/components/admin/PicksEnMasse";
import { etatExecuteur } from "@/lib/admin";
import { ageMs, humanAge } from "@/lib/format";
import { aujourdhuiNY } from "@/lib/planning";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — TTFL" };

const PILULES = {
  en_ligne: { classe: "border-avail/40 bg-avail/10 text-avail", titre: "PC en ligne" },
  lent: { classe: "border-quest/40 bg-quest/10 text-quest", titre: "PC lent à répondre" },
  hors_ligne: { classe: "border-out/40 bg-out/10 text-out", titre: "PC hors ligne" },
  inconnu: { classe: "border-ink-700 bg-ink-900 text-ink-600", titre: "Aucun passage reçu" },
} as const;

export default async function AdminPage() {
  const supabase = await createClient();
  const [commandesRes, poulsRes] = await Promise.all([
    supabase.from("ttfl_commandes").select("*").order("id", { ascending: false }).limit(30).returns<Commande[]>(),
    supabase
      .from("ttfl_robot_etat")
      .select("valeur,maj_le")
      .eq("cle", "commandes")
      .maybeSingle<{ valeur: { dernier_passage?: string } | null; maj_le: string }>(),
  ]);

  const commandes = commandesRes.data ?? [];
  const dernier = poulsRes.data?.valeur?.dernier_passage ?? poulsRes.data?.maj_le ?? null;
  const { etat, minutes } = etatExecuteur(dernier ? Math.round(ageMs(dernier) / 60000) : null);
  const pilule = PILULES[etat];
  const actives = commandes.filter((c) => c.statut === "en_attente" || c.statut === "en_cours").map((c) => c.type);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-white">Admin</h1>
        <p className="mt-0.5 text-sm text-ink-600">Actions à distance sur ton PC et opérations en masse sur les picks.</p>
      </header>

      <section className={`rounded-2xl border px-4 py-3 ${pilule.classe}`}>
        <p className="text-sm font-semibold">{pilule.titre}</p>
        <p className="mt-0.5 text-xs opacity-80">
          {etat === "inconnu"
            ? "L'exécuteur du PC n'a encore jamais répondu."
            : etat === "en_ligne"
              ? `Dernier passage ${humanAge(minutes ?? 0)}. Les actions démarrent dans la minute.`
              : `Dernier passage ${humanAge(minutes ?? 0)}. Les actions attendront que le PC soit allumé et connecté.`}
        </p>
      </section>

      {commandesRes.error && (
        <p className="rounded-xl bg-out/10 px-3 py-2 text-xs text-out">{commandesRes.error.message}</p>
      )}

      <ActionsPC actives={actives} />
      <HistoriqueCommandes commandes={commandes} />
      <PicksEnMasse aujourdhui={aujourdhuiNY()} />
    </div>
  );
}
