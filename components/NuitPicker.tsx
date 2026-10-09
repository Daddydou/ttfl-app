"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listerJoueursDuSoir,
  pickPlayerComptes,
  retirerPickComptes,
  type JoueurDuSoir,
} from "@/app/actions";
import { normaliserNom } from "@/lib/planning";
import { fmtNum, frDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Mode } from "@/lib/types";

// Choix (ou retrait) du pick d'une soirée pour une zone de comptes : une liste de tous les
// joueurs des matchs du soir avec leur projection TTFL. Les joueurs déjà pickés à ≤ 30 jours
// sur l'un des comptes de la zone sont grisés (le serveur revérifie à la validation).
export function NuitPicker({
  mode,
  date,
  zoneLabel,
  comptes,
  aUnPick,
  dejaPose,
  bloques,
}: {
  mode: Mode;
  date: string;
  zoneLabel: string;
  comptes: string[];
  aUnPick: boolean;
  dejaPose: boolean; // au moins un compte a déjà ce pick posé sur le site TTFL
  bloques: Record<string, string[]>; // nom normalisé → comptes où il est bloqué
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [joueurs, setJoueurs] = useState<JoueurDuSoir[] | null>(null);
  const [avanceSeule, setAvanceSeule] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [choisi, setChoisi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retraitArme, setRetraitArme] = useState(false);
  const [pending, start] = useTransition();

  // La liste est chargée à l'ouverture seulement (une soirée = jusqu'à ~200 joueurs).
  useEffect(() => {
    if (!ouvert || joueurs !== null) return;
    let annule = false;
    listerJoueursDuSoir(mode, date).then((res) => {
      if (annule) return;
      if (res.ok) {
        setJoueurs(res.joueurs);
        setAvanceSeule(res.avanceSeule);
      } else {
        setErreur(res.error);
      }
    });
    return () => {
      annule = true;
    };
  }, [ouvert, joueurs, mode, date]);

  const visibles = useMemo(() => {
    const q = normaliserNom(recherche);
    return (joueurs ?? []).filter(
      (j) =>
        !q ||
        normaliserNom(j.player).includes(q) ||
        normaliserNom(j.team ?? "").includes(q),
    );
  }, [joueurs, recherche]);

  function fermer() {
    setOuvert(false);
    setChoisi(null);
    setRecherche("");
    setErreur(null);
  }

  function valider() {
    if (!choisi) return;
    setErreur(null);
    start(async () => {
      const res = await pickPlayerComptes(mode, date, choisi, comptes);
      if (res.ok) {
        fermer();
        setJoueurs(null); // rechargé à la prochaine ouverture
        router.refresh();
      } else {
        setErreur(res.error);
      }
    });
  }

  function retirer() {
    start(async () => {
      const res = await retirerPickComptes(mode, date, comptes);
      setRetraitArme(false);
      if (res.ok) router.refresh();
      else setErreur(res.error);
    });
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setOuvert(true)}
          className="flex-1 rounded-xl bg-court-500 py-2.5 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          {aUnPick ? "Changer" : "Choisir un joueur"}
        </button>
        {aUnPick &&
          (retraitArme ? (
            <button
              onClick={retirer}
              disabled={pending}
              className="rounded-xl bg-out/15 px-3 py-2.5 text-sm font-semibold text-out disabled:opacity-50"
            >
              {pending ? "…" : dejaPose ? "Retirer ici seulement ?" : "Retirer ?"}
            </button>
          ) : (
            <button
              onClick={() => setRetraitArme(true)}
              aria-label={`Retirer le pick du ${frDate(date)}`}
              className="rounded-xl border border-ink-700 px-3 py-2.5 text-sm text-ink-600 transition active:text-out"
            >
              Retirer
            </button>
          ))}
      </div>
      {erreur && !ouvert && (
        <p className="mt-2 rounded-lg bg-out/10 px-3 py-2 text-xs text-out">{erreur}</p>
      )}

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={fermer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Choisir le pick du ${frDate(date)}`}
            className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border border-ink-800 bg-ink-900 p-5 pb-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Pick du {frDate(date)}</h3>
            <p className="mt-0.5 text-sm text-ink-600">
              {zoneLabel} · {comptes.length} compte{comptes.length > 1 ? "s" : ""}
            </p>
            {avanceSeule && (
              <p className="mt-2 rounded-lg bg-quest/10 px-3 py-2 text-xs text-quest">
                Projections calculées à l&apos;avance : les blessures ne sont pas encore connues.
              </p>
            )}
            {dejaPose && (
              <p className="mt-2 rounded-lg bg-quest/10 px-3 py-2 text-xs text-quest">
                Déjà posé sur le site TTFL : changer ici ne modifie pas le site, le robot
                signalera un conflit.
              </p>
            )}

            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un joueur ou une équipe"
              aria-label="Rechercher un joueur"
              className="mt-3 w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-court-500 focus:outline-none"
            />

            <div className="mt-3 min-h-[8rem] flex-1 overflow-y-auto rounded-xl border border-ink-800">
              {joueurs === null && !erreur && (
                <p className="px-4 py-8 text-center text-sm text-ink-600">Chargement…</p>
              )}
              {joueurs !== null && joueurs.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-ink-600">
                  Aucune projection pour cette soirée.
                </p>
              )}
              {joueurs !== null && joueurs.length > 0 && visibles.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-ink-600">Aucun résultat.</p>
              )}
              {visibles.map((j) => {
                const blocage = bloques[normaliserNom(j.player)];
                const desactive = !!blocage && blocage.length > 0;
                const selection = choisi === j.player;
                return (
                  <button
                    key={j.player}
                    disabled={desactive}
                    onClick={() => setChoisi(j.player)}
                    aria-pressed={selection}
                    className={`flex w-full items-center gap-3 border-b border-ink-800 px-3 py-2.5 text-left last:border-0 ${
                      selection ? "bg-court-500/15" : "active:bg-ink-850"
                    } ${desactive ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{j.player}</div>
                      <div className="text-xs text-ink-600">
                        {j.team ?? "—"} <span className="text-court-400">vs</span> {j.opponent ?? "—"}
                        {desactive ? ` · bloqué (compte${blocage.length > 1 ? "s" : ""} ${blocage.join(", ")})` : ""}
                      </div>
                    </div>
                    <StatusBadge status={j.status} />
                    <div className="w-10 shrink-0 text-right font-bold tabular-nums text-white">
                      {fmtNum(j.projection)}
                    </div>
                  </button>
                );
              })}
            </div>

            {erreur && (
              <p className="mt-3 rounded-lg bg-out/10 px-3 py-2 text-sm text-out">{erreur}</p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={fermer}
                disabled={pending}
                className="flex-1 rounded-xl border border-ink-700 py-3 font-semibold text-ink-600 active:bg-ink-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                disabled={pending || !choisi}
                className="flex-1 rounded-xl bg-court-500 py-3 font-bold text-white active:scale-[0.98] disabled:opacity-40"
              >
                {pending ? "…" : choisi ? "Valider" : "Choisis un joueur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
