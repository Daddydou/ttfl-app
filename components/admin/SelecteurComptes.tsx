"use client";

import { COMPTES_EQUIPE } from "@/lib/planning";

const TOUS = ["01", "02", ...COMPTES_EQUIPE];

// Sélection de comptes par pastilles, avec des raccourcis (compte 1, compte 2, équipe, tous).
export function SelecteurComptes({
  valeur,
  onChange,
  legende = "Comptes",
}: {
  valeur: string[];
  onChange: (v: string[]) => void;
  legende?: string;
}) {
  const basculer = (c: string) => onChange(valeur.includes(c) ? valeur.filter((x) => x !== c) : [...valeur, c].sort());
  const raccourcis: { label: string; comptes: string[] }[] = [
    { label: "Compte 1", comptes: ["01"] },
    { label: "Compte 2", comptes: ["02"] },
    { label: "Équipe", comptes: [...COMPTES_EQUIPE] },
    { label: "Tous", comptes: [...TOUS] },
    { label: "Aucun", comptes: [] },
  ];
  return (
    <fieldset className="mt-3">
      <legend className="text-[13px] text-fg-muted">
        {legende} <span className="text-fg">({valeur.length})</span>
      </legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {TOUS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => basculer(c)}
            aria-pressed={valeur.includes(c)}
            aria-label={`Compte ${c}`}
            className={`h-10 w-12 rounded-[12px] text-[15px] font-semibold tabular-nums transition ${
              valeur.includes(c) ? "bg-court-500 text-on-accent" : "bg-fill/80 text-fg"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
        {raccourcis.map((r) => (
          <button key={r.label} type="button" onClick={() => onChange(r.comptes)} className="font-semibold text-court-400">
            {r.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
