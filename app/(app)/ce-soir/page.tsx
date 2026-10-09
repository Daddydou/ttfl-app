import { createClient } from "@/lib/supabase/server";
import { COMPTE_REF } from "@/lib/compte";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { PickCard } from "@/components/PickCard";
import { ProjectionRow } from "@/components/ProjectionRow";
import { ageMs, frDate } from "@/lib/format";
import type { TtflProjection, TtflRun } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ce soir — TTFL" };

// Un run est "de ce soir" si le PC l'a poussé récemment. On se cale sur l'âge
// du calcul plutôt que sur une comparaison de dates : ça épouse le rituel
// (push le soir) sans se battre avec les fuseaux horaires NBA.
const CURRENT_MAX_AGE_MS = 18 * 3600 * 1000;

export default async function CeSoirPage() {
  const supabase = await createClient();

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
      .eq("compte", COMPTE_REF)
      .maybeSingle<{ player: string }>(),
  ]);

  const rows = projections ?? [];
  const recommended = rows.find((r) => r.is_pick) ?? rows[0];
  const pickedPlayer = pick?.player ?? null;
  const isCurrent = ageMs(run.computed_at) < CURRENT_MAX_AGE_MS;

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
