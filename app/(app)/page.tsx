import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COMPTE_REF } from "@/lib/compte";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { AlertsBanner, type Alert } from "@/components/AlertsBanner";
import { BenchmarksCard } from "@/components/BenchmarksCard";
import { PicksValidesCard } from "@/components/PicksValidesCard";
import { picksAVenir } from "@/lib/conseilles";
import { aujourdhuiNY } from "@/lib/planning";
import { ageMs, todayISO } from "@/lib/format";
import type { Mode, TtflBenchmark, TtflRun, TtflSeasonStats } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau de bord - TTFL" };

// LECTURE SEULE : cette page ne calcule ni score ni projection. Elle montre les picks validés à venir (compte 1),
// les alertes et les repères ; le classement conseillé est dans l'onglet « Picks conseillés ».

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();
  const aujourdhui = aujourdhuiNY(); // une soirée NBA se date à New York

  // --- Ce qui doit peindre en premier : le run + les alertes qui en dépendent.
  const [{ data: run }, { data: expiredAbsents }] = await Promise.all([
    supabase
      .from("ttfl_latest_run")
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

  const mode: Mode = run?.mode ?? "regular";

  const [pickRes, aVenirRes] = await Promise.all([
    run
      ? supabase
          .from("ttfl_picks")
          .select("player")
          .eq("mode", run.mode)
          .eq("pick_date", run.game_date)
          .eq("compte", COMPTE_REF)
          .maybeSingle<{ player: string }>()
      : Promise.resolve({ data: null }),
    supabase
      .from("ttfl_picks")
      .select("pick_date,player")
      .eq("mode", mode)
      .eq("compte", COMPTE_REF)
      .gte("pick_date", aujourdhui)
      .order("pick_date", { ascending: true })
      .limit(60)
      .returns<{ pick_date: string; player: string }[]>(),
  ]);
  const pickedPlayer = pickRes.data?.player ?? null;
  const picksValides = picksAVenir(aVenirRes.data ?? [], aujourdhui);

  const runIsToday = run?.game_date === today;

  // --- Alertes, non bloquantes -------------------------------------------
  const alerts: Alert[] = [];
  if (run && runIsToday) {
    const ageHours = ageMs(run.computed_at) / 3600000;
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

      {/* Bloc 1 — mes picks validés (compte 1) : une ligne par soirée, avec sa date ---- */}
      <PicksValidesCard picks={picksValides} aujourdhui={aujourdhui} />

      {/* Bloc 2 — fraîcheur du dernier calcul + accès aux picks conseillés ------------- */}
      <section className="space-y-3">
        {run ? (
          <FreshnessBanner computedAt={run.computed_at} injuryFresh={run.injury_report_fresh} />
        ) : (
          <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-white">Aucun calcul — lance le push sur ton PC</p>
            <code className="mt-3 inline-block rounded-lg bg-ink-850 px-3 py-2 text-xs text-court-400">
              python push_to_supabase.py
            </code>
          </div>
        )}
        <Link
          href="/ce-soir"
          className="block text-center text-xs font-medium text-ink-600 active:text-court-400"
        >
          Picks conseillés des 7 prochains jours →
        </Link>
      </section>

      {/* Bloc 3 — toi vs les repères modèle ------------------------------ */}
      <Suspense fallback={<BlockSkeleton />}>
        <BenchmarksBlock mode={mode} />
      </Suspense>
    </div>
  );
}

// --- Repères modèle (streaming indépendant) ---------------------------------

async function BenchmarksBlock({ mode }: { mode: Mode }) {
  const supabase = await createClient();

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

function BlockSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-ink-850" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-ink-850" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-ink-850" />
    </div>
  );
}
