"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pickPlayerComptes } from "@/app/actions";
import { frDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
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
    return <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-avail"><Icon name="coche" size={16} strokeWidth={2.4} />Pické</span>;
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
        className="btn btn-primary btn-sm"
      >
        Picker
      </button>
      {confirmer && (
        <div
          className="sheet-backdrop"
          onClick={() => setConfirmer(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Confirmer le pick de ${player}`}
            className="sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="title-2">Confirmer le pick</h3>
            <p className="mt-1 text-sm text-fg-muted">
              Enregistrer <span className="font-semibold text-fg">{player}</span> pour le{" "}
              {frDate(date)} — {zoneLabel}
              {comptes.length > 1 ? ` (${comptes.length} comptes)` : ""}. Il sera bloqué 30 jours.
            </p>
            {erreur && <p className="mt-3 rounded-[10px] bg-out/10 px-3 py-2 text-sm text-out">{erreur}</p>}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmer(false)}
                disabled={pending}
                className="btn btn-plain w-full"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                disabled={pending}
                className="btn btn-primary w-full"
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
