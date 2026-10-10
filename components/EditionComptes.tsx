"use client";

import { useMemo, useState } from "react";
import { NuitPicker } from "@/components/NuitPicker";
import { frDate } from "@/lib/format";
import type { Mode } from "@/lib/types";

// Changements MANUELS sur x comptes de l'équipe, pour une soirée : on voit le pick de chaque compte, on coche ceux à
// modifier, puis on choisit le joueur (ou on retire le pick) pour la sélection seulement. Les autres comptes ne bougent pas.
export function EditionComptes({
  mode,
  date,
  comptes,
  parCompte,
  bloques,
  dejaPose,
}: {
  mode: Mode;
  date: string;
  comptes: string[];
  parCompte: Record<string, string>; // compte → joueur pické pour cette soirée
  bloques: Record<string, string[]>; // nom normalisé → comptes où il est bloqué (≤ 30 jours)
  dejaPose: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);

  // Pour la sélection, un joueur n'est bloqué que s'il l'est sur UN des comptes cochés.
  const bloquesSelection = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(bloques).map(([nom, cs]) => [nom, cs.filter((c) => selection.includes(c))]),
      ),
    [bloques, selection],
  );

  const basculer = (c: string) =>
    setSelection((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c].sort()));

  function fermer() {
    setOuvert(false);
    setSelection([]);
  }

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="btn btn-plain mt-2 w-full !min-h-[44px] !text-[15px]"
      >
        Modifier certains comptes
      </button>

      {ouvert && (
        <div
          className="sheet-backdrop"
          onClick={fermer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Modifier des comptes pour le ${frDate(date)}`}
            className="sheet flex max-h-[88vh] flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="title-2">Comptes du {frDate(date)}</h3>
            <p className="mt-0.5 text-sm text-fg-muted">
              Coche les comptes à modifier : les autres ne changent pas.
            </p>

            <div className="mt-3 flex items-center justify-between text-[13px]">
              <span className="text-fg-muted">
                {selection.length} sélectionné{selection.length > 1 ? "s" : ""}
              </span>
              <span className="flex gap-3">
                <button onClick={() => setSelection([...comptes])} className="font-semibold text-court-400">
                  Tout sélectionner
                </button>
                <button onClick={() => setSelection([])} className="font-semibold text-fg-muted">
                  Aucun
                </button>
              </span>
            </div>

            <ul className="mt-2 min-h-[8rem] flex-1 overflow-y-auto rounded-[16px] bg-surface-2">
              {comptes.map((c) => {
                const coche = selection.includes(c);
                const joueur = parCompte[c];
                return (
                  <li key={c} className="border-b border-line last:border-0">
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${
                        coche ? "bg-court-500/15" : "active:bg-fill"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={coche}
                        onChange={() => basculer(c)}
                        aria-label={`Compte ${c}`}
                        className="h-6 w-6 shrink-0 accent-court-500"
                      />
                      <span className="w-24 shrink-0 whitespace-nowrap text-[16px] font-semibold text-fg">Compte {c}</span>
                      <span className={`min-w-0 flex-1 truncate text-right text-sm ${joueur ? "text-fg" : "text-fg-muted"}`}>
                        {joueur ?? "aucun pick"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {selection.length > 0 ? (
              <NuitPicker
                key={selection.join(",")}
                mode={mode}
                date={date}
                zoneLabel={`${selection.length} compte${selection.length > 1 ? "s" : ""} (${selection.join(", ")})`}
                comptes={selection}
                aUnPick={selection.some((c) => !!parCompte[c])}
                dejaPose={dejaPose}
                bloques={bloquesSelection}
              />
            ) : (
              <p className="mt-3 text-center text-[13px] text-fg-muted">Coche au moins un compte pour choisir un joueur.</p>
            )}

            <button
              onClick={fermer}
              className="btn btn-plain mt-3 w-full"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
