"use client";

import { Suspense, createContext, use, useContext } from "react";
import { cleQuestionable } from "@/lib/questionables";

// Pastille « Q » à côté d'un joueur dont le statut du jour est Questionable (règle d'affichage du 2026-11-18).
// La liste est lue UNE fois, dans le layout, sans bloquer l'affichage : le layout passe la promesse, chaque pastille la lit
// dans son propre <Suspense> (vide pendant la lecture). Sans fournisseur (test, page isolée) : aucune pastille.
// Couleur « quest » (jaune d'avertissement du thème), jamais l'accent (réservé aux actions : DESIGN.md).
const Contexte = createContext<Promise<string[]> | null>(null);

export function QuestionablesProvider({ promesse, children }: { promesse: Promise<string[]>; children: React.ReactNode }) {
  return <Contexte.Provider value={promesse}>{children}</Contexte.Provider>;
}

function Pastille({ joueur, date, className }: { joueur: string; date: string; className: string }) {
  const promesse = useContext(Contexte);
  const cles = promesse ? use(promesse) : [];
  if (!cles.includes(cleQuestionable(date, joueur))) return null;
  return <PastilleVue className={className} />;
}

// Vue seule (testable sans fournisseur).
export function PastilleVue({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-quest/50 bg-quest/10 px-1.5 py-px align-middle text-[11px] font-semibold leading-tight text-quest ${className}`}
      title="Questionable : peut encore devenir Out"
    >
      Q<span className="sr-only">uestionable</span>
    </span>
  );
}

export function BadgeQuestionable({
  joueur,
  date,
  className = "",
}: {
  joueur: string | null | undefined;
  date: string | null | undefined;
  className?: string;
}) {
  if (!joueur || !date) return null;
  return (
    <Suspense fallback={null}>
      <Pastille joueur={joueur} date={date} className={className} />
    </Suspense>
  );
}
