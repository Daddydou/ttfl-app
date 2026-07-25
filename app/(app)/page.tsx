import { createClient } from "@/lib/supabase/server";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { StatusBadge } from "@/components/StatusBadge";
import { PickButton } from "@/components/PickButton";
import { fmtNum, frDate } from "@/lib/format";
import type { Mode, TtflProjection, TtflRun } from "@/lib/types";

export const dynamic = "force-dynamic";

// Un run est "de ce soir" si le PC l'a poussé récemment. On se cale sur l'âge
// du calcul plutôt que sur une comparaison de dates : ça épouse le rituel
// (push le soir) sans se battre avec les fuseaux horaires NBA.
const CURRENT_MAX_AGE_MS = 18 * 3600 * 1000;

export default async function HomePage() {
  const supabase = createClient();

  const { data: run } = await supabase
    .from("ttfl_runs")
    .select("*")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle<TtflRun>();

  if (!run) {
    return <NoRunAtAll />;
  }

  const [{ data: projections }, { data: pick }] = await Promise.all([
    supabase
      .from("ttfl_projections")
      .select("*")
      .eq("run_id", run.id)
      .order("rank", { ascending: true })
      .returns<TtflProjection[]>(),
    supabase
      .from("ttfl_picks")
      .select("player")
      .eq("mode", run.mode)
      .eq("pick_date", run.game_date)
      .maybeSingle<{ player: string }>(),
  ]);

  const rows = projections ?? [];
  const recommended = rows.find((r) => r.is_pick) ?? rows[0];
  const pickedPlayer = pick?.player ?? null;
  const isCurrent =
    Date.now() - new Date(run.computed_at).getTime() < CURRENT_MAX_AGE_MS;

  return (
    <div className="space-y-4">
      <RealtimeRuns />

      {!isCurrent && <StaleRunNotice date={run.game_date} />}

      <FreshnessBanner
        computedAt={run.computed_at}
        injuryFresh={run.injury_report_fresh}
      />

      {recommended && (
        <PickCard
          run={run}
          pick={recommended}
          alreadyPicked={pickedPlayer === recommended.player}
        />
      )}

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-600">
          Top {rows.length} · {frDate(run.game_date)}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
          {rows.map((r) => (
            <ProjectionRow
              key={r.id}
              row={r}
              mode={run.mode}
              pickDate={run.game_date}
              picked={pickedPlayer === r.player}
              isRecommended={recommended?.id === r.id}
            />
          ))}
        </div>
        <p className="mt-2 px-1 text-xs text-ink-600">
          {run.n_candidates} candidats analysés.{" "}
          {pickedPlayer
            ? `Pick du soir enregistré : ${pickedPlayer}.`
            : "Aucun pick enregistré pour ce soir."}
        </p>
      </section>
    </div>
  );
}

// --- Carte du pick conseillé -------------------------------------------------

function PickCard({
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

// --- Ligne du Top N ----------------------------------------------------------

function ProjectionRow({
  row,
  mode,
  pickDate,
  picked,
  isRecommended,
}: {
  row: TtflProjection;
  mode: Mode;
  pickDate: string;
  picked: boolean;
  isRecommended: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-ink-800 px-3 py-2.5 last:border-0 ${
        isRecommended ? "bg-court-500/[0.06]" : ""
      }`}
    >
      <span
        className={`w-5 shrink-0 text-center text-sm font-bold tabular-nums ${
          isRecommended ? "text-court-400" : "text-ink-600"
        }`}
      >
        {row.rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-white">
            {row.player}
          </span>
          {row.is_urgent && isRecommended && (
            <span className="shrink-0 text-court-400">⚡</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-600">
          <span className="truncate">
            {row.team} vs {row.opponent}
          </span>
          <StatusBadge status={row.status} />
        </div>
      </div>
      <span className="shrink-0 text-right text-lg font-bold tabular-nums text-white">
        {fmtNum(row.projection)}
      </span>
      <div className="w-16 shrink-0 text-right">
        {picked ? (
          <span className="text-xs font-semibold text-avail">✓ Pické</span>
        ) : (
          <PickButton
            mode={mode}
            pickDate={pickDate}
            player={row.player}
            alreadyPicked={false}
            variant="row"
          />
        )}
      </div>
    </div>
  );
}

// --- États vides -------------------------------------------------------------

function StaleRunNotice({ date }: { date: string }) {
  return (
    <div className="rounded-xl border border-quest/40 bg-quest/10 px-4 py-3">
      <p className="text-sm font-semibold text-quest">
        Aucun calcul pour ce soir
      </p>
      <p className="mt-0.5 text-xs text-quest/80">
        Lance le push sur ton PC. Ci-dessous, le dernier classement connu (
        {frDate(date)}).
      </p>
    </div>
  );
}

function NoRunAtAll() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 text-5xl">🏀</div>
      <h1 className="text-xl font-bold text-white">Aucun calcul pour ce soir</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-600">
        Lance le push sur ton PC pour voir apparaître le pick du soir ici :
      </p>
      <code className="mt-3 rounded-lg bg-ink-850 px-3 py-2 text-xs text-court-400">
        python push_to_supabase.py
      </code>
    </div>
  );
}
