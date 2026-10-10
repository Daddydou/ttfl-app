"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pickPlayerComptes } from "@/app/actions";
import { frDate } from "@/lib/format";
import type { Mode } from "@/lib/types";

// Valide un joueur pour une soirée sur les comptes d'une zone (Compte 1, Compte 2 ou les comptes libres de
// l'équipe). Confirmation avant écriture ; le serveur revérifie le cycle de 30 jours.
export function PickZoneButton({
  mode,
  date,
  player,
  comptes,
  zoneLabel,
  dejaPicke,
}: {
  mode: Mode;
  date: string;
  player: string;
  comptes: string[]; // comptes sur lesquels il est encore disponible
  zoneLabel: string;
  dejaPicke: boolean; // déjà pické sur tous ces comptes pour cette soirée
}) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (dejaPicke) {
    return <span className="text-xs font-semibold text-avail">✓ Pické</span>;
  }

  function valider() {
    setErreur(null);
    start(async () => {
      const res = await pickPlayerComptes(mode, date, player, comptes);
      if (res.ok) {
        setConfirmer(false);
        router.refresh();
      } else {
        setErreur(res.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setConfirmer(true)}
        className="rounded-xl bg-court-500 px-4 py-2 text-sm font-bold text-white transition active:scale-[0.97]"
      >
        Picker
      </button>
      {confirmer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setConfirmer(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Confirmer le pick de ${player}`}
            className="w-full max-w-md rounded-t-3xl border border-ink-800 bg-ink-900 p-5 pb-8 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Confirmer le pick</h3>
            <p className="mt-1 text-sm text-ink-600">
              Enregistrer <span className="font-semibold text-white">{player}</span> pour le{" "}
              {frDate(date)} — {zoneLabel}
              {comptes.length > 1 ? ` (${comptes.length} comptes)` : ""}. Il sera bloqué 30 jours.
            </p>
            {erreur && <p className="mt-3 rounded-lg bg-out/10 px-3 py-2 text-sm text-out">{erreur}</p>}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmer(false)}
                disabled={pending}
                className="flex-1 rounded-xl border border-ink-700 py-3 font-semibold text-ink-600 active:bg-ink-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                disabled={pending}
                className="flex-1 rounded-xl bg-court-500 py-3 font-bold text-white active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? "…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
