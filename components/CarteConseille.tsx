import { StatusBadge } from "@/components/StatusBadge";
import { PickZoneButton } from "@/components/PickZoneButton";
import { fmtNum } from "@/lib/format";
import type { Conseille } from "@/lib/conseilles";
import type { Mode, TtflCotes } from "@/lib/types";

// Une carte du Top 10 conseillé : toutes les stats détaillées sont visibles d'emblée (pas de dépli).
export function CarteConseille({
  c,
  mode,
  date,
  zoneLabel,
  cotes,
  picke,
}: {
  c: Conseille;
  mode: Mode;
  date: string;
  zoneLabel: string;
  cotes?: TtflCotes;
  picke: boolean; // déjà pické sur tous les comptes libres, pour cette soirée
}) {
  const aDesCotes =
    !!cotes && (cotes.ligne_points != null || cotes.ligne_rebonds != null || cotes.ligne_passes != null);

  return (
    <article
      className={`rounded-2xl border p-4 ${
        c.rang === 1 ? "border-court-600/40 bg-court-500/[0.06]" : "border-ink-800 bg-ink-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 w-6 shrink-0 text-center text-base font-extrabold tabular-nums ${
            c.rang === 1 ? "text-court-400" : "text-ink-600"
          }`}
        >
          {c.rang}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold text-white">{c.player}</h3>
            {c.is_urgent && <span className="shrink-0 text-court-400">⚡</span>}
          </div>
          <p className="text-xs text-ink-600">
            {c.team ?? "—"} <span className="text-court-400">vs</span> {c.opponent ?? "—"}
            {c.position ? ` · ${c.position}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-black tabular-nums text-court-400">{fmtNum(c.projection)}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-600">projection</div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="forme" valeur={fmtNum(c.forme)} />
        <Stat label="plafond" valeur={fmtNum(c.ceiling)} />
        <Stat label="matchup" valeur={`×${fmtNum(c.matchup_factor, 2)}`} />
        <div className="rounded-lg bg-ink-850 px-1 py-1.5">
          <dt className="text-[10px] uppercase tracking-wide text-ink-600">statut</dt>
          <dd className="mt-0.5 flex justify-center">
            {c.source === "avance" ? (
              <span className="text-xs text-ink-600">inconnu</span>
            ) : (
              <StatusBadge status={c.status} />
            )}
          </dd>
        </div>
      </dl>

      {aDesCotes && cotes && (
        <p className="mt-2 text-xs text-ink-600">
          Cotes{cotes.bookmaker ? ` (${cotes.bookmaker})` : ""} :{" "}
          <span className="font-semibold text-white">
            {cotes.ligne_points != null ? `${fmtNum(cotes.ligne_points)} pts` : "pts indispo"}
            {" · "}
            {cotes.ligne_rebonds != null ? `${fmtNum(cotes.ligne_rebonds)} reb` : "reb indispo"}
            {" · "}
            {cotes.ligne_passes != null ? `${fmtNum(cotes.ligne_passes)} pds` : "pds indispo"}
          </span>
        </p>
      )}

      {mode === "playoffs" && c.series_state && (
        <p className="mt-2 text-xs text-ink-600">
          Série <span className="font-semibold text-white">{c.series_state}</span>
          {c.expected_nights_left != null && ` · ~${fmtNum(c.expected_nights_left)} soir(s) restant(s)`}
        </p>
      )}

      {c.explanation && <p className="mt-2 text-xs leading-relaxed text-ink-600">{c.explanation}</p>}

      {c.comptesBloques.length > 0 && (
        <p className="mt-2 rounded-lg bg-quest/10 px-2.5 py-1.5 text-xs text-quest">
          Bloqué (≤ 30 jours) sur le(s) compte(s) {c.comptesBloques.join(", ")} — disponible sur{" "}
          {c.comptesLibres.length}.
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <PickZoneButton
          mode={mode}
          date={date}
          player={c.player}
          comptes={c.comptesLibres}
          zoneLabel={zoneLabel}
          dejaPicke={picke}
        />
      </div>
    </article>
  );
}

function Stat({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="rounded-lg bg-ink-850 px-1 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-ink-600">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold tabular-nums text-white">{valeur}</dd>
    </div>
  );
}
