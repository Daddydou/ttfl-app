import { PickZoneButton } from "@/components/PickZoneButton";
import { Icon } from "@/components/ui/Icon";
import { messageAlerte, type AlertePick } from "@/lib/alertes-picks";
import { fmtNum } from "@/lib/format";
import type { Mode } from "@/lib/types";

// Alertes avant les matchs : pick devenu Out / incertain / absent, ou compte sans pick.
// Le remplaçant est une PROPOSITION : « Picker » ouvre la confirmation habituelle, le serveur revérifie le cycle.
export function AlertesPicks({ alertes, mode, date }: { alertes: AlertePick[]; mode: Mode; date: string }) {
  if (alertes.length === 0) return null;
  return (
    <section className="space-y-2" aria-label="Alertes sur les picks du soir">
      {alertes.map((a) => {
        const grave = a.type === "out" || a.type === "absent";
        return (
          <div
            key={a.id}
            className={`rounded-[16px] px-4 py-3 ${grave ? "bg-out/10" : "bg-quest/10"}`}
          >
            <p className={`flex items-start gap-2 text-[14px] font-semibold leading-snug ${grave ? "text-out" : "text-quest"}`}>
              <Icon name="eclair" size={16} className="mt-0.5 shrink-0" />
              <span>{messageAlerte(a)}</span>
            </p>
            {a.remplacant ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[13px] text-fg-muted">
                  Remplaçant proposé : <span className="font-semibold text-fg">{a.remplacant.player}</span>
                  {a.remplacant.projection != null ? ` · proj. ${fmtNum(a.remplacant.projection)}` : ""}
                </p>
                <PickZoneButton
                  mode={mode}
                  date={date}
                  player={a.remplacant.player}
                  comptes={a.comptes}
                  zoneLabel={a.zoneLabel}
                  dejaPicke={false}
                />
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-fg-muted">Aucun remplaçant disponible (cycle de 30 jours ou répartition).</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
