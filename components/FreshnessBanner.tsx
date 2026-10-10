"use client";

import { useEffect, useState } from "react";
import { freshness } from "@/lib/format";

const TONE = {
  fresh: {
    bg: "bg-avail/10",
    text: "text-avail",
    dot: "bg-avail",
    icon: "✓",
  },
  aging: {
    bg: "bg-quest/10",
    text: "text-quest",
    dot: "bg-quest",
    icon: "•",
  },
  stale: {
    bg: "bg-out/10",
    text: "text-out",
    dot: "bg-out",
    icon: "!",
  },
} as const;

// Bandeau de fraîcheur : recalculé côté client toutes les 30 s pour que le
// "il y a X min" avance sans recharger la page. C'est l'info critique
// d'avant-lock, elle doit rester honnête en temps réel.
export function FreshnessBanner({
  computedAt,
  injuryFresh,
}: {
  computedAt: string;
  injuryFresh: boolean;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const f = freshness(computedAt, injuryFresh);
  const t = TONE[f.tone];

  return (
    <div
      className={`flex items-center gap-3 rounded-[16px] px-4 py-3 ${t.bg}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {f.tone === "fresh" && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${t.dot} animate-pulse-ring`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${t.dot}`} />
      </span>
      <div className={`flex-1 text-[14px] font-medium ${t.text}`}>
        Calculé {f.label}
        <span className="text-fg/40"> · </span>
        {injuryFresh ? (
          <span>injury report frais</span>
        ) : (
          <span className="font-semibold">report non rafraîchi</span>
        )}
      </div>
    </div>
  );
}
