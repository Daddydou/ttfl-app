"use client";

import { useState } from "react";

export interface Alert {
  id: string;
  tone: "warn" | "danger" | "info";
  message: string;
}

const TONE = {
  warn: "border-quest/40 bg-quest/10 text-quest",
  danger: "border-out/40 bg-out/10 text-out",
  info: "border-court-600/30 bg-court-500/[0.08] text-court-400",
} as const;

// Bandeau d'alertes discret, fermable une par une, jamais bloquant : chaque
// ligne disparaît côté client sans rien écrire nulle part (elle revient au
// prochain chargement si la condition tient toujours — c'est voulu, une
// alerte réelle ne doit pas pouvoir être "définitivement" masquée par erreur).
export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${TONE[a.tone]}`}
        >
          <span className="flex-1 leading-snug">{a.message}</span>
          <button
            type="button"
            aria-label="Ignorer"
            onClick={() =>
              setDismissed((prev) => new Set(prev).add(a.id))
            }
            className="shrink-0 opacity-60 active:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
