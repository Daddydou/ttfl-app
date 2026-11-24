import { Visage } from "@/components/Visage";
import { etiquetteJour } from "@/lib/conseilles";
import { grouperParDate, type Reprise } from "@/lib/adversaires-reprises";
import { frDate } from "@/lib/format";

// Ce qu'un adversaire peut encore prendre dans les prochains jours : une ligne par JOUR (repliée), qu'on déplie pour
// voir les joueurs du top 30 qu'il peut prendre à partir de cette date. Lecture seule. Le nom peut passer sur plusieurs
// lignes : rien ne doit pousser le nom hors de l'écran.
export function ReprisesAdversaire({ reprises, aujourdhui }: { reprises: Reprise[]; aujourdhui: string }) {
  if (reprises.length === 0) {
    return <p className="mt-2 text-[13px] text-fg-muted">Aucun joueur du top 30 disponible sur ces soirées.</p>;
  }
  return (
    <ul className="mt-2 divide-y divide-line rounded-[12px] border border-line" data-testid="jours-reprises">
      {grouperParDate(reprises).map((g) => {
        const e = etiquetteJour(g.date, aujourdhui);
        return (
          <li key={g.date}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
                <span className="text-[14px] font-semibold text-fg">
                  {e.court}
                  {e.relatif ? <span className="font-normal text-fg-muted"> · {e.relatif}</span> : null}
                </span>
                <span className="shrink-0 text-[13px] text-fg-muted">
                  {g.reprises.length} joueur{g.reprises.length > 1 ? "s" : ""}
                  <span aria-hidden className="ml-1.5 inline-block transition-transform group-open:rotate-90">›</span>
                </span>
              </summary>
              <ul className="divide-y divide-line px-3 pb-1">
                {g.reprises.map((r) => (
                  <li key={r.player} className="flex items-center gap-2 py-1.5">
                    <Visage nom={r.player} taille={20} />
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-[14px] font-semibold leading-tight text-fg">{r.player}</div>
                      <div className="text-[12px] text-fg-muted">
                        {r.team ?? "—"}
                        {r.opponent ? ` vs ${r.opponent}` : ""}
                        {r.dejaPicke ? ` · repris (pické le ${frDate(r.dejaPicke)})` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[13px] num text-fg-muted">
                      <span className="font-semibold text-fg">{r.projection.toFixed(1)}</span>
                      <span> · n°{r.rang}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
