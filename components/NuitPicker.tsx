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
          className="btn btn-primary flex-1 !min-h-[44px] !text-[16px]"
        >
          {aUnPick ? "Changer" : "Choisir un joueur"}
        </button>
        {aUnPick &&
          (retraitArme ? (
            <button
              onClick={retirer}
              disabled={pending}
              className="btn !min-h-[44px] !text-[15px] bg-out/15 text-out"
            >
              {pending ? "…" : dejaPose ? "Retirer ici seulement ?" : "Retirer ?"}
            </button>
          ) : (
            <button
              onClick={() => setRetraitArme(true)}
              aria-label={`Retirer le pick du ${frDate(date)}`}
              className="btn btn-plain !min-h-[44px] !text-[15px]"
            >
              Retirer
            </button>
          ))}
      </div>
      {erreur && !ouvert && (
        <p className="mt-2 rounded-[10px] bg-out/10 px-3 py-2 text-[13px] text-out">{erreur}</p>
      )}

      {ouvert && (
        <div
          className="sheet-backdrop"
          onClick={fermer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Choisir le pick du ${frDate(date)}`}
            className="sheet flex max-h-[88vh] flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="title-2">Pick du {frDate(date)}</h3>
            <p className="mt-0.5 text-sm text-fg-muted">
              {zoneLabel} · {comptes.length} compte{comptes.length > 1 ? "s" : ""}
            </p>
            {avanceSeule && (
              <p className="mt-2 rounded-[10px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
                Projections calculées à l&apos;avance : les blessures ne sont pas encore connues.
              </p>
            )}
            {dejaPose && (
              <p className="mt-2 rounded-[10px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
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
              className="field mt-3 w-full placeholder:text-fg-faint"
            />

            <div className="mt-3 min-h-[8rem] flex-1 overflow-y-auto rounded-[16px] bg-surface-2">
              {joueurs === null && !erreur && (
                <p className="px-4 py-8 text-center text-sm text-fg-muted">Chargement…</p>
              )}
              {joueurs !== null && joueurs.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-fg-muted">
                  Aucune projection pour cette soirée.
                </p>
              )}
              {joueurs !== null && joueurs.length > 0 && visibles.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-fg-muted">Aucun résultat.</p>
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
                    className={`flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-0 ${
                      selection ? "bg-court-500/15" : "active:bg-fill"
                    } ${desactive ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-fg">{j.player}</div>
                      <div className="text-[13px] text-fg-muted">
                        {j.team ?? "—"} <span className="text-court-400">vs</span> {j.opponent ?? "—"}
                        {desactive ? ` · bloqué (compte${blocage.length > 1 ? "s" : ""} ${blocage.join(", ")})` : ""}
                      </div>
                    </div>
                    <StatusBadge status={j.status} />
                    <div className="w-10 shrink-0 text-right font-bold tabular-nums text-fg">
                      {fmtNum(j.projection)}
                    </div>
                  </button>
                );
              })}
            </div>

            {erreur && (
              <p className="mt-3 rounded-[10px] bg-out/10 px-3 py-2 text-sm text-out">{erreur}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2">
              <button
                onClick={fermer}
                disabled={pending}
                className="btn btn-plain w-full"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                disabled={pending || !choisi}
                className="btn btn-primary w-full"
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
