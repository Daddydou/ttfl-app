import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { fmtNum } from "@/lib/format";
import { fourchette } from "@/lib/fourchette";
import { Cloture } from "@/components/Cloture";

export interface LigneCeSoir {
  label: string; // « Cpt 01 »
  joueur: string | null;
  secret?: boolean; // compte au pick secret : jamais de nom, un cadenas
  pose?: boolean; // capture de la case TTFL reçue : le pick est bien sur le site
  href: string; // conseillés de ce compte
}

// Carte « Ce soir » de l'Accueil : la réponse à « où j'en suis pour ce soir ? » en un coup d'œil, avant le lock.
// LECTURE SEULE : projection et fourchette viennent du moteur (lib/fourchette.ts), rien n'est recalculé ici.
export function CeSoirCard({
  titreDate,
  lignes,
  equipe,
  projection,
  fraicheur,
  cloture = null,
}: {
  titreDate: string; // « sam. 24 oct. »
  lignes: LigneCeSoir[];
  equipe: { posees: number; total: number; href: string };
  projection: number | null; // projection du pick du compte 01 (null = inconnue)
  fraicheur: ReactNode;
  cloture?: string | null; // heure de clôture de la soirée (ISO), si le moteur l'a enregistrée
}) {
  const f = fourchette(projection);
  return (
    <section className="card space-y-3 p-4" aria-labelledby="titre-ce-soir">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titre-ce-soir" className="title-2">
            Ce soir
          </h2>
          <span className="text-[15px] capitalize text-fg-muted">{titreDate}</span>
        </div>
        <Cloture iso={cloture} />
      </div>

      {/* Chaque ligne mène aux conseillés de ce compte (pour changer ou vérifier en un geste). */}
      <ul className="overflow-hidden rounded-[14px] bg-surface-2">
        {lignes.map((l) => (
          <li key={l.label} className="list-row !p-0">
            <Link href={l.href} className="flex w-full items-center gap-3 px-4 py-3 active:bg-fill/60">
              <span className="w-14 shrink-0 whitespace-nowrap text-[12px] font-semibold uppercase tracking-wide text-fg-muted">
                {l.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[17px]">
                {l.secret ? (
                  <span className="inline-flex items-center gap-1.5 text-fg-muted">
                    <Icon name="cadenas" size={15} strokeWidth={2} />
                    secret jusqu&apos;à la clôture
                  </span>
                ) : l.joueur ? (
                  <span className="font-semibold text-fg">{l.joueur}</span>
                ) : (
                  <span className="font-semibold text-quest">pas encore de pick</span>
                )}
              </span>
              {l.pose && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-avail" title="Posé sur TTFL">
                  <Icon name="coche" size={14} strokeWidth={2.4} />
                  sur TTFL
                </span>
              )}
              <Icon name="chevron" size={14} className="shrink-0 text-fg-faint" />
            </Link>
          </li>
        ))}
        <li className="list-row !p-0">
          <Link href={equipe.href} className="flex w-full items-center gap-3 px-4 py-3 active:bg-fill/60">
            <span className="w-14 shrink-0 whitespace-nowrap text-[12px] font-semibold uppercase tracking-wide text-fg-muted">
              Équipe
            </span>
            <span
              className={`flex-1 text-[15px] font-medium num ${equipe.posees < equipe.total ? "text-quest" : "text-fg"}`}
            >
              {equipe.posees}/{equipe.total} comptes avec un pick
            </span>
            <Icon name="chevron" size={14} className="shrink-0 text-fg-faint" />
          </Link>
        </li>
      </ul>

      {f && (
        <p className="text-[13px] leading-snug text-fg-muted">
          Compte 01, s&apos;il joue : mauvais soir ≈ <span className="num font-semibold text-fg">{Math.round(f.mauvais)}</span>
          {" · "}moyen ≈ <span className="num font-semibold text-fg">{Math.round(f.moyen)}</span>
          {" · "}bon soir ≈ <span className="num font-semibold text-fg">{Math.round(f.bon)}</span>
          {" · "}
          <span className="num">{fmtNum(f.chance40 * 100, 0)} %</span> de chances de faire 40+
        </p>
      )}

      {fraicheur}

      <Link href="/ce-soir" className="btn btn-secondary w-full">
        Voir les picks conseillés
      </Link>
    </section>
  );
}
