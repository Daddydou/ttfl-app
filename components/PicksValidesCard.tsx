import Link from "next/link";
import { etiquetteJour } from "@/lib/conseilles";
import { frDate } from "@/lib/format";

// Mes picks validés à venir (compte 1) : une ligne par soirée, avec la date du pick.
export function PicksValidesCard({
  picks,
  aujourdhui,
}: {
  picks: { pick_date: string; player: string }[];
  aujourdhui: string;
}) {
  return (
    <section className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Mes picks validés
          <span className="ml-2 rounded-full bg-ink-850 px-2.5 py-0.5 text-xs font-bold text-ink-600">
            {picks.length}
          </span>
        </h2>
        <Link href="/picks" className="text-xs font-medium text-court-400 active:text-court-500">
          Gérer →
        </Link>
      </div>

      {picks.length === 0 ? (
        <p className="text-xs text-ink-600">
          Aucun pick validé à venir.{" "}
          <Link href="/ce-soir" className="font-medium text-court-400">
            Voir les picks conseillés →
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-ink-800">
          {picks.map((p) => {
            const rel = etiquetteJour(p.pick_date, aujourdhui).relatif;
            return (
              <li key={p.pick_date} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="w-28 shrink-0 text-xs capitalize text-ink-600">
                  {frDate(p.pick_date)}
                  {rel && <span className="ml-1 normal-case text-court-400">· {rel}</span>}
                </span>
                <span className="min-w-0 flex-1 truncate text-right font-semibold text-white">{p.player}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
