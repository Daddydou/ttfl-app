import { frDate } from "@/lib/format";
import type { VersusRow } from "@/lib/stats";

// Comparatif rétroactif "mon pick vs pick du moteur" sur les derniers soirs.
// Lit les lignes déjà alignées par versusLastNights (lib/stats.ts).
export function VersusEngineCard({
  rows,
  engineLabel,
}: {
  rows: VersusRow[];
  engineLabel: string;
}) {
  if (rows.length === 0) return null;

  // Écart cumulé uniquement sur les soirs où les deux scores sont connus.
  const comparable = rows.filter(
    (r) => r.mine.score !== null && r.engine !== null,
  );
  const diff = comparable.reduce(
    (s, r) => s + (r.mine.score ?? 0) - (r.engine?.score ?? 0),
    0,
  );

  return (
    <section className="card p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="headline">
          Mon pick vs le moteur
        </h2>
        {comparable.length > 0 && (
          <span
            className={`text-lg font-bold tabular-nums ${
              diff >= 0 ? "text-avail" : "text-out"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diff}
          </span>
        )}
      </div>
      <p className="mb-3 text-[13px] text-fg-muted">
        {rows.length} dernier(s) soir(s) · repère « {engineLabel} ».
      </p>

      <div className="overflow-hidden rounded-[16px] bg-surface-2">
        {rows.map((r) => {
          const same = r.engine?.player === r.mine.player;
          const delta =
            r.mine.score !== null && r.engine
              ? r.mine.score - r.engine.score
              : null;
          return (
            <div
              key={r.date}
              className="grid grid-cols-[3.5rem_1fr_1fr_2.5rem] items-center gap-2 border-b border-line px-3 py-2 text-sm last:border-0"
            >
              <span className="text-[13px] text-fg-muted">{frDate(r.date)}</span>
              <Cell player={r.mine.player} score={r.mine.score} />
              {r.engine ? (
                same ? (
                  <span className="text-[13px] text-fg-muted">même choix</span>
                ) : (
                  <Cell player={r.engine.player} score={r.engine.score} />
                )
              ) : (
                <span className="text-[13px] text-fg-muted">—</span>
              )}
              <span
                className={`text-right text-[13px] font-bold tabular-nums ${
                  delta === null || delta === 0
                    ? "text-fg-muted"
                    : delta > 0
                      ? "text-avail"
                      : "text-out"
                }`}
              >
                {delta === null ? "" : `${delta > 0 ? "+" : ""}${delta}`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-fg-muted">
        Colonne 1 : ton pick · colonne 2 : celui du moteur ce soir-là.
      </p>
    </section>
  );
}

function Cell({ player, score }: { player: string; score: number | null }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-fg">{player}</div>
      <div className="text-[13px] tabular-nums text-fg-muted">
        {score ?? "—"} pts
      </div>
    </div>
  );
}
