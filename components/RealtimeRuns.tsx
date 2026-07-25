"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// S'abonne aux nouveaux runs poussés par le PC. Quand une ligne arrive dans
// ttfl_runs, l'accueil se recharge tout seul — l'utilisateur voit le nouveau
// classement sans rien faire. Realtime doit être activé sur la table côté
// Supabase (voir README) ; sinon ce composant est simplement inerte.
export function RealtimeRuns() {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ttfl_runs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ttfl_runs" },
        () => {
          // Anti-rebond : un push insère un run + 10 projections quasi
          // simultanément ; on ne rafraîchit qu'une fois.
          const now = Date.now();
          if (now - lastRefresh.current > 2000) {
            lastRefresh.current = now;
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
