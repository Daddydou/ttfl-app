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
        className="mt-2 w-full rounded-xl border border-ink-700 py-2.5 text-sm font-semibold text-ink-600 transition active:scale-[0.98] active:text-white"
      >
        Modifier certains comptes
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={fermer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Modifier des comptes pour le ${frDate(date)}`}
            className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border border-ink-800 bg-ink-900 p-5 pb-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Comptes du {frDate(date)}</h3>
            <p className="mt-0.5 text-sm text-ink-600">
              Coche les comptes à modifier : les autres ne changent pas.
            </p>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-ink-600">
                {selection.length} sélectionné{selection.length > 1 ? "s" : ""}
              </span>
              <span className="flex gap-3">
                <button onClick={() => setSelection([...comptes])} className="font-semibold text-court-400">
                  Tout sélectionner
                </button>
                <button onClick={() => setSelection([])} className="font-semibold text-ink-600">
                  Aucun
                </button>
              </span>
            </div>

            <ul className="mt-2 min-h-[8rem] flex-1 overflow-y-auto rounded-xl border border-ink-800">
              {comptes.map((c) => {
                const coche = selection.includes(c);
                const joueur = parCompte[c];
                return (
                  <li key={c} className="border-b border-ink-800 last:border-0">
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${
                        coche ? "bg-court-500/15" : "active:bg-ink-850"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={coche}
                        onChange={() => basculer(c)}
                        aria-label={`Compte ${c}`}
                        className="h-5 w-5 accent-court-500"
                      />
                      <span className="w-16 shrink-0 text-sm font-semibold text-white">Compte {c}</span>
                      <span className={`min-w-0 flex-1 truncate text-right text-sm ${joueur ? "text-white" : "text-ink-600"}`}>
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
              <p className="mt-3 text-center text-xs text-ink-600">Coche au moins un compte pour choisir un joueur.</p>
            )}

            <button
              onClick={fermer}
              className="mt-3 w-full rounded-xl border border-ink-700 py-3 font-semibold text-ink-600 active:bg-ink-800"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
