import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Titre de page « Dark » (comme Tennis) : capitales fines très espacées qui se resserrent en sortant du flou.
// `retour` : lien vers la page parente, en haut à gauche (« ‹ Plus »).
export function PageHeader({
  titre,
  sousTitre,
  action,
  retour,
}: {
  titre: string;
  sousTitre?: ReactNode;
  action?: ReactNode;
  retour?: { href: string; libelle: string };
}) {
  return (
    <div className="px-1 pt-2">
      {retour && (
        <Link
          href={retour.href}
          className="titre-espace -ml-1.5 mb-1 inline-flex min-h-[36px] items-center gap-1 pr-2 text-[11px] text-court-400 active:opacity-60"
        >
          <Icon name="chevron" size={16} strokeWidth={1.4} className="rotate-180" />
          {retour.libelle}
        </Link>
      )}
      {/* flex-wrap : une action large passe sous le titre au lieu d'écraser le sous-titre. */}
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pb-1">
        <div className="min-w-0 flex-1 basis-[13rem]">
          <h1 className="title-large animate-titre break-words">{titre}</h1>
          {sousTitre && (
            <p className="subhead animate-fondu mt-2 [animation-delay:500ms]">{sousTitre}</p>
          )}
        </div>
        {action && <div className="animate-fondu shrink-0 pb-1 [animation-delay:600ms]">{action}</div>}
      </header>
    </div>
  );
}
