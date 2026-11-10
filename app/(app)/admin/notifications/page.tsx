import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "@/components/admin/PushToggle";
import { PageHeader } from "@/components/ui/PageHeader";
import { libelleSource, heureParisCourte } from "@/lib/notifications-historique";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications — Admin — TTFL" };

type Ligne = { id: number; le: string; source: string; titre: string; corps: string | null; priorite: string | null; envoye: boolean | null };

// LECTURE SEULE. L'historique ne garde que le texte déjà parti sur le téléphone (donc déjà masqué), 45 jours au plus.
export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ttfl_notifications_historique")
    .select("id,le,source,titre,corps,priorite,envoye")
    .order("le", { ascending: false })
    .limit(100);
  const lignes = (data ?? []) as Ligne[];

  return (
    <div className="space-y-5">
      <PageHeader titre="Notifications" retour={{ href: "/admin", libelle: "Admin" }} />
      <PushToggle />

      <section className="space-y-2" aria-labelledby="titre-historique">
        <h2 id="titre-historique" className="section-label">Dernières notifications envoyées</h2>
        <div className="card divide-y divide-line px-4 text-[14px]">
          {error && <p className="py-3 text-fg-muted">Historique indisponible pour l&apos;instant.</p>}
          {!error && lignes.length === 0 && (
            <p className="py-3 text-fg-muted">Rien d&apos;enregistré pour l&apos;instant. Les prochaines notifications apparaîtront ici (45 jours gardés).</p>
          )}
          {lignes.map((l) => (
            <article key={l.id} className="space-y-0.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{l.titre}</p>
                <time dateTime={l.le} className="shrink-0 text-[12px] text-fg-muted">{heureParisCourte(l.le)}</time>
              </div>
              {l.corps && <p className="whitespace-pre-line text-fg-muted">{l.corps}</p>}
              <p className="text-[12px] text-fg-muted">
                {libelleSource(l.source)}
                {l.envoye === false ? " · non envoyée (sujet manquant)" : ""}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
