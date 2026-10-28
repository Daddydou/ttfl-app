import Link from "next/link";
import { etiquetteJour } from "@/lib/conseilles";
import { COMPTES_EQUIPE, ZONES, type ZoneId } from "@/lib/planning";
import { majuscule } from "@/lib/format";

export function hrefConseilles(date: string | null, pour: ZoneId, compte?: string | null): string {
  const q = new URLSearchParams();
  if (date) q.set("date", date);
  q.set("pour", pour);
  if (compte) q.set("compte", compte);
  return `/ce-soir?${q.toString()}`;
}

// Un onglet par soirée à venir (7 jours au plus), défilement horizontal sur téléphone.
export function JoursConseilles({
  jours,
  courant,
  pour,
  aujourdhui,
  compte = null,
}: {
  jours: string[];
  courant: string;
  pour: ZoneId;
  aujourdhui: string;
  compte?: string | null;
}) {
  return (
    <div className="rail -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Soirées">
      {jours.map((j) => {
        const e = etiquetteJour(j, aujourdhui);
        const actif = j === courant;
        return (
          <Link
            key={j}
            href={hrefConseilles(j, pour, compte)}
            role="tab"
            aria-selected={actif}
            className={`chip !rounded-[20px] !px-3.5 !py-2 ${actif ? "chip-on" : ""}`}
          >
            <span className="block">{majuscule(e.court)}</span>
            {e.relatif && <span className="block text-[11px] font-medium normal-case opacity-80">{e.relatif}</span>}
          </Link>
        );
      })}
    </div>
  );
}

// Zone Équipe : tous les comptes 03 à 12 ensemble, ou UN compte à la fois (son propre cycle, son propre classement).
export function ComptesEquipeConseilles({ date, compte }: { date: string | null; compte: string | null }) {
  const items: { id: string | null; label: string }[] = [
    { id: null, label: "Tous" },
    ...COMPTES_EQUIPE.map((c) => ({ id: c, label: c })),
  ];
  return (
    <div className="rail -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Compte de l'équipe">
      {items.map((it) => (
        <Link
          key={it.label}
          href={hrefConseilles(date, "equipe", it.id)}
          role="tab"
          aria-selected={compte === it.id}
          className={`chip ${compte === it.id ? "chip-on" : ""}`}
        >
          {it.label}
        </Link>
      ))}
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
