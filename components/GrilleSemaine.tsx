import Link from "next/link";
import type { Semaine } from "@/lib/semaine";
import { frDate } from "@/lib/format";

// « Jayson Tatum » → « J. Tatum » ; les suffixes (Jr., III…) restent avec le nom.
export function nomCourt(nom: string): string {
  const mots = nom.trim().split(/\s+/);
  if (mots.length < 2) return nom;
  return `${mots[0][0]}. ${mots.slice(1).join(" ")}`;
}

const COULEUR_STATUT: Record<string, string> = {
  confirme: "bg-avail",
  propose: "bg-quest",
  conflit: "bg-out",
  echec: "bg-out",
  refuse: "bg-out",
};

// Grille 10 comptes × 7 soirées. Défilement horizontal sur mobile ; la colonne des comptes reste visible.
export function GrilleSemaine({ semaine }: { semaine: Semaine }) {
  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto" role="region" aria-label="Grille des picks de l'équipe" tabIndex={0}>
        <table className="w-full min-w-[640px] border-collapse text-[12px]">
          <thead>
            <tr className="text-fg-muted">
              <th className="sticky left-0 bg-surface px-2 py-2 text-left font-semibold">Compte</th>
              {semaine.dates.map((d) => (
                <th key={d} className="px-1.5 py-2 text-left font-semibold">
                  {frDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semaine.lignes.map((l) => (
              <tr key={l.compte} className="border-t border-line">
                <th scope="row" className="sticky left-0 bg-surface px-2 py-1.5 text-left font-semibold num text-fg">
                  {l.compte}
                </th>
                {l.cellules.map((c) => (
                  <td key={c.date} className="px-1.5 py-1.5 align-top">
                    {c.joueur ? (
                      <div
                        className={`rounded-[8px] px-1.5 py-1 ${c.cycle ? "bg-out/10 text-out" : "bg-surface-2 text-fg"}`}
                        title={c.libreLe ? `Redevient pickable le ${frDate(c.libreLe)}` : undefined}
                      >
                        <span className="flex items-center gap-1 font-medium">
                          {c.statut && (
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${COULEUR_STATUT[c.statut] ?? "bg-fg-faint"}`}
                              aria-label={c.statut}
                            />
                          )}
                          {nomCourt(c.joueur)}
                        </span>
                        {c.auto && (
                          <span
                            className="mt-0.5 inline-block rounded-full bg-quest/15 px-1.5 text-[10px] font-semibold text-quest"
                            title="Auto-remplissage : posé par le robot, pas validé par toi"
                          >
                            auto
                          </span>
                        )}
                        {c.cycle && <span className="block text-[10px]">cycle ≤ 30 j</span>}
                      </div>
                    ) : (
                      <span className="text-fg-faint">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-[12px] text-fg-muted">
        <span className="rounded-full bg-quest/15 px-1.5 text-[10px] font-semibold text-quest">auto</span> = posé par le
        robot (case vide remplie à 23 h 30, joueur indisponible remplacé, ou pick automatique) : pas validé par toi.
        Tu peux le changer jusqu&apos;à minuit.
      </p>

      <section className="space-y-2">
        <h2 className="section-label">Soir par soir</h2>
        {semaine.syntheses.map((s) => (
          <div key={s.date} className="card px-4 py-3 text-[13px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-fg">{frDate(s.date)}</span>
              {s.surconcentration && <span className="font-semibold text-quest">trop concentré</span>}
            </div>
            <p className="mt-0.5 text-fg-muted">
              {s.groupes.length === 0
                ? "Aucun pick posé"
                : s.groupes.map((g) => `${nomCourt(g.player)} ×${g.comptes.length}`).join(" · ")}
            </p>
            {s.sansPick.length > 0 && s.groupes.length > 0 && (
              <p className="mt-0.5 font-medium text-out">Sans pick : {s.sansPick.join(", ")}</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

export function NavSemaine({ precedent, suivant }: { precedent: string; suivant: string }) {
  return (
    <div className="flex items-center justify-between text-[13px] font-semibold text-court-400">
      <Link href={`/equipe?debut=${precedent}`}>← Semaine précédente</Link>
      <Link href={`/equipe?debut=${suivant}`}>Semaine suivante →</Link>
    </div>
  );
}
