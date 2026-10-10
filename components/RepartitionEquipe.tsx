"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listerJoueursDuSoir, pickRepartition, type JoueurDuSoir } from "@/app/actions";
import { fmtNum, frDate } from "@/lib/format";
import { joursEntre } from "@/lib/planning";
import { MARGE_BRUIT, PART_MAX, repartirEquipe } from "@/lib/repartition";
import type { Mode } from "@/lib/types";

// Répartit automatiquement les comptes de l'équipe entre les joueurs de la soirée, d'après la règle « bruit »
// (étude sur 5 saisons) : on ne répartit que les joueurs à moins de 3 points du meilleur, 6 comptes au plus par
// joueur. La proposition est MONTRÉE avant toute écriture ; rien n'est enregistré sans « Valider ».
export function RepartitionEquipe({
  mode,
  date,
  comptes,
  bloques,
  aUnPick,
  dejaPose,
}: {
  mode: Mode;
  date: string;
  comptes: string[];
  bloques: Record<string, string[]>; // nom normalisé → comptes où il est bloqué (≤ 30 jours)
  aUnPick: boolean;
  dejaPose: boolean; // au moins un compte a déjà un pick posé sur le site TTFL
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [joueurs, setJoueurs] = useState<JoueurDuSoir[] | null>(null);
  const [avanceSeule, setAvanceSeule] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

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

  // La rotation décale l'ordre des comptes d'une soirée à l'autre : les mêmes comptes ne sont pas toujours servis les premiers.
  const proposition = useMemo(
    () =>
      joueurs === null
        ? null
        : repartirEquipe({ joueurs, comptes, bloques, rotation: joursEntre("2026-01-01", date) }),
    [joueurs, comptes, bloques, date],
  );

  function fermer() {
    setOuvert(false);
    setErreur(null);
  }

  function valider() {
    if (!proposition || proposition.groupes.length === 0) return;
    setErreur(null);
    start(async () => {
      const res = await pickRepartition(
        mode,
        date,
        proposition.groupes.map((g) => ({ player: g.player, comptes: g.comptes })),
      );
      if (res.ok) {
        fermer();
        setJoueurs(null); // rechargé à la prochaine ouverture
        router.refresh();
      } else {
        setErreur(res.error);
      }
    });
  }

  const nbComptes = proposition ? proposition.groupes.reduce((s, g) => s + g.comptes.length, 0) : 0;

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="mt-2 w-full rounded-xl border border-court-600/40 py-2.5 text-sm font-semibold text-court-400 transition active:scale-[0.98]"
      >
        Répartir l&apos;équipe
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={fermer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Répartition de l'équipe du ${frDate(date)}`}
            className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border border-ink-800 bg-ink-900 p-5 pb-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Répartition du {frDate(date)}</h3>
            <p className="mt-0.5 text-sm text-ink-600">
              Joueurs à moins de {MARGE_BRUIT} points du meilleur, {Math.round(PART_MAX * 100)} % des comptes au plus
              par joueur.
            </p>

            {avanceSeule && (
              <p className="mt-2 rounded-lg bg-quest/10 px-3 py-2 text-xs text-quest">
                Projections calculées à l&apos;avance : les blessures ne sont pas encore connues (elles sont vérifiées
                à 23 h 30).
              </p>
            )}
            {aUnPick && (
              <p className="mt-2 rounded-lg bg-quest/10 px-3 py-2 text-xs text-quest">
                Cette soirée a déjà des picks : la répartition les remplace.
                {dejaPose
                  ? " Certains sont déjà posés sur le site TTFL : le robot les y remplacera dans les minutes qui suivent (jusqu'à minuit)."
                  : ""}
              </p>
            )}

            <div className="mt-3 min-h-[8rem] flex-1 overflow-y-auto rounded-xl border border-ink-800">
              {proposition === null && !erreur && (
                <p className="px-4 py-8 text-center text-sm text-ink-600">Chargement…</p>
              )}
              {proposition !== null && proposition.groupes.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-ink-600">
                  Aucun joueur disponible pour cette soirée.
                </p>
              )}
              {proposition?.groupes.map((g) => (
                <div key={g.player} className="flex items-center gap-3 border-b border-ink-800 px-3 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{g.player}</div>
                    <div className="text-xs text-ink-600">
                      {g.comptes.length} compte{g.comptes.length > 1 ? "s" : ""} : {g.comptes.join(", ")}
                    </div>
                  </div>
                  <div className="w-10 shrink-0 text-right font-bold tabular-nums text-white">
                    {fmtNum(g.projection)}
                  </div>
                </div>
              ))}
            </div>

            {proposition !== null && proposition.groupes.length > 0 && (
              <p className="mt-3 text-xs text-ink-600">
                {proposition.coutProjection > 0
                  ? `Coût attendu : −${fmtNum(proposition.coutProjection)} points de projection pour l'équipe, contre chaque compte sur son meilleur joueur — en échange, bien moins de risque si un joueur manque.`
                  : "Aucun coût : un seul joueur est dans la marge, tous les comptes le prennent."}
              </p>
            )}
            {proposition !== null && proposition.sansPick.length > 0 && (
              <p className="mt-2 rounded-lg bg-out/10 px-3 py-2 text-xs text-out">
                Aucun joueur disponible pour le(s) compte(s) {proposition.sansPick.join(", ")}.
              </p>
            )}
            {erreur && <p className="mt-3 rounded-lg bg-out/10 px-3 py-2 text-sm text-out">{erreur}</p>}

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
                disabled={pending || !proposition || proposition.groupes.length === 0}
                className="flex-1 rounded-xl bg-court-500 py-3 font-bold text-white active:scale-[0.98] disabled:opacity-40"
              >
                {pending
                  ? "…"
                  : proposition && proposition.groupes.length > 0
                    ? `Valider la répartition (${proposition.groupes.length} joueur${proposition.groupes.length > 1 ? "s" : ""}, ${nbComptes} comptes)`
                    : "Valider la répartition"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
