"use client";

import { useId } from "react";
import { aujourdhuiNY } from "@/lib/planning";
import { libelleMois, moisDe, x2Possible } from "@/lib/x2";

// Case « poser aussi le x2 » : à mettre dans toute fenêtre où l'on pose ou modifie un joueur. Le x2 est lié au joueur
// et à la soirée (un par mois et par compte) ; le serveur revérifie et refuse tout si le x2 n'est pas possible.
// Ne s'affiche pas pour une soirée passée ou hors de la saison du x2 (novembre → avril).
export function CaseX2({
  date,
  coche,
  onChange,
  nbComptes = 1,
  libelle,
}: {
  date: string;
  coche: boolean;
  onChange: (valeur: boolean) => void;
  nbComptes?: number;
  libelle?: string; // remplace le texte par défaut (ex. « sur ce groupe »)
}) {
  const id = useId();
  if (!x2Possible(date, aujourdhuiNY())) return null;
  const mois = libelleMois(moisDe(date));
  return (
    <div className="mt-3 rounded-[12px] bg-surface-2 px-3 py-2.5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={coche}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 accent-court-500"
        />
        <span className="text-[14px] font-semibold leading-snug text-fg">
          {libelle ?? `Poser aussi le x2 de ${mois}`}
          {nbComptes > 1 ? ` (${nbComptes} comptes)` : ""}
        </span>
      </label>
      {coche && (
        <p className="mt-1.5 pl-9 text-[13px] leading-snug text-fg-muted">
          Un seul x2 par mois et par compte : s&apos;il y en a déjà un ce mois-ci, il est déplacé sur cette soirée. Lié au
          joueur : si le pick change, le x2 saute.
        </p>
      )}
    </div>
  );
}
