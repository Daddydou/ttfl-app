import { frDate } from "@/lib/format";
import {
  comptesDuBlesse,
  etiquetteCompte,
  libelleStatut,
  type Blesse,
  type EquipeBlessee,
  type MatchBlesses,
  type PicksParJoueur,
} from "@/lib/blesses";

// Les blessés (Out / Doubtful) d'un match, dans une liste déroulante FERMÉE placée directement dans la carte du match :
// la page reste légère, on ouvre seulement ce qui intéresse. Rien ne s'affiche tant qu'aucun rapport n'est lu pour la soirée.
export function BlessesMatch({ m, picks = {} }: { m: MatchBlesses | null; picks?: PicksParJoueur }) {
  if (!m) return null;
  const aucun = m.nbOut + m.nbDoubtful === 0;
  return (
    <details className="rounded-[12px] bg-surface px-3 py-2">
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-[13px] font-medium text-fg">
        <span>Blessés</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px]">
          {m.nbOut > 0 && <span className="rounded-full bg-out/10 px-2 py-0.5 font-semibold text-out">{m.nbOut} Out</span>}
          {m.nbDoubtful > 0 && (
            <span className="rounded-full bg-quest/15 px-2 py-0.5 font-semibold text-quest">{m.nbDoubtful} Doubtful</span>
          )}
          {aucun && <span className="text-fg-muted">aucun</span>}
        </span>
      </summary>
      <div className="mt-2.5 space-y-3">
        <EquipeListe e={m.ext} picks={picks} />
        <EquipeListe e={m.dom} picks={picks} />
      </div>
    </details>
  );
}

// Joueurs du rapport dont l'équipe n'a pas pu être identifiée : on ne les cache pas, on les montre à part.
export function BlessesSansEquipe({ blesses, picks = {} }: { blesses: Blesse[]; picks?: PicksParJoueur }) {
  if (blesses.length === 0) return null;
  return (
    <details className="card px-4 py-3">
      <summary className="cursor-pointer text-[13px] font-semibold text-fg">Blessés d&apos;équipe non identifiée ({blesses.length})</summary>
      <ul className="mt-2 space-y-1.5">
        {blesses.map((b) => (
          <LigneBlesse key={`${b.game_date}-${b.joueur_norm}`} b={b} picks={picks} />
        ))}
      </ul>
    </details>
  );
}

function EquipeListe({ e, picks }: { e: EquipeBlessee; picks: PicksParJoueur }) {
  return (
    <div>
      <p className="section-label mb-1">{e.nom}</p>
      {e.joueurs.length === 0 ? (
        <p className="text-[13px] text-fg-muted">Aucun blessé signalé.</p>
      ) : (
        <ul className="space-y-1.5">
          {e.joueurs.map((b) => (
            <LigneBlesse key={b.joueur_norm} b={b} picks={picks} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LigneBlesse({ b, picks }: { b: Blesse; picks: PicksParJoueur }) {
  const comptes = comptesDuBlesse(b, picks);
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[14px] font-medium text-fg">{b.joueur}</p>
          {comptes.map((c) => (
            <span
              key={c}
              title={`Pick du compte ${c}`}
              className="shrink-0 rounded-md bg-fg/10 px-1.5 py-0.5 text-[11px] font-bold leading-none text-fg"
            >
              {etiquetteCompte(c)}
            </span>
          ))}
        </div>
        {(b.motif || b.retour_prevu) && (
          <p className="text-[12px] text-fg-muted">
            {b.motif}
            {b.motif && b.retour_prevu ? " · " : ""}
            {b.retour_prevu ? `retour prévu le ${frDate(b.retour_prevu)}` : ""}
          </p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
          b.statut === "Out" ? "bg-out/10 text-out" : "bg-quest/15 text-quest"
        }`}
      >
        {libelleStatut(b)}
      </span>
    </li>
  );
}
