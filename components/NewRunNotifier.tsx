"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { frDate } from "@/lib/format";
import type { TtflRun } from "@/lib/types";

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
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md px-4">
      <div className="flex flex-1 items-center gap-3 rounded-xl border border-court-600/40 bg-ink-900 px-4 py-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Nouvelles projections
          </p>
          <p className="text-xs text-ink-600">
            Poussées par le PC pour le {frDate(run.game_date)}.
          </p>
        </div>
        <Link
          href="/ce-soir"
          onClick={() => setRun(null)}
          className="shrink-0 rounded-lg bg-court-500 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Voir
        </Link>
        <button
          onClick={() => setRun(null)}
          aria-label="Fermer"
          className="shrink-0 px-1 text-ink-600 active:text-white"
        >
          ✕
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
