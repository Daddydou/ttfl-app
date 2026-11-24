import { Visage } from "@/components/Visage";
import { etiquetteJour } from "@/lib/conseilles";
import { grouperParDate, type Reprise } from "@/lib/adversaires-reprises";
import { frDate } from "@/lib/format";

// Les joueurs du top 30 qu'un adversaire peut encore prendre dans les prochains jours, rangés par première date
// possible. Lecture seule. Le nom peut passer sur plusieurs lignes : rien ne doit pousser le nom hors de l'écran.
export function ReprisesAdversaire({ reprises, aujourdhui }: { reprises: Reprise[]; aujourdhui: string }) {
  if (reprises.length === 0) {
    return <p className="mt-2 text-[13px] text-fg-muted">Aucun joueur du top 30 disponible sur ces soirées.</p>;
  }
  return (
    <div className="mt-2 space-y-3">
      {grouperParDate(reprises).map((g) => {
        const e = etiquetteJour(g.date, aujourdhui);
        return (
          <div key={g.date}>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-faint">
              {e.court}
              {e.relatif ? ` · ${e.relatif}` : ""} · {g.reprises.length} joueur{g.reprises.length > 1 ? "s" : ""}
            </h3>
            <ul className="mt-1 divide-y divide-line">
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
          </div>
        );
      })}
    </div>
  );
}
