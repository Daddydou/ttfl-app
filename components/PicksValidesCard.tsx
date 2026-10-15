import Link from "next/link";
import { etiquetteJour } from "@/lib/conseilles";
import { frDate } from "@/lib/format";
import { COMPTES_EQUIPE } from "@/lib/planning";
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

export interface PickCompte {
  pick_date: string;
  player: string;
  compte: string;
}

function LigneCompte({ label, joueur }: { label: string; joueur?: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[14px]">
      <span className="w-14 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      <span className={`min-w-0 truncate ${joueur ? "font-semibold text-fg" : "text-fg-faint"}`}>{joueur ?? "pas de pick"}</span>
    </div>
  );
}

// Mes picks validés à venir : une ligne par soirée, avec la date. Le compte 1 est toujours visible ;
// si `autres` est fourni (comptes 02 à 12), le compte 2 l'est aussi et l'équipe (10 comptes) se déroule.
export function PicksValidesCard({
  picks,
  autres,
  aujourdhui,
}: {
  picks: { pick_date: string; player: string }[];
  autres?: PickCompte[];
  aujourdhui: string;
}) {
  const dates = autres
    ? [...new Set([...picks.map((p) => p.pick_date), ...autres.map((p) => p.pick_date)])].sort()
    : picks.map((p) => p.pick_date);
  const joueurC1 = new Map(picks.map((p) => [p.pick_date, p.player]));
  const parDateCompte = new Map<string, string>();
  for (const a of autres ?? []) parDateCompte.set(`${a.pick_date}|${a.compte}`, a.player);
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="title-2">
          Mes picks validés
          <span className="ml-2 align-middle rounded-full bg-fill px-2.5 py-0.5 text-[13px] font-semibold num text-fg-muted">
            {dates.length}
          </span>
        </h2>
        <Link href="/picks" className="text-[15px] font-medium text-court-400 active:opacity-60">
          Gérer
        </Link>
      </div>

      {dates.length === 0 ? (
        <div className="card px-4 py-6 text-center">
          <p className="text-[14px] text-fg-muted">Aucun pick validé à venir.</p>
          <Link href="/ce-soir" className="mt-1 inline-block text-[15px] font-medium text-court-400">
            Voir les picks conseillés
          </Link>
        </div>
      ) : (
        <ul className="card overflow-hidden">
          {dates.map((date) => {
            const rel = etiquetteJour(date, aujourdhui).relatif;
            const c1 = joueurC1.get(date);
            const equipe = COMPTES_EQUIPE.map((c) => ({ compte: c, joueur: parDateCompte.get(`${date}|${c}`) }));
            const nEquipe = equipe.filter((e) => e.joueur).length;
            return (
              <li key={date} className="list-row items-start">
                <Tuile iso={date} />
                <div className="min-w-0 flex-1">
                  {!autres ? (
                    <div className="truncate text-[17px] font-semibold tracking-[-0.01em] text-fg">{c1}</div>
                  ) : (
                    <div className="space-y-0.5">
                      <LigneCompte label="Compte 1" joueur={c1} />
                      <LigneCompte label="Compte 2" joueur={parDateCompte.get(`${date}|02`)} />
                    </div>
                  )}
                  <div className="mt-0.5 text-[13px] capitalize text-fg-muted">
                    {frDate(date)}
                    {rel && <span className="ml-1 normal-case text-court-400">· {rel}</span>}
                  </div>
                  {autres && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[13px] font-medium text-court-400">
                        Équipe · {nEquipe}/{COMPTES_EQUIPE.length} comptes
                      </summary>
                      <div className="mt-1.5 space-y-0.5">
                        {equipe.map((e) => (
                          <LigneCompte key={e.compte} label={`Cpt ${e.compte}`} joueur={e.joueur} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                {!autres && <Icon name="chevron" size={16} className="shrink-0 text-fg-faint" />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
