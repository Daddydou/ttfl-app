"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { PickButton } from "@/components/PickButton";
import { fmtNum } from "@/lib/format";
import type { Mode, TtflProjection } from "@/lib/types";

// Ligne du Top N, dépliable au tap (même pattern que BenchmarksCard) : la
// vue repliée reste identique à avant (projection + pick toujours
// accessibles sans dépli), le dépli ajoute forme/matchup/explication —
// exactement ce qu'affiche déjà PickCard pour le seul pick recommandé.
export function ProjectionRow({
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
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border-b border-ink-800 last:border-0 ${
        isRecommended ? "bg-court-500/[0.06]" : ""
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
          <svg
            viewBox="0 0 20 20"
            className={`h-3 w-3 shrink-0 fill-ink-600 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
        </button>
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

      {open && (
        <div className="px-3 pb-3 pl-11">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
            <span>
              forme{" "}
              <span className="font-semibold text-white">
                {fmtNum(row.forme)}
              </span>
            </span>
            <span>
              matchup{" "}
              <span className="font-semibold text-white">
                ×{fmtNum(row.matchup_factor, 2)}
              </span>
            </span>
            {mode === "playoffs" && row.series_state && (
              <span>
                série{" "}
                <span className="font-semibold text-white">
                  {row.series_state}
                </span>
                {row.expected_nights_left != null &&
                  ` · ~${fmtNum(row.expected_nights_left)} soir(s)`}
              </span>
            )}
          </div>
          {row.explanation && (
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              {row.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
