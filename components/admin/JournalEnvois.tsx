import { libelleStatutEnvoi } from "@/lib/planning";

export interface EntreeJournal {
  id: number;
  le: string;
  pick_date: string;
  compte: string;
  joueur: string | null;
  statut: string | null;
  message: string | null;
}

const TON: Record<string, string> = {
  confirme: "text-avail",
  echec: "text-out",
  refuse: "text-out",
  conflit: "text-quest",
};

// Soirée « 2026-10-25 » → « dim. 25/10 » (même format de date que le reste de l'app).
const jourCourt = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC",
  });

const quand = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

// Journal d'envoi : ce que le robot a proposé / posé / refusé, du plus récent au plus ancien.
// `disponible=false` = la table n'existe pas encore (migration pas appliquée) : on le dit au lieu d'afficher un vide trompeur.
export function JournalEnvois({ entrees, disponible }: { entrees: EntreeJournal[]; disponible: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className="sr-only">Journal d&apos;envoi</h2>
      {!disponible ? (
        <p className="card px-4 py-6 text-center text-sm text-fg-muted">
          Journal pas encore activé (migration « journal_envois » à appliquer sur Supabase).
        </p>
      ) : entrees.length === 0 ? (
        <p className="card px-4 py-6 text-center text-sm text-fg-muted">Aucun envoi enregistré pour l&apos;instant.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {entrees.map((e) => (
            <li key={e.id} className="px-4 py-2.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-fg">
                  {e.joueur ?? "—"}{" "}
                  <span className="font-normal text-fg-muted">
                    · compte {e.compte} · <span className="num">{jourCourt(e.pick_date)}</span>
                  </span>
                </span>
                <span className={`shrink-0 font-semibold ${TON[e.statut ?? ""] ?? "text-fg-muted"}`}>
                  {libelleStatutEnvoi(e.statut)}
                </span>
              </div>
              <div className="mt-0.5 text-fg-muted">
                {quand(e.le)}
                {e.message ? ` · ${e.message}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
