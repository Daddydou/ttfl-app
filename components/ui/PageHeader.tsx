import type { ReactNode } from "react";

// Grand titre façon iOS : une seule hiérarchie sur toutes les pages.
export function PageHeader({
  titre,
  sousTitre,
  action,
}: {
  titre: string;
  sousTitre?: ReactNode;
  action?: ReactNode;
}) {
  return (
    // flex-wrap : une action large passe sous le titre au lieu d'écraser le sous-titre.
    <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1 pb-1 pt-2">
      <div className="min-w-0 flex-1 basis-[13rem]">
        <h1 className="title-large">{titre}</h1>
        {sousTitre && <p className="subhead mt-1">{sousTitre}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </header>
  );
}
