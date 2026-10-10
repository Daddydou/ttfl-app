"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { frDate } from "@/lib/format";
import type { TtflRun } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

// Prévient quand le PC pousse de nouvelles projections (INSERT dans ttfl_runs),
// quel que soit l'écran ouvert : bandeau dans l'app, plus une notification
// système si l'app est en arrière-plan et que les notifications sont permises.
// Ne fonctionne que tant que l'app tourne (pas de Web Push serveur).
export function NewRunNotifier() {
  const [run, setRun] = useState<Pick<TtflRun, "game_date"> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ttfl_runs_notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ttfl_runs" },
        (payload) => {
          const next = payload.new as TtflRun;
          // Run « à l'avance » (soirée future poussée par push_avance.py) : ce n'est pas
          // le pick de ce soir, donc ni bannière ni notification.
          if ((next.note ?? "").startsWith("AVANCE")) return;
          setRun(next);
          if (document.visibilityState === "hidden") notifySystem(next);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!run) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md px-4">
      <div className="glass flex flex-1 items-center gap-3 rounded-[20px] px-4 py-3" style={{ boxShadow: "var(--shadow-float)" }}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            Nouvelles projections
          </p>
          <p className="text-[13px] text-fg-muted">
            Poussées par le PC pour le {frDate(run.game_date)}.
          </p>
        </div>
        <Link
          href="/ce-soir"
          onClick={() => setRun(null)}
          className="btn btn-primary btn-sm shrink-0"
        >
          Voir
        </Link>
        <button
          onClick={() => setRun(null)}
          aria-label="Fermer"
          className="shrink-0 px-1 text-fg-muted active:text-fg"
        >
          <Icon name="fermer" size={18} />
        </button>
      </div>
    </div>
  );
}

function notifySystem(run: TtflRun) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  // Via le service worker : c'est la seule voie qui marche aussi en PWA
  // installée sur mobile (new Notification() y est refusé).
  navigator.serviceWorker?.ready
    .then((reg) =>
      reg.showNotification("TTFL — nouvelles projections", {
        body: `Le pick du ${frDate(run.game_date)} est prêt.`,
        icon: "/icons/icon-192.png",
        tag: "ttfl-new-run", // remplace la notif précédente au lieu d'empiler
        data: { url: "/ce-soir" },
      }),
    )
    .catch(() => {
      // Pas de SW : le bandeau dans l'app suffit.
    });
}
