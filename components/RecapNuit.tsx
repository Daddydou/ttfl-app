import { Visage } from "@/components/Visage";
import { nb } from "@/lib/format";
import {
  rangOrdinal,
  scoreAffiche,
  titreSoiree,
  type LigneClassee,
  type ResultatPick,
} from "@/lib/recap-nuit";

const VISIBLES = 10; // les autres sont repliés (native <details>, aucun JS)

function Ligne({ l }: { l: LigneClassee }) {
  return (
    <li
      className={`flex items-center gap-2.5 px-4 py-2 ${l.monPick ? "bg-fill" : ""}`}
      aria-current={l.monPick ? "true" : undefined}
    >
      <span className="w-6 shrink-0 text-right text-[13px] font-bold tabular-nums text-fg-muted">{l.rang}</span>
      <Visage nom={l.player} taille={24} className="self-center" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">
        {l.player}
        {l.team && <span className="ml-1.5 text-[12px] font-medium text-fg-muted">{l.team}</span>}
        {l.monPick && <span className="ml-1.5 text-[11px] font-semibold text-fg-muted">ton pick</span>}
      </span>
      <span className="shrink-0 text-[15px] font-bold tabular-nums text-fg">{scoreAffiche(l.ttfl)}</span>
    </li>
  );
}

export function RecapNuit({
  soiree,
  top,
  total,
  pick,
}: {
  soiree: string;
  top: LigneClassee[];
  total: number;
  pick: ResultatPick | null;
}) {
  if (top.length === 0) return null;
  const debut = top.slice(0, VISIBLES);
  const suite = top.slice(VISIBLES);
  const pickDansTop = top.some((l) => l.monPick);

  return (
    <section className="card overflow-hidden" aria-label="Récap de la nuit">
      <div className="px-4 pb-2 pt-4">
        <p className="section-label">Top {top.length} de la nuit</p>
        <p className="mt-0.5 text-[13px] text-fg-muted">
          Soirée du {titreSoiree(soiree)} · {nb(total, "joueur")} classé{total > 1 ? "s" : ""}.
        </p>
      </div>
      <ol className="divide-y divide-line">
        {debut.map((l) => (
          <Ligne key={`${l.rang}-${l.player}`} l={l} />
        ))}
      </ol>
      {suite.length > 0 && (
        <details className="group border-t border-line">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-[13px] font-semibold text-fg-muted">
            Voir les {suite.length} suivants
          </summary>
          <ol className="divide-y divide-line border-t border-line">
            {suite.map((l) => (
              <Ligne key={`${l.rang}-${l.player}`} l={l} />
            ))}
          </ol>
        </details>
      )}
      {pick && !pickDansTop && (
        <p className="border-t border-line px-4 py-2.5 text-[13px] text-fg-muted">
          Ton pick : <span className="font-semibold text-fg">{pick.nom}</span>
          {pick.rang !== null && pick.ttfl !== null
            ? ` · ${rangOrdinal(pick.rang)} sur ${total} (${scoreAffiche(pick.ttfl)} pts)`
            : " · pas de score cette soirée (0 pt)"}
        </p>
      )}
    </section>
  );
}
