import Link from "next/link";
import { etiquetteJour } from "@/lib/conseilles";
import { frDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

// Petite tuile calendrier : jour de la semaine + numéro, comme l'app Calendrier d'iOS.
function Tuile({ iso }: { iso: string }) {
  const d = new Date(`${iso}T00:00:00Z`);
  const jour = d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  const num = d.toLocaleDateString("fr-FR", { day: "numeric", timeZone: "UTC" });
  return (
    <span
      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[12px] bg-surface-2"
      aria-hidden="true"
    >
      <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-court-400">{jour}</span>
      <span className="mt-0.5 text-[20px] font-bold leading-none num text-fg">{num}</span>
    </span>
  );
}

// Mes picks validés à venir (compte 1) : une ligne par soirée, avec la date du pick.
export function PicksValidesCard({
  picks,
  aujourdhui,
}: {
  picks: { pick_date: string; player: string }[];
  aujourdhui: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="title-2">
          Mes picks validés
          <span className="ml-2 align-middle rounded-full bg-fill px-2.5 py-0.5 text-[13px] font-semibold num text-fg-muted">
            {picks.length}
          </span>
        </h2>
        <Link href="/picks" className="text-[15px] font-medium text-court-400 active:opacity-60">
          Gérer
        </Link>
      </div>

      {picks.length === 0 ? (
        <div className="card px-4 py-6 text-center">
          <p className="text-[14px] text-fg-muted">Aucun pick validé à venir.</p>
          <Link href="/ce-soir" className="mt-1 inline-block text-[15px] font-medium text-court-400">
            Voir les picks conseillés
          </Link>
        </div>
      ) : (
        <ul className="card overflow-hidden">
          {picks.map((p) => {
            const rel = etiquetteJour(p.pick_date, aujourdhui).relatif;
            return (
              <li key={p.pick_date} className="list-row">
                <Tuile iso={p.pick_date} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold tracking-[-0.01em] text-fg">{p.player}</div>
                  <div className="text-[13px] capitalize text-fg-muted">
                    {frDate(p.pick_date)}
                    {rel && <span className="ml-1 normal-case text-court-400">· {rel}</span>}
                  </div>
                </div>
                <Icon name="chevron" size={16} className="shrink-0 text-fg-faint" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
