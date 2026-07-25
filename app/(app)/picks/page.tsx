import { createClient } from "@/lib/supabase/server";
import { ScoreInput } from "@/components/ScoreInput";
import { ModeTabs } from "@/components/ModeTabs";
import { DeletePickButton } from "@/components/DeletePickButton";
import { frDate } from "@/lib/format";
import type { Mode, TtflPick } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes picks — TTFL" };

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

export default async function PicksPage({
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
    .order("pick_date", { ascending: false })
    .returns<TtflPick[]>();

  const rows = picks ?? [];
  const scored = rows.filter((p) => p.score !== null);
  const total = scored.reduce((s, p) => s + (p.score ?? 0), 0);
  const avg = scored.length ? total / scored.length : null;

  return (
    <div className="space-y-4">
      <ModeTabs base="/picks" current={mode} />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Picks" value={rows.length.toString()} />
        <Stat label="Total" value={scored.length ? total.toString() : "—"} />
        <Stat
          label="Moyenne"
          value={avg !== null ? avg.toFixed(1) : "—"}
          accent
        />
      </div>

      {mode === "playoffs" && (
        <div className="rounded-xl border border-court-600/30 bg-court-500/[0.06] px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-court-400">
              Usage unique
            </span>
            <span className="text-2xl font-black tabular-nums text-white">
              {rows.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-600">
            joueur(s) consommé(s) sur l&apos;ensemble des playoffs — chacun ne
            peut être pické qu&apos;une fois.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-10 text-center">
          <p className="text-sm text-ink-600">
            Aucun pick en {mode === "playoffs" ? "playoffs" : "saison régulière"}{" "}
            pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b border-ink-800 px-3 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">
                  {p.player}
                </div>
                <div className="text-xs text-ink-600">{frDate(p.pick_date)}</div>
              </div>
              <ScoreInput pickId={p.id} score={p.score} />
              <DeletePickButton pickId={p.id} player={p.player} />
            </div>
          ))}
        </div>
      )}

      <p className="px-1 text-xs text-ink-600">
        Saisis le score réel après la soirée : touche le champ, tape le total
        TTFL, valide. Il alimente tes stats et confirme le blocage du joueur.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 px-3 py-2.5 text-center">
      <div
        className={`text-2xl font-black tabular-nums ${
          accent ? "text-court-400" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-ink-600">
        {label}
      </div>
    </div>
  );
}
