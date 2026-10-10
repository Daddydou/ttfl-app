"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface Alert {
  id: string;
  tone: "warn" | "danger" | "info";
  message: string;
}

const TONE = {
  warn: "bg-quest/10 text-quest",
  danger: "bg-out/10 text-out",
  info: "bg-court-500/10 text-court-400",
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
    <div className="space-y-2" role="status">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-2 rounded-[16px] px-4 py-3 text-[14px] font-medium ${TONE[a.tone]}`}
        >
          <span className="flex-1 leading-snug">{a.message}</span>
          <button
            type="button"
            aria-label="Ignorer"
            onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
            className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-70 active:opacity-100"
          >
            <Icon name="fermer" size={16} strokeWidth={2.2} />
          </button>
        </div>
      ))}
    </div>
  );
}
