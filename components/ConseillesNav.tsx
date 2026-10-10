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
            className={`chip !rounded-[20px] !px-3.5 !py-2 ${actif ? "chip-on" : ""}`}
          >
            <span className="block">{e.court}</span>
            {e.relatif && <span className="block text-[11px] font-medium normal-case opacity-80">{e.relatif}</span>}
          </Link>
        );
      })}
    </div>
  );
}

// Pour quels comptes : le cycle de 30 jours est propre à chaque compte, donc le classement change selon la zone.
export function ZonesConseilles({ courant, date }: { courant: ZoneId; date: string | null }) {
  return (
    <div className="seg" role="tablist" aria-label="Comptes">
      {ZONES.map((z) => (
        <Link
          key={z.id}
          href={hrefConseilles(date, z.id)}
          role="tab"
          aria-selected={courant === z.id}
          className={`seg-item ${courant === z.id ? "seg-item-on" : ""}`}
        >
          {z.label}
        </Link>
      ))}
    </div>
  );
}
