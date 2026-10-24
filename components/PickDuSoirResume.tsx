import { Icon } from "@/components/ui/Icon";
import { fmtNum } from "@/lib/format";

// Résumé en tête de Conseillés : le pick posé pour la soirée affichée (le plan commande l'écran), puis, en second,
// l'avis du classement s'il préfère un autre joueur. LECTURE SEULE : projections du moteur, rien n'est recalculé.
export function PickDuSoirResume({
  titre,
  pick,
  projectionPick,
  pose,
  n1,
}: {
  titre: string; // « Ce soir · Compte 1 »
  pick: string | null; // joueur posé (null = pas encore de pick)
  projectionPick: number | null;
  pose: boolean; // case TTFL confirmée (capture reçue)
  n1: { player: string; projection: number | null } | null; // n° 1 du classement pour cette zone
}) {
  const memeJoueur = !!pick && !!n1 && n1.player === pick;
  const ecart = pick && n1 && !memeJoueur && n1.projection != null && projectionPick != null ? n1.projection - projectionPick : null;

  return (
    <section className="card p-4" aria-label={titre}>
      <h2 className="headline">{titre}</h2>
      {pick ? (
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[22px] font-bold tracking-[-0.014em] text-fg">{pick}</p>
          <span className="shrink-0 text-right">
            {projectionPick != null && (
              <span className="num text-[17px] font-semibold text-fg">{fmtNum(projectionPick)}</span>
            )}
            {projectionPick != null && <span className="ml-1 text-[13px] text-fg-muted">pts attendus</span>}
          </span>
        </div>
      ) : (
        <p className="mt-1 text-[17px] font-semibold text-quest">Pas encore de pick pour cette soirée.</p>
      )}

      {pose && (
        <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-avail">
          <Icon name="coche" size={14} strokeWidth={2.4} />
          Posé sur TTFL
        </p>
      )}

      {n1 && (
        <p className="mt-2 border-t border-line pt-2 text-[14px] leading-snug text-fg-muted">
          {memeJoueur ? (
            "Le classement est d'accord : c'est aussi son n° 1."
          ) : pick ? (
            <>
              Le classement préfère <span className="font-semibold text-fg">{n1.player}</span>
              {ecart != null && (
                <span className="num">
                  {" "}
                  ({ecart >= 0 ? "+" : ""}
                  {fmtNum(ecart)} pts de projection)
                </span>
              )}
              . Pour changer, utilise le bouton de sa carte ci-dessous.
            </>
          ) : (
            <>
              N° 1 du classement : <span className="font-semibold text-fg">{n1.player}</span>.
            </>
          )}
        </p>
      )}
    </section>
  );
}
