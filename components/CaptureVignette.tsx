"use client";

import { useState } from "react";
import type { Capture } from "@/lib/captures";

// « Capture du site » sous un pick : un bouton discret qui déplie l'image de la case telle qu'elle s'affichait sur TTFL.
export function CaptureVignette({ capture }: { capture: Capture }) {
  const [ouverte, setOuverte] = useState(false);
  const heure = new Date(capture.capture_le).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOuverte((o) => !o)}
        aria-expanded={ouverte}
        className="text-[12px] font-medium text-court-400 active:opacity-60"
      >
        {ouverte ? "Masquer la capture" : "Voir la capture du site"}
        <span className="ml-1 font-normal text-fg-muted">· {heure}</span>
      </button>
      {ouverte && (
        // eslint-disable-next-line @next/next/no-img-element -- adresse signée temporaire : pas d'optimisation Next
        <img
          src={capture.url}
          alt={`Capture de la case TTFL : ${capture.joueur}`}
          loading="lazy"
          className="mt-1.5 w-full max-w-sm rounded-[12px] border border-line"
        />
      )}
    </div>
  );
}
