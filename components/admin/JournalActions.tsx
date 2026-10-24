import {
  LIBELLES_CATEGORIE, LIBELLES_ORIGINE, LIBELLES_RESULTAT, TON_RESULTAT, quand,
  type EntreeJournal, type GroupeJournal,
} from "@/lib/journal";

const jj = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Ligne({ e, consequence = false }: { e: EntreeJournal; consequence?: boolean }) {
  const contexte = [e.compte ? `compte ${e.compte}` : null, e.soiree ? `soirée du ${jj(e.soiree)}` : null, e.joueur]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={consequence ? "border-l-2 border-line pl-3" : ""}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-semibold text-fg">{e.action}</span>
        <span className={`shrink-0 text-[12px] font-bold ${TON_RESULTAT[e.resultat]}`}>{LIBELLES_RESULTAT[e.resultat]}</span>
      </div>
      {contexte && <div className="text-fg-muted">{contexte}</div>}
      {e.consequence && <div className="mt-0.5 leading-snug text-fg-muted">→ {e.consequence}</div>}
      <div className="mt-0.5 text-[12px] text-fg-muted">
        {quand(e.le)} · {LIBELLES_CATEGORIE[e.categorie]} · {LIBELLES_ORIGINE[e.origine]}
      </div>
    </div>
  );
}

// Liste du journal : chaque demande avec, en dessous, ce qu'elle a provoqué.
export function ListeJournal({ groupes, vide }: { groupes: GroupeJournal[]; vide: string }) {
  if (groupes.length === 0) {
    return <p className="card px-4 py-6 text-center text-sm text-fg-muted">{vide}</p>;
  }
  return (
    <ul className="card divide-y divide-line">
      {groupes.map(({ entree, consequences }) => (
        <li key={entree.id} className="space-y-2 px-4 py-2.5 text-[13px]">
          <Ligne e={entree} />
          {consequences.length > 0 && (
            <div className="space-y-2 pl-1">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">Conséquences</p>
              {consequences.map((c) => (
                <Ligne key={c.id} e={c} consequence />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
