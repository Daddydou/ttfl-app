import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Grand titre façon iOS : une seule hiérarchie sur toutes les pages.
// `retour` : lien vers la page parente, en haut à gauche comme sur iOS (« ‹ Plus »).
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
          className="-ml-1.5 mb-1 inline-flex min-h-[36px] items-center gap-0.5 pr-2 text-[17px] text-court-400 active:opacity-60"
        >
          <Icon name="chevron" size={20} strokeWidth={2.2} className="rotate-180" />
          {retour.libelle}
        </Link>
      )}
      {/* flex-wrap : une action large passe sous le titre au lieu d'écraser le sous-titre. */}
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pb-1">
        <div className="min-w-0 flex-1 basis-[13rem]">
          <h1 className="title-large">{titre}</h1>
          {sousTitre && <p className="subhead mt-1">{sousTitre}</p>}
        </div>
        {action && <div className="shrink-0 pb-1">{action}</div>}
      </header>
    </div>
  );
}
