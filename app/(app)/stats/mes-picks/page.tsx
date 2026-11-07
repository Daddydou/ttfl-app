import { createClient } from "@/lib/supabase/server";
import { COMPTE_REF } from "@/lib/compte";
import { ModeTabs } from "@/components/ModeTabs";
import { CumulativeChart } from "@/components/CumulativeChart";
import { BenchmarksCard } from "@/components/BenchmarksCard";
import { VersusEngineCard } from "@/components/VersusEngineCard";
import {
  distribution,
  cumulative,
  roundClusters,
  engineBenchmark,
  versusLastNights,
} from "@/lib/stats";
import { frDate } from "@/lib/format";
import { BadgeX2 } from "@/components/BadgeX2";
import { construireCarteX2, lireLignesX2, x2Pour, type EtatBadgeX2 } from "@/lib/x2-affichage";
import type { TtflBenchmark, TtflPick } from "@/lib/types";
import { chargerSecret } from "@/lib/secret";
import { aujourdhuiNY } from "@/lib/planning";
import { maintenantMs } from "@/lib/plan30";
import { chargerPicksNotes, resoudreMode } from "@/lib/stats-donnees";
import { ecartAuCompte, type ScorePick } from "@/lib/stats-equipe";
import { formeRecente, parJourSemaine, series, SEUIL_SERIE } from "@/lib/stats-mes-picks";
import { Carte, Colonnes, Lignes, Tuile, GrilleTuiles } from "@/components/stats/blocs";
import { fmt, fmtSigne, dateCourte } from "@/lib/stats-outils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats — TTFL" };

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: explicitMode } = await searchParams;
  const supabase = await createClient();
  const mode = await resoudreMode(supabase, explicitMode);

  const { data: picks } = await supabase
    .from("ttfl_picks")
    .select("*")
    .eq("mode", mode)
    .eq("compte", COMPTE_REF)
    .order("pick_date", { ascending: true })
    .returns<TtflPick[]>();

  const x2 = construireCarteX2(await lireLignesX2(supabase)); // compte 01 : pas de secret
  const { data: benchmarks } = await supabase
    .from("ttfl_benchmarks")
    .select("*")
    .eq("mode", mode)
    .order("computed_at", { ascending: false })
    .returns<TtflBenchmark[]>();

  // Un seul tournoi par mode pour l'instant (ttfl_picks ne distingue pas
  // encore les éditions de playoffs) : si plusieurs lignes existaient quand
  // même pour une même stratégie, ne garder que la plus récente.
  const benchmarkRows = Object.values(
    (benchmarks ?? []).reduce<Record<string, TtflBenchmark>>((acc, b) => {
      if (!acc[b.strategy]) acc[b.strategy] = b;
      return acc;
    }, {}),
  );

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
  const engine = engineBenchmark(benchmarkRows);
  const versus = versusLastNights(all, engine, 7);

  // Nouveautés : forme, séries, jours de la semaine et écart avec l'équipe (le pick secret du compte 02 est exclu).
  const aujourdhui = aujourdhuiNY();
  const etatSecret = await chargerSecret(supabase, aujourdhui);
  const picksEquipe = await chargerPicksNotes(supabase, mode, { etat: etatSecret, aujourdhui, maintenantMs: maintenantMs() });
  const miens: ScorePick[] = scored.map((p) => ({ compte: p.compte, pick_date: p.pick_date, player: p.player, score: p.score }));
  const forme = formeRecente(miens, 7);
  const serie = series(miens);
  const semaine = parJourSemaine(miens);
  const ecarts = ecartAuCompte(miens, picksEquipe);

  if (scored.length === 0) {
    return (
      <div className="space-y-4">
        <ModeTabs base="/stats/mes-picks" current={mode} />
        <div className="card px-4 py-10 text-center">
          <p className="text-sm text-fg-muted">
            Pas encore de score saisi en{" "}
            {mode === "playoffs" ? "playoffs" : "saison régulière"}. Saisis tes
            scores dans « Mes picks » pour voir tes stats.
          </p>
        </div>
        {benchmarkRows.length > 0 && (
          <BenchmarksCard rows={benchmarkRows} userPicks={[]} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ModeTabs base="/stats/mes-picks" current={mode} />

      {/* Tuiles résumé */}
      <div className="grid grid-cols-2 gap-2">
        <BigStat label="Total" value={total.toString()} />
        <BigStat
          label="Moyenne / pick"
          value={avg !== null ? avg.toFixed(1) : "—"}
        />
        <SmallStat
          label="Meilleur"
          player={best?.player ?? "—"}
          value={best?.score ?? null}
          date={best?.pick_date}
          x2={best ? x2Pour(x2, COMPTE_REF, best.pick_date, best.player) : null}
          tone="good"
        />
        <SmallStat
          label="Pire"
          player={worst?.player ?? "—"}
          value={worst?.score ?? null}
          date={worst?.pick_date}
          x2={worst ? x2Pour(x2, COMPTE_REF, worst.pick_date, worst.player) : null}
          tone="bad"
        />
      </div>

      {/* Repères modèle */}
      {benchmarkRows.length > 0 && (
        <BenchmarksCard rows={benchmarkRows} userPicks={all} />
      )}

      {/* Mon pick vs pick du moteur, derniers soirs */}
      {engine && (
        <VersusEngineCard
          rows={versus}
          engineLabel={
            engine.strategy === "doctrine" ? "Doctrine" : "Glouton réaliste"
          }
        />
      )}

      {/* Courbe du cumul / épuisement */}
      <section className="card p-4">
        <h2 className="headline mb-1">
          {mode === "playoffs" ? "Courbe d'épuisement" : "Progression"}
        </h2>
        <p className="mb-3 text-[13px] text-fg-muted">
          Barres : score de chaque pick. Ligne : moyenne cumulée.
        </p>
        <CumulativeChart points={curve} />
      </section>

      <GrilleTuiles>
        <Tuile label="Forme (7 derniers)" valeur={fmt(forme.recent)} detail={forme.ecart === null ? undefined : `${fmtSigne(forme.ecart)} vs saison`} ton={forme.ecart === null ? "neutre" : forme.ecart >= 0 ? "bon" : "mauvais"} />
        <Tuile label={`Série en cours (≥ ${SEUIL_SERIE})`} valeur={String(serie.enCours)} detail={`record : ${serie.meilleure}`} />
      </GrilleTuiles>

      {semaine.some((j) => j.n > 0) && (
        <Carte titre="Par jour de la semaine" aide="Ta moyenne par pick selon le jour de la soirée.">
          <Colonnes titre="Moyenne par jour de la semaine" items={semaine.map((j) => ({ label: j.jour, valeur: j.moyenne ?? 0 }))} />
        </Carte>
      )}

      {ecarts.length > 1 && (
        <Carte titre="Toi face à l'équipe" aide="Écart cumulé entre ta moyenne par pick et celle de l'équipe, soirée après soirée (au-dessus de 0 : tu devances l'équipe).">
          <Lignes titre="Écart cumulé avec l'équipe" labels={ecarts.map((e) => dateCourte(e.date))} series={[{ nom: "Écart cumulé", valeurs: ecarts.map((e) => e.ecartCumule) }]} />
        </Carte>
      )}

      {/* Distribution */}
      <section className="card p-4">
        <h2 className="headline mb-3">
          Distribution ({scored.length} picks)
        </h2>
        <div className="space-y-2">
          {buckets.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-right text-[13px] font-medium text-fg-muted">
                {b.label}
              </span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-2">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${(b.count / maxBucket) * 100}%`,
                    backgroundColor: b.color,
                    minWidth: b.count > 0 ? "6px" : "0",
                  }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-fg">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Playoffs : moyenne par tour */}
      {mode === "playoffs" && rounds.length > 0 && (
        <section className="card p-4">
          <h2 className="headline mb-1">
            Moyenne par tour
          </h2>
          <p className="mb-3 text-[13px] text-fg-muted">
            Tours estimés d&apos;après les trous du calendrier.
          </p>
          <div className="space-y-2.5">
            {rounds.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[13px] font-medium text-fg-muted">
                  {r.label}
                  <span className="text-fg-muted"> ·{r.n}</span>
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
                  <div
                    className="flex h-full items-center justify-end rounded-md bg-fill px-2"
                    style={{ width: `${(r.avg / maxRound) * 100}%` }}
                  >
                    <span className="text-[13px] font-bold num text-fg">
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
        <p className="px-1 text-[13px] text-fg-muted">
          Dernier pick : {curve[curve.length - 1].player} (
          {frDate(curve[curve.length - 1].date)}).
        </p>
      )}
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[32px] font-bold leading-tight tracking-[-0.02em] num text-fg">
        {value}
      </div>
      <div className="text-[13px] uppercase tracking-wide text-fg-muted">{label}</div>
    </div>
  );
}

function SmallStat({
  label,
  player,
  value,
  date,
  tone,
  x2,
}: {
  label: string;
  player: string;
  value: number | null;
  date?: string;
  tone: "good" | "bad";
  x2?: EtatBadgeX2 | null;
}) {
  return (
    <div className="card px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] uppercase tracking-wide text-fg-muted">
          {label}
        </span>
        <span
          className={`text-xl font-bold tabular-nums ${
            tone === "good" ? "text-avail" : "text-out"
          }`}
        >
          {value ?? "—"}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <span className="truncate">{player}</span>
        <BadgeX2 etat={x2} />
      </div>
      {date && <div className="text-[11px] text-fg-muted">{frDate(date)}</div>}
    </div>
  );
}
