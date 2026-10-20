import { RevelerBouton } from "@/components/RevelerBouton";
import { libelleSecret, type EtatSecret } from "@/lib/secret";

// Bandeau « pick secret » : dit que le pick du compte secret est caché, jusqu'à quelle heure, et laisse le révéler.
// `dates` = les soirées encore secrètes à afficher (la plus proche d'abord). Rien si aucune.
export function BandeauSecret({ etat, dates, avecBouton = true }: { etat: EtatSecret; dates: string[]; avecBouton?: boolean }) {
  if (dates.length === 0) return null;
  const premiere = dates[0];
  return (
    <section
      className="rounded-[20px] bg-court-500/10 px-4 py-3.5"
      aria-label={`Pick du compte ${etat.compte} secret`}
    >
      <p className="text-sm font-semibold text-court-400">🔒 Compte {etat.compte} : pick secret</p>
      <p className="mt-0.5 text-[13px] text-fg-muted">
        {libelleSecret(etat, premiere)} Tu reçois une notification à la clôture.
        {!etat.lisible && " (État illisible : par prudence, tout est caché.)"}
      </p>
      {avecBouton && (
        <p className="mt-2">
          <RevelerBouton soiree={premiere} />
        </p>
      )}
    </section>
  );
}
