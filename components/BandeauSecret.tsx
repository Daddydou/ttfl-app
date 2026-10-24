import { RevelerBouton } from "@/components/RevelerBouton";
import { Icon } from "@/components/ui/Icon";
import { heureCloture, libelleSecret, type EtatSecret } from "@/lib/secret";

// Bandeau « pick secret » : dit que le pick du compte secret est caché, jusqu'à quelle heure, et laisse le révéler.
// `dates` = les soirées encore secrètes à afficher (la plus proche d'abord). Rien si aucune.
// C'est une information, pas une action : ton neutre (l'orange reste aux boutons).
// `discret` (Accueil) : une seule ligne calme et un « Révéler » gris, loin d'un geste malheureux avant le lock.
export function BandeauSecret({
  etat,
  dates,
  avecBouton = true,
  discret = false,
}: {
  etat: EtatSecret;
  dates: string[];
  avecBouton?: boolean;
  discret?: boolean;
}) {
  if (dates.length === 0) return null;
  const premiere = dates[0];

  if (discret) {
    const h = heureCloture(etat, premiere);
    return (
      <section
        className="flex items-center gap-3 rounded-[16px] bg-fill/60 px-4 py-2.5"
        aria-label={`Pick du compte ${etat.compte} secret`}
      >
        <Icon name="cadenas" size={16} strokeWidth={2} className="shrink-0 text-fg-muted" />
        <p className="min-w-0 flex-1 text-[13px] text-fg-muted">
          Compte {etat.compte} secret{h ? ` jusqu'à ${h}` : " jusqu'à la clôture"}
          {!etat.lisible && " (état illisible : tout est caché)"}
        </p>
        {avecBouton && <RevelerBouton soiree={premiere} libelle="Révéler" discret />}
      </section>
    );
  }

  return (
    <section className="rounded-[20px] bg-fill/60 px-4 py-3.5" aria-label={`Pick du compte ${etat.compte} secret`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Icon name="cadenas" size={15} strokeWidth={2} className="shrink-0 text-fg-muted" />
        Compte {etat.compte} : pick secret
      </p>
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
