"use client";

import { useState } from "react";
import { frDate } from "@/lib/format";
import type { BenchmarkStrategy, TtflBenchmark } from "@/lib/types";

// Ordre d'affichage voulu : le glouton d'abord (le repère "sans intelligence
// particulière"), puis la planification (le repère perdant, à ne pas viser),
// puis la doctrine (le mode conseillé, le vrai bon repère en playoffs).
const ORDER: BenchmarkStrategy[] = ["greedy", "plan_by_round", "doctrine"];

const META: Record<
  BenchmarkStrategy,
  { label: string; tooltip: string }
> = {
  greedy: {
    label: "Glouton réaliste",
    tooltip:
      "Chaque soir, le pick #1 du modèle avec l'info disponible ce soir-là, " +
      "sans anticiper le futur. Aucune intelligence de calendrier — le repère " +
      "de base.",
  },
  plan_by_round: {
    label: "Planification par tour",
    tooltip:
      "Le modèle fige ses picks pour tout le tour à venir, sur projections " +
      "et un tableau prédit, sans connaître les résultats futurs. Mesuré " +
      "PERDANT face au glouton : il s'engage sur des projections bruitées. " +
      "Un repère bas qui illustre pourquoi planifier à l'avance ne marche " +
      "pas — pas un objectif à battre.",
  },
  doctrine: {
    label: "Doctrine (mode conseillé)",
    tooltip:
      "Le mode réellement conseillé par l'app : plancher de qualité absolu " +
      "+ tie-break d'urgence d'élimination. C'est le vrai bon repère en " +
      "playoffs.",
  },
};

export function BenchmarksCard({
  rows,
  userTotal,
  userAvg,
}: {
  rows: TtflBenchmark[];
  userTotal: number;
  userAvg: number | null;
}) {
  const ordered = ORDER
    .map((s) => rows.find((r) => r.strategy === s))
    .filter((r): r is TtflBenchmark => Boolean(r));

  if (ordered.length === 0) return null;

  return (
    <section className="card p-4">
      <h2 className="headline mb-1">
        Toi vs les repères modèle
      </h2>
      <p className="mb-3 text-[13px] text-fg-muted">
        Calculés côté moteur, indépendants de tes picks. Delta = ton total −
        celui du repère.
      </p>
      <div className="space-y-2">
        {ordered.map((r) => (
          <BenchmarkLine key={r.strategy} row={r} userTotal={userTotal} />
        ))}
      </div>
      {userAvg !== null && (
        <p className="mt-3 text-[11px] text-fg-muted">
          Ta moyenne / pick : {userAvg.toFixed(1)}
        </p>
      )}
    </section>
  );
}

function BenchmarkLine({
  row,
  userTotal,
}: {
  row: TtflBenchmark;
  userTotal: number;
}) {
  const [open, setOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const meta = META[row.strategy];
  const delta = userTotal - row.total;
  const good = delta >= 0;

  return (
    <div className="rounded-[14px] bg-surface-2">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <svg
            viewBox="0 0 20 20"
            className={`h-3 w-3 shrink-0 fill-fg-muted transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
          <span className="truncate text-sm font-medium text-fg">
            {meta.label}
          </span>
        </button>
        <button
          type="button"
          aria-label={`À propos de ${meta.label}`}
          onClick={() => setShowTip((v) => !v)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fill text-[11px] font-bold text-fg-muted active:bg-fill"
        >
          ?
        </button>
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold tabular-nums text-fg">
            {row.total}
            <span className="ml-1 text-[11px] font-normal text-fg-muted">
              ({row.avg?.toFixed(1) ?? "—"}/pick)
            </span>
          </div>
          <div
            className={`text-[13px] font-semibold tabular-nums ${
              good ? "text-avail" : "text-out"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </div>
        </div>
      </div>

      {showTip && (
        <p className="mx-3 mb-2.5 rounded-[10px] bg-surface px-3 py-2 text-[13px] text-fg-muted">
          {meta.tooltip}
        </p>
      )}

      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-line px-3 py-2">
          <table className="w-full text-[13px]">
            <tbody>
              {row.detail_json.map((d, i) => (
                <tr key={`${d.date}-${i}`} className="border-b border-line">
                  <td className="py-1 pr-2 text-fg-muted">{frDate(d.date)}</td>
                  <td className="truncate py-1 pr-2 text-fg">{d.player}</td>
                  <td className="py-1 text-right font-semibold tabular-nums text-fg">
                    {d.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
