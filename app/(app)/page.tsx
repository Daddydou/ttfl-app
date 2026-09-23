import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { PickCard } from "@/components/PickCard";
import { AlertsBanner, type Alert } from "@/components/AlertsBanner";
import { BenchmarksCard } from "@/components/BenchmarksCard";
import { frDate, todayISO } from "@/lib/format";
import { cycleBlocked, type CycleBlockedPlayer } from "@/lib/dashboard";
import type {
  Mode,
  TtflBenchmark,
  TtflManualAbsent,
  TtflPick,
  TtflProjection,
  TtflRun,
  TtflSeasonStats,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau de bord — TTFL" };

// LECTURE SEULE : cette page ne calcule ni score ni projection. Le
// cycle-restant et les compteurs ci-dessous sont de la présentation pure
// (soustraction de dates, comptage de lignes) à partir de ce que le moteur a
// déjà écrit dans Supabase — voir lib/dashboard.ts.

export default async function DashboardPage() {
  const supabase = createClient();
  const today = todayISO();

  // --- Ce qui doit peindre en premier : le run + les alertes qui en dépendent.
  const [{ data: run }, { data: expiredAbsents }] = await Promise.all([
    supabase
      .from("ttfl_runs")
      .select("*")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle<TtflRun>(),
    supabase
      .from("ttfl_manual_absents")
      .select("id")
      .not("date_fin", "is", null)
      .lt("date_fin", today)
      .returns<{ id: number }[]>(),
  ]);

  let recommended: TtflProjection | null = null;
  let pickedPlayer: string | null = null;
  if (run) {
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
    // JAMAIS supposer que le pick est rank=1 : on lit is_pick, comme partout
    // ailleurs dans l'app (le plancher de qualité playoffs retient parfois un
    // rang moins bien projeté).
    recommended = rows.find((r) => r.is_pick) ?? rows[0] ?? null;
    pickedPlayer = pick?.player ?? null;
  }

  const mode: Mode = run?.mode ?? "regular";
  const runIsToday = run?.game_date === today;

  // --- Alertes, non bloquantes -------------------------------------------
  const alerts: Alert[] = [];
  if (run && runIsToday) {
    const ageHours =
      (Date.now() - new Date(run.computed_at).getTime()) / 3600000;
    if (ageHours > 2 || !run.injury_report_fresh) {
      alerts.push({
        id: "stale-report",
        tone: "danger",
        message: "Report périmé — relance le push avant de picker.",
      });
    }
    if (!pickedPlayer) {
      alerts.push({
        id: "pick-not-validated",
        tone: "warn",
        message: "Pick du soir non encore validé.",
      });
    }
  }
  if ((expiredAbsents?.length ?? 0) > 0) {
    alerts.push({
      id: "expired-absents",
      tone: "info",
      message: `${expiredAbsents!.length} absent(s) dont la date de fin est dépassée — à retirer ?`,
    });
  }

  return (
    <div className="space-y-5">
      <RealtimeRuns />
      <AlertsBanner alerts={alerts} />

      {/* Bloc 1 — le pick du soir + fraîcheur ---------------------------- */}
      <section className="space-y-3">
        {run ? (
          <>
            {!runIsToday && (
              <div className="rounded-xl border border-quest/40 bg-quest/10 px-4 py-3">
                <p className="text-sm font-semibold text-quest">
                  Aucun calcul pour ce soir
                </p>
                <p className="mt-0.5 text-xs text-quest/80">
                  Lance le push sur ton PC. Ci-dessous, le dernier classement
                  connu ({frDate(run.game_date)}).
                </p>
              </div>
            )}
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
          </>
        ) : (
          <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-white">
              Aucun calcul — lance le push sur ton PC
            </p>
            <code className="mt-3 inline-block rounded-lg bg-ink-850 px-3 py-2 text-xs text-court-400">
              python push_to_supabase.py
            </code>
          </div>
        )}
        {run && (
          <Link
            href="/ce-soir"
            className="block text-center text-xs font-medium text-ink-600 active:text-court-400"
          >
            Voir le classement complet →
          </Link>
        )}
      </section>

      {/* Bloc 2 — toi vs les repères modèle ------------------------------ */}
      <Suspense fallback={<BlockSkeleton />}>
        <BenchmarksBlock mode={mode} />
      </Suspense>

      {/* Bloc 3 — cycle/usage + absents actifs --------------------------- */}
      <Suspense fallback={<BlockSkeleton />}>
        <CycleAbsentsBlock mode={mode} today={today} />
      </Suspense>

      {/* Emplacement réservé : prévision multi-jours (pas encore livrée) */}
      <section className="rounded-2xl border border-dashed border-ink-800 px-4 py-5 text-center">
        <p className="text-xs text-ink-600">
          Bientôt : aperçu des prochains soirs
        </p>
      </section>
    </div>
  );
}

// --- Bloc 2 : repères modèle (streaming indépendant) ------------------------

async function BenchmarksBlock({ mode }: { mode: Mode }) {
  const supabase = createClient();

  const [{ data: benchmarks }, { data: stats }] = await Promise.all([
    supabase
      .from("ttfl_benchmarks")
      .select("*")
      .eq("mode", mode)
      .order("computed_at", { ascending: false })
      .returns<TtflBenchmark[]>(),
    supabase
      .from("ttfl_season_stats")
      .select("*")
      .eq("mode", mode)
      .maybeSingle<TtflSeasonStats>(),
  ]);

  // Un seul tournoi par mode pour l'instant (ttfl_picks ne distingue pas
  // encore les éditions de playoffs) : si plusieurs lignes existaient quand
  // même pour une même stratégie, ne garder que la plus récente.
  const rows = Object.values(
    (benchmarks ?? []).reduce<Record<string, TtflBenchmark>>((acc, b) => {
      if (!acc[b.strategy]) acc[b.strategy] = b;
      return acc;
    }, {}),
  );

  // Pas encore de benchmarks pour ce tournoi (début de saison) : on masque le
  // bloc proprement plutôt que d'afficher des zéros.
  if (rows.length === 0) return null;

  return (
    <BenchmarksCard
      rows={rows}
      userTotal={stats?.total ?? 0}
      userAvg={stats?.avg ?? null}
    />
  );
}

// --- Bloc 3 : cycle/usage + absents (streaming indépendant) -----------------

async function CycleAbsentsBlock({
  mode,
  today,
}: {
  mode: Mode;
  today: string;
}) {
  const supabase = createClient();

  const { data: absents } = await supabase
    .from("ttfl_manual_absents")
    .select("*")
    .order("date_debut", { ascending: false })
    .returns<TtflManualAbsent[]>();
  const active = (absents ?? []).filter(
    (a) => !a.date_fin || a.date_fin >= today,
  );

  let cycleOrUsage: React.ReactNode;
  if (mode === "regular") {
    // Le blocage dure 30 jours au plus : inutile de remonter plus loin.
    const since = new Date(today + "T00:00:00Z");
    since.setUTCDate(since.getUTCDate() - 30);
    const { data: picks } = await supabase
      .from("ttfl_picks")
      .select("*")
      .eq("mode", "regular")
      .gte("pick_date", since.toISOString().slice(0, 10))
      .returns<TtflPick[]>();
    cycleOrUsage = <CycleList blocked={cycleBlocked(picks ?? [], today)} />;
  } else {
    const { count } = await supabase
      .from("ttfl_picks")
      .select("id", { count: "exact", head: true })
      .eq("mode", "playoffs");
    cycleOrUsage = <UsageCounter count={count ?? 0} />;
  }

  return (
    <section className="space-y-3">
      {cycleOrUsage}
      <AbsentsSummary active={active} />
    </section>
  );
}

function CycleList({ blocked }: { blocked: CycleBlockedPlayer[] }) {
  return (
    <section className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Cycle 30 jours</h2>
        <span className="rounded-full bg-ink-850 px-2.5 py-1 text-xs font-bold text-ink-600">
          {blocked.length} bloqué{blocked.length > 1 ? "s" : ""}
        </span>
      </div>
      {blocked.length === 0 ? (
        <p className="text-xs text-ink-600">Aucun joueur bloqué actuellement.</p>
      ) : (
        <div className="space-y-1.5">
          {blocked.slice(0, 8).map((b) => (
            <div
              key={b.player}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate text-white">{b.player}</span>
              <span className="shrink-0 text-xs text-ink-600">
                libre dans {b.daysLeft} j ({frDate(b.freeOn)})
              </span>
            </div>
          ))}
          {blocked.length > 8 && (
            <p className="pt-1 text-xs text-ink-600">
              +{blocked.length - 8} autre(s)
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function UsageCounter({ count }: { count: number }) {
  return (
    <section className="rounded-2xl border border-court-600/30 bg-court-500/[0.06] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-court-400">
          Usage unique — playoffs
        </span>
        <span className="text-2xl font-black tabular-nums text-white">
          {count}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-ink-600">
        joueur(s) consommé(s) sur l&apos;ensemble des playoffs.
      </p>
    </section>
  );
}

function AbsentsSummary({ active }: { active: TtflManualAbsent[] }) {
  return (
    <section className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Absents actifs</h2>
        <Link
          href="/absents"
          className="text-xs font-medium text-court-400 active:text-court-500"
        >
          Gérer →
        </Link>
      </div>
      {active.length === 0 ? (
        <p className="text-xs text-ink-600">Aucun absent manuel actif.</p>
      ) : (
        <div className="space-y-1.5">
          {active.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate text-white">{a.player}</span>
              <span className="shrink-0 truncate text-xs text-ink-600">
                {a.raison ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BlockSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-ink-850" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-ink-850" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-ink-850" />
    </div>
  );
}
