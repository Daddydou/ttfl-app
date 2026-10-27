import { dateCourte, lectureForme, reperes, SEUIL_BON_SOIR } from "@/lib/forme-joueur";
import type { HistoriqueJoueur as Historique } from "@/lib/types";

// « Forme du moment » : ce que le joueur a réellement fait ces derniers matchs. C'est ce qui explique le chiffre
// « forme » de la carte. Affichage seul : rien ici n'entre dans la projection.
export function HistoriqueJoueur({ h }: { h: Historique }) {
  const liste = reperes(h);
  return (
    <div className="space-y-3">
      <p className="text-[14px] leading-snug text-fg-muted">{lectureForme(h)}</p>

      {h.recents.length > 0 && (
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-fg-muted">
            {h.recents.length > 1 ? `${h.recents.length} derniers matchs` : "Dernier match"} · score TTFL
          </p>
          <ul className="mt-1 divide-y divide-line">
            {h.recents.map((m) => (
              <li key={`${m.date}-${m.adv ?? ""}`} className="flex items-baseline gap-3 py-1.5 text-[14px]">
                <span className="w-[5.5rem] shrink-0 capitalize text-fg-muted">{dateCourte(m.date)}</span>
                <span className="min-w-0 flex-1 truncate text-fg">{m.adv ?? ""}</span>
                <span className="num shrink-0 text-fg-muted">{m.min} min</span>
                <span
                  className={`num w-9 shrink-0 text-right text-[16px] font-bold ${m.ttfl >= SEUIL_BON_SOIR ? "text-avail" : "text-fg"}`}
                  title={`${m.pts} pts · ${m.reb} reb · ${m.pds} pds`}
                >
                  {m.ttfl}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {liste.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
          {liste.map((r) => (
            <div key={r.libelle} className="flex items-baseline justify-between gap-2">
              <dt className="text-fg-muted">{r.libelle}</dt>
              <dd className="num font-semibold text-fg">{r.valeur}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
