import { createClient } from "@/lib/supabase/server";
import { ModeTabs } from "@/components/ModeTabs";
import { CumulativeChart } from "@/components/CumulativeChart";
import { distribution, cumulative, roundClusters } from "@/lib/stats";
import { frDate } from "@/lib/format";
import type { Mode, TtflPick } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats — TTFL" };

async function resolveMode(explicit?: string): Promise<Mode> {
  if (explicit === "regular" || explicit === "playoffs") return explicit;
  const supabase = createClient();
  const { data } = await supabase
    .from("ttfl_runs")
    .select("mode")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.mode as Mode) ?? "regular";
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const mode = await resolveMode(searchParams.mode);
  const supabase = createClient();

  const { data: picks } = await supabase
    .from("ttfl_picks")
    .select("*")
    .eq("mode", mode)
    .order("pick_date", { ascending: true })
    .returns<TtflPick[]>();

  const all = picks ?? [];
  const scored = all.filter((p) => p.score !== null);
  const scores = scored.map((p) => p.score as number);
  const total = scores.reduce((s, v) => s + v, 0);
  const avg = scores.length ? total / scores.length : null;
  const best = scored.reduce<TtflPick | null>(
    (b, p) => (!b || (p.score ?? 0) > (b.score ?? 0) ? p : b),
    null,
  );
  const worst = scored.reduce<TtflPick | null>(
    (b, p) => (!b || (p.score ?? 0) < (b.score ?? 0) ? p : b),
    null,
  );

  const buckets = distribution(scores);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));
  const curve = cumulative(scored);
  const rounds = mode === "playoffs" ? roundClusters(scored) : [];
  const maxRound = Math.max(1, ...rounds.map((r) => r.avg));

  if (scored.length === 0) {
    return (
      <div className="space-y-4">
        <ModeTabs base="/stats" current={mode} />
        <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-10 text-center">
          <p className="text-sm text-ink-600">
            Pas encore de score saisi en{" "}
            {mode === "playoffs" ? "playoffs" : "saison régulière"}. Saisis tes
            scores dans « Mes picks » pour voir tes stats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ModeTabs base="/stats" current={mode} />

      {/* Tuiles résumé */}
      <div className="grid grid-cols-2 gap-2">
        <BigStat label="Total" value={total.toString()} accent />
        <BigStat
          label="Moyenne / pick"
          value={avg !== null ? avg.toFixed(1) : "—"}
          accent
        />
        <SmallStat
          label="Meilleur"
          player={best?.player ?? "—"}
          value={best?.score ?? null}
          date={best?.pick_date}
          tone="good"
        />
        <SmallStat
          label="Pire"
          player={worst?.player ?? "—"}
          value={worst?.score ?? null}
          date={worst?.pick_date}
          tone="bad"
        />
      </div>

      {/* Courbe du cumul / épuisement */}
      <section className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
        <h2 className="mb-1 text-sm font-semibold text-white">
          {mode === "playoffs" ? "Courbe d'épuisement" : "Progression"}
        </h2>
        <p className="mb-3 text-xs text-ink-600">
          Barres : score de chaque pick. Ligne : moyenne cumulée.
        </p>
        <CumulativeChart points={curve} />
      </section>

      {/* Distribution */}
      <section className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">
          Distribution ({scored.length} picks)
        </h2>
        <div className="space-y-2">
          {buckets.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-right text-xs font-medium text-ink-600">
                {b.label}
              </span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-ink-850">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${(b.count / maxBucket) * 100}%`,
                    backgroundColor: b.color,
                    minWidth: b.count > 0 ? "6px" : "0",
                  }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-white">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Playoffs : moyenne par tour */}
      {mode === "playoffs" && rounds.length > 0 && (
        <section className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
          <h2 className="mb-1 text-sm font-semibold text-white">
            Moyenne par tour
          </h2>
          <p className="mb-3 text-xs text-ink-600">
            Tours estimés d&apos;après les trous du calendrier.
          </p>
          <div className="space-y-2.5">
            {rounds.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-medium text-ink-600">
                  {r.label}
                  <span className="text-ink-700"> ·{r.n}</span>
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-ink-850">
                  <div
                    className="flex h-full items-center justify-end rounded-md bg-court-500 px-2"
                    style={{ width: `${(r.avg / maxRound) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white">
                      {r.avg.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {curve.length > 0 && (
        <p className="px-1 text-xs text-ink-600">
          Dernier pick : {curve[curve.length - 1].player} (
          {frDate(curve[curve.length - 1].date)}).
        </p>
      )}
    </div>
  );
}

function BigStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3">
      <div
        className={`text-3xl font-black tabular-nums ${
          accent ? "text-court-400" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-ink-600">{label}</div>
    </div>
  );
}

function SmallStat({
  label,
  player,
  value,
  date,
  tone,
}: {
  label: string;
  player: string;
  value: number | null;
  date?: string;
  tone: "good" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-600">
          {label}
        </span>
        <span
          className={`text-xl font-black tabular-nums ${
            tone === "good" ? "text-avail" : "text-out"
          }`}
        >
          {value ?? "—"}
        </span>
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold text-white">
        {player}
      </div>
      {date && <div className="text-[11px] text-ink-600">{frDate(date)}</div>}
    </div>
  );
}
