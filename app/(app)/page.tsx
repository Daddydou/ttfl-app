import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COMPTE_REF } from "@/lib/compte";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { AlertsBanner, type Alert } from "@/components/AlertsBanner";
import { BenchmarksCard } from "@/components/BenchmarksCard";
import { PicksValidesCard, type PickCompte } from "@/components/PicksValidesCard";
import { alerteCookies, alertePcSilencieux, type EtatCookies } from "@/lib/etat-robot";
import { AlertesPicks } from "@/components/AlertesPicks";
import { InstallerApp } from "@/components/InstallerApp";
import { SauvegardeHorsLigne } from "@/components/SauvegardeHorsLigne";
import { alertesPicksDuSoir, type AlertePick } from "@/lib/alertes-picks";
import { chargerSoiree } from "@/lib/conseilles-data";
import { fusionnerSoiree } from "@/lib/conseilles";
import { JOURS_CYCLE, ZONES, ajouterJours, type PickLigne } from "@/lib/planning";
import { BandeauSecret } from "@/components/BandeauSecret";
import { chargerSecret, masquerLignes, soireeSecrete, soireesSecretes } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import type { TtflManualAbsent } from "@/lib/types";
import { picksAVenir } from "@/lib/conseilles";
import { aujourdhuiNY } from "@/lib/planning";
import { chargerCaptures } from "@/lib/captures";
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
  const [{ data: run }, { data: expiredAbsents }, { data: etatsRobot }] = await Promise.all([
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
    supabase
      .from("ttfl_robot_etat")
      .select("cle,valeur,maj_le")
      .in("cle", ["cookies", "commandes"])
      .returns<{ cle: string; valeur: Record<string, unknown> | null; maj_le: string }[]>(),
  ]);

  const mode: Mode = run?.mode ?? "regular";

  const [pickRes, aVenirRes, secret] = await Promise.all([
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
      .select("pick_date,player,compte")
      .eq("mode", mode)
      .gte("pick_date", aujourdhui)
      .order("pick_date", { ascending: true })
      .limit(800)
      .returns<PickCompte[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);
  const maintenantMs = heureServeur();
  // Pick secret du compte 02 : ses picks, captures et alertes des soirées pas encore closes sont retirés (lib/secret.ts).
  const datesSecretes = soireesSecretes(
    secret,
    [...new Set([...(run ? [run.game_date] : []), ...Object.keys(secret.lignes)])].sort(),
    aujourdhui,
    maintenantMs,
  );
  const pickedPlayer = pickRes.data?.player ?? null;
  const captures = masquerLignes(await chargerCaptures(supabase), secret, aujourdhui, maintenantMs);
  const tousPicks = picksAVenir(masquerLignes(aVenirRes.data ?? [], secret, aujourdhui, maintenantMs), aujourdhui);
  const picksValides = tousPicks.filter((p) => p.compte === COMPTE_REF); // compte 1 : alertes et photo hors-ligne
  const picksAutres = tousPicks.filter((p) => p.compte !== COMPTE_REF);

  const runIsToday = run?.game_date === today;

  // --- Alertes, non bloquantes -------------------------------------------
  const alerts: Alert[] = [];
  if (run && runIsToday) {
    const ageHours = ageMs(run.computed_at) / 3600000;
    if (!run.injury_report_fresh) {
      alerts.push({
        id: "stale-report",
        tone: "danger",
        message:
          "Report des blessures NBA indisponible : aucun blessé n'est exclu des picks conseillés. Vérifie le statut des joueurs avant de picker.",
      });
    }
    if (ageHours > 2) {
      alerts.push({
        id: "stale-calcul",
        tone: "danger",
        message: `Dernier calcul il y a ${Math.floor(ageHours)} h : le PC n'a pas poussé depuis. Vérifie qu'il est allumé et que la tâche « TTFL push » tourne.`,
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

  // --- Alertes avant matchs : picks de ce soir devenus Out / incertains, comptes sans pick, remplaçant proposé.
  let alertesPicks: AlertePick[] = [];
  if (run && run.mode === "regular" && run.game_date >= aujourdhui) {
    const [soiree, voisinsRes, absentsRes] = await Promise.all([
      chargerSoiree(supabase, run.mode, run.game_date),
      supabase
        .from("ttfl_picks")
        .select("pick_date,player,compte")
        .eq("mode", run.mode)
        .gte("pick_date", ajouterJours(run.game_date, -JOURS_CYCLE))
        .lte("pick_date", ajouterJours(run.game_date, JOURS_CYCLE))
        .returns<PickLigne[]>(),
      supabase.from("ttfl_manual_absents").select("*").returns<TtflManualAbsent[]>(),
    ]);
    const voisins = masquerLignes(voisinsRes.data ?? [], secret, aujourdhui, maintenantMs);
    // Ce soir encore secret : aucune alerte pour le compte secret (« sans pick » serait faux, « Out » trahirait le joueur).
    const zonesAlertes = soireeSecrete(secret, secret.compte, run.game_date, aujourdhui, maintenantMs)
      ? ZONES.filter((z) => !z.comptes.includes(secret.compte))
      : ZONES;
    alertesPicks = alertesPicksDuSoir({
      zones: zonesAlertes,
      date: run.game_date,
      picksDuSoir: voisins.filter((p) => p.pick_date === run.game_date),
      voisins,
      lignes: fusionnerSoiree(soiree.avance, soiree.soir),
      absents: absentsRes.data ?? [],
      runDuSoirDisponible: !!soiree.runSoir,
    });
  }

  // --- Santé du robot : cookies TTFL à renouveler, PC silencieux.
  const cookiesEtat = etatsRobot?.find((e) => e.cle === "cookies");
  const alerteCk = alerteCookies(cookiesEtat ? { ...(cookiesEtat.valeur as EtatCookies | null), le: (cookiesEtat.valeur as EtatCookies | null)?.le ?? cookiesEtat.maj_le } : null);
  if (alerteCk) alerts.push(alerteCk);
  const pouls = etatsRobot?.find((e) => e.cle === "commandes");
  // Cloud en charge (migration sans PC) : le PC se tait exprès, ce n'est pas une alerte.
  const { data: cloud } = await supabase.from("ttfl_cloud_reglage").select("mode").eq("id", 1).maybeSingle<{ mode: string }>();
  const alertePc = cloud?.mode === "reel"
    ? null
    : alertePcSilencieux((pouls?.valeur as { dernier_passage?: string } | null)?.dernier_passage ?? pouls?.maj_le);
  if (alertePc) alerts.push(alertePc);

  return (
    <div className="space-y-5">
      <RealtimeRuns />
      <SauvegardeHorsLigne soiree={run?.game_date ?? null} pickDuSoir={pickedPlayer} aVenir={picksValides} />
      <AlertsBanner alerts={alerts} />
      <InstallerApp />
      {run && <AlertesPicks alertes={alertesPicks} mode={run.mode} date={run.game_date} />}

      {/* Bloc 1 — mes picks validés (comptes 1 et 2 visibles, équipe dépliable) : une ligne par soirée, avec sa date ---- */}
      <BandeauSecret etat={secret} dates={datesSecretes} />
      <PicksValidesCard
        picks={picksValides}
        autres={picksAutres}
        aujourdhui={aujourdhui}
        captures={captures}
        datesSecretes={datesSecretes}
      />

      {/* Bloc 2 — fraîcheur du dernier calcul + accès aux picks conseillés ------------- */}
      <section className="space-y-3">
        {run ? (
          <FreshnessBanner computedAt={run.computed_at} injuryFresh={run.injury_report_fresh} />
        ) : (
          <div className="card px-4 py-8 text-center">
            <p className="text-sm font-semibold text-fg">Aucun calcul — lance le push sur ton PC</p>
            <code className="mt-3 inline-block rounded-[10px] bg-surface-2 px-3 py-2 text-[13px] text-court-400">
              python push_to_supabase.py
            </code>
          </div>
        )}
        <Link
          href="/ce-soir"
          className="block text-center text-[13px] font-medium text-fg-muted active:text-court-400"
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
    <div className="card p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-surface-2" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-2" />
    </div>
  );
}
