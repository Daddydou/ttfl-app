import Link from "next/link";
import { etiquetteJour } from "@/lib/conseilles";
import { ZONES, type ZoneId } from "@/lib/planning";

export function hrefConseilles(date: string | null, pour: ZoneId): string {
  const q = new URLSearchParams();
  if (date) q.set("date", date);
  q.set("pour", pour);
  return `/ce-soir?${q.toString()}`;
}

// Un onglet par soirée à venir (7 jours au plus), défilement horizontal sur téléphone.
export function JoursConseilles({
  jours,
  courant,
  pour,
  aujourdhui,
}: {
  jours: string[];
  courant: string;
  pour: ZoneId;
  aujourdhui: string;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Soirées">
      {jours.map((j) => {
        const e = etiquetteJour(j, aujourdhui);
        const actif = j === courant;
        return (
          <Link
            key={j}
            href={hrefConseilles(j, pour)}
            role="tab"
            aria-selected={actif}
            className={`shrink-0 rounded-xl px-3 py-2 text-center text-xs font-semibold capitalize transition ${
              actif ? "bg-court-500 text-white" : "border border-ink-700 text-ink-600 active:text-white"
            }`}
          >
            <span className="block">{e.court}</span>
            {e.relatif && <span className="block text-[10px] font-medium normal-case opacity-80">{e.relatif}</span>}
          </Link>
        );
      })}
    </div>
  );
}

// Pour quels comptes : le cycle de 30 jours est propre à chaque compte, donc le classement change selon la zone.
export function ZonesConseilles({ courant, date }: { courant: ZoneId; date: string | null }) {
  return (
    <div className="flex gap-1 rounded-xl bg-ink-850 p-1" role="tablist" aria-label="Comptes">
      {ZONES.map((z) => (
        <Link
          key={z.id}
          href={hrefConseilles(date, z.id)}
          role="tab"
          aria-selected={courant === z.id}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
            courant === z.id ? "bg-court-500 text-white" : "text-ink-600 active:text-white"
          }`}
        >
          {z.label}
        </Link>
      ))}
    </div>
  );
}
