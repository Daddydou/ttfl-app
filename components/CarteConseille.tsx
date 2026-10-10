import { StatusBadge } from "@/components/StatusBadge";
import { PickZoneButton } from "@/components/PickZoneButton";
import { Icon } from "@/components/ui/Icon";
import { fmtNum } from "@/lib/format";
import type { Conseille } from "@/lib/conseilles";
import type { Mode, TtflCotes } from "@/lib/types";

// Une carte du Top 10 conseillé : toutes les stats détaillées sont visibles d'emblée (pas de dépli).
// Le n° 1 est mis en avant par un liseré d'accent ; les autres restent sobres.
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
  const premier = c.rang === 1;

  return (
    <article className={`card p-4 ${premier ? "ring-2 ring-court-500/50" : ""}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] font-bold num ${
            premier ? "bg-court-500 text-on-accent" : "bg-fill text-fg-muted"
          }`}
        >
          {c.rang}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[18px] font-bold leading-tight tracking-[-0.015em] text-fg">{c.player}</h3>
            {c.is_urgent && <Icon name="eclair" size={16} className="shrink-0 text-court-400" aria-label="Urgent" />}
          </div>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            {c.team ?? "—"} <span className="text-fg-faint">vs</span> {c.opponent ?? "—"}
            {c.position ? ` · ${c.position}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[28px] font-bold leading-none tracking-[-0.02em] text-court-400 num">
            {fmtNum(c.projection)}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.06em] text-fg-muted">projection</div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Stat label="forme" valeur={fmtNum(c.forme)} />
        <Stat label="plafond" valeur={fmtNum(c.ceiling)} />
        <Stat label="matchup" valeur={`×${fmtNum(c.matchup_factor, 2)}`} />
        <div className="rounded-[12px] bg-surface-2 px-1 py-2">
          <dt className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-muted">statut</dt>
          <dd className="mt-1 flex min-h-[20px] justify-center">
            {c.source === "avance" ? (
              <span className="text-[13px] text-fg-muted">inconnu</span>
            ) : (
              <StatusBadge status={c.status} />
            )}
          </dd>
        </div>
      </dl>

      {aDesCotes && cotes && (
        <p className="mt-3 text-[13px] text-fg-muted">
          Cotes{cotes.bookmaker ? ` (${cotes.bookmaker})` : ""} :{" "}
          <span className="font-semibold text-fg">
            {cotes.ligne_points != null ? `${fmtNum(cotes.ligne_points)} pts` : "pts indispo"}
            {" · "}
            {cotes.ligne_rebonds != null ? `${fmtNum(cotes.ligne_rebonds)} reb` : "reb indispo"}
            {" · "}
            {cotes.ligne_passes != null ? `${fmtNum(cotes.ligne_passes)} pds` : "pds indispo"}
          </span>
        </p>
      )}

      {mode === "playoffs" && c.series_state && (
        <p className="mt-2 text-[13px] text-fg-muted">
          Série <span className="font-semibold text-fg">{c.series_state}</span>
          {c.expected_nights_left != null && ` · ~${fmtNum(c.expected_nights_left)} soir(s) restant(s)`}
        </p>
      )}

      {c.explanation && <p className="mt-2 text-[14px] leading-snug text-fg-muted">{c.explanation}</p>}

      {c.comptesBloques.length > 0 && (
        <p className="mt-3 rounded-[12px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
          Bloqué (≤ 30 jours) sur le(s) compte(s) {c.comptesBloques.join(", ")} — disponible sur{" "}
          {c.comptesLibres.length}.
        </p>
      )}

      <div className="mt-4 flex justify-end">
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
    <div className="rounded-[12px] bg-surface-2 px-1 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-muted">{label}</dt>
      <dd className="mt-1 text-[16px] font-semibold num text-fg">{valeur}</dd>
    </div>
  );
}
