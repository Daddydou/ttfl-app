import { StatusBadge } from "@/components/StatusBadge";
import { PickButton } from "@/components/PickButton";
import { fmtNum } from "@/lib/format";
import type { TtflProjection, TtflRun } from "@/lib/types";

// Carte du pick conseillé — lit `is_pick`/`is_urgent` tels que poussés par le
// moteur, ne suppose JAMAIS que le pick est rank=1 (le plancher de qualité
// playoffs retient parfois un rang moins bien projeté). Partagée entre "Ce
// soir" (détail) et le Tableau de bord (aperçu) : une seule source de vérité
// pour ce que "le pick du soir" affiche.
export function PickCard({
  run,
  pick,
  alreadyPicked,
}: {
  run: TtflRun;
  pick: TtflProjection;
  alreadyPicked: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-court-600/30 bg-gradient-to-br from-ink-850 to-ink-900 p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-court-400">
          {pick.is_urgent ? "⚡ Pick urgent" : "Pick conseillé"}
        </span>
        <StatusBadge status={pick.status} />
      </div>

      <div className="mt-2">
        <h1 className="text-3xl font-extrabold leading-tight text-white">
          {pick.player}
        </h1>
        <p className="mt-0.5 text-sm text-ink-600">
          {pick.team} <span className="text-court-400">vs</span> {pick.opponent}
          {pick.position ? ` · ${pick.position}` : ""}
        </p>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div>
          <div className="text-4xl font-black tabular-nums text-court-400">
            {fmtNum(pick.projection)}
          </div>
          <div className="text-xs text-ink-600">projection TTFL</div>
        </div>
        <div className="mb-1 flex gap-4 text-xs text-ink-600">
          <span>
            forme{" "}
            <span className="font-semibold text-white">
              {fmtNum(pick.forme)}
            </span>
          </span>
          <span>
            matchup{" "}
            <span className="font-semibold text-white">
              ×{fmtNum(pick.matchup_factor, 2)}
            </span>
          </span>
        </div>
      </div>

      {run.mode === "playoffs" && pick.series_state && (
        <div className="mt-4 rounded-xl bg-ink-950/60 p-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-md bg-court-500/15 px-2 py-0.5 font-bold text-court-400">
              Série {pick.series_state}
            </span>
            {pick.expected_nights_left != null && (
              <span className="text-ink-600">
                ~{fmtNum(pick.expected_nights_left)} soir(s) restant(s)
              </span>
            )}
          </div>
          {pick.explanation && (
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              {pick.explanation}
            </p>
          )}
        </div>
      )}

      {run.mode === "regular" && pick.explanation && (
        <p className="mt-3 text-xs leading-relaxed text-ink-600">
          {pick.explanation}
        </p>
      )}

      <div className="mt-5">
        <PickButton
          mode={run.mode}
          pickDate={run.game_date}
          player={pick.player}
          alreadyPicked={alreadyPicked}
          variant="primary"
        />
      </div>
    </section>
  );
}
