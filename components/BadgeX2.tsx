import type { EtatBadgeX2 } from "@/lib/x2-affichage";

// Pastille « ×2 » à côté d'un joueur. Pleine = posée sur le site ; en pointillés = prévue (pas encore posée).
// Pas d'orange : l'orange est réservé aux actions (DESIGN.md).
export function BadgeX2({ etat, className = "" }: { etat: EtatBadgeX2 | null | undefined; className?: string }) {
  if (!etat) return null;
  const pose = etat === "pose";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-px align-middle text-[11px] font-bold leading-tight num ${
        pose ? "bg-fg text-surface" : "border border-dashed border-line-strong text-fg-muted"
      } ${className}`}
      title={pose ? "Bonus ×2 posé sur le site" : "Bonus ×2 prévu, pas encore posé sur le site"}
    >
      ×2<span className="sr-only">{pose ? " (posé)" : " (prévu)"}</span>
    </span>
  );
}
