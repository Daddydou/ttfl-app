import { HistoriqueJoueur as FormeJoueur } from "@/components/HistoriqueJoueur";
import { Icon } from "@/components/ui/Icon";
import { planEquipeParJour, planPerime, type TtflPlan30 } from "@/lib/plan30";
import { normaliserNom } from "@/lib/planning";
import type { HistoriqueJoueur } from "@/lib/types";

// Plan 30 jours des comptes 03 à 12 : calculé par le moteur (un plan par compte), présenté soirée par soirée avec le ou
// les joueurs pris par l'équipe. Lecture seule : les picks eux-mêmes se changent comme d'habitude.
export function PlanEquipe({
  plans,
  aujourdhui,
  maintenantMs,
  historiques,
}: {
  plans: TtflPlan30[];
  aujourdhui: string;
  maintenantMs: number;
  historiques?: Record<string, HistoriqueJoueur>; // forme du moment par joueur (nom normalisé), fournie par la page
}) {
  const jours = planEquipeParJour(plans, aujourdhui);

  if (jours.length === 0) {
    return (
      <section className="card space-y-1 px-4 py-4" aria-label="Plan 30 jours de l'équipe">
        <p className="section-label">Plan 30 jours · Équipe</p>
        <p className="text-[13px] text-fg-muted">
          Pas encore de plan pour l&apos;équipe : il apparaît après le prochain calcul du moteur.
        </p>
      </section>
    );
  }

  const perime = plans.some((p) => planPerime(p, maintenantMs));

  return (
    <details className="group" aria-label="Plan 30 jours de l'équipe">
      <summary className="card flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-[17px] font-semibold text-fg">Plan 30 jours de l&apos;équipe</span>
        <Icon name="chevron" size={16} className="shrink-0 text-fg-faint transition-transform group-open:rotate-90" />
      </summary>
      <div className="card mt-3 space-y-3 px-4 py-4">
        <p className="text-[13px] text-fg-muted">
          Les meilleurs joueurs d&apos;abord, sur 30 jours, en tenant compte du blocage de 30 jours de chaque compte. Un
          plafond limite le nombre de comptes sur le même joueur le même soir.
        </p>
        {perime && (
          <p className="rounded-[14px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
            Ce plan n&apos;a pas été recalculé depuis plus d&apos;un jour : le moteur est peut-être arrêté.
          </p>
        )}
        <ul className="space-y-3">
          {jours.map((j) => (
            <li key={j.date}>
              <p className="text-[13px] font-semibold text-fg">{j.libelle}</p>
              <ul className="mt-1 space-y-0.5">
                {j.groupes.map((g) => {
                  const forme = historiques?.[normaliserNom(g.joueur)] ?? null;
                  const ligne = (
                    <>
                      <span className="min-w-0">
                        <span className="text-fg">{g.joueur}</span>
                        <span className="text-fg-muted"> · {g.comptes.join(", ")}</span>
                      </span>
                      {g.projection !== null && (
                        <span className="shrink-0 tabular-nums text-fg-faint">{g.projection.toFixed(1)}</span>
                      )}
                    </>
                  );
                  // Forme du moment (5 derniers matchs, moyennes) : dépliable, absente si le moteur ne l'a pas fournie.
                  return forme ? (
                    <li key={g.joueur} className="text-[13px]">
                      <details>
                        <summary className="flex cursor-pointer items-baseline justify-between gap-3">{ligne}</summary>
                        <div className="mt-2 rounded-[14px] bg-surface-2 px-3 py-3">
                          <FormeJoueur h={forme} />
                        </div>
                      </details>
                    </li>
                  ) : (
                    <li key={g.joueur} className="flex items-baseline justify-between gap-3 text-[13px]">
                      {ligne}
                    </li>
                  );
                })}
                {j.sansJoueur.length > 0 && (
                  <li className="text-[13px] text-fg-muted">Aucun joueur possible : {j.sansJoueur.join(", ")}</li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
