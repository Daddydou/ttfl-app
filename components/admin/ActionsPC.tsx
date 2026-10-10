"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lancerCommande } from "@/app/(app)/admin/actions";
import { ACTIONS_PC, GROUPES, type ActionPC } from "@/lib/admin";

type Retour = { ok: boolean; texte: string };

// Les actions que l'application peut demander à ton PC. Elles ne s'exécutent pas ici : la demande est déposée en base,
// l'exécuteur du PC la prend en charge dans la minute (liste fermée : rien d'autre ne peut être lancé).
export function ActionsPC({ actives }: { actives: string[] }) {
  return (
    <section className="space-y-4">
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink-600">Actions sur le PC</h2>
      {GROUPES.map((g) => (
        <div key={g.id} className="space-y-2">
          <h3 className="px-1 text-xs font-semibold text-court-400">{g.titre}</h3>
          {ACTIONS_PC.filter((a) => a.groupe === g.id).map((a) => (
            <CarteAction key={a.id} action={a} active={actives.includes(a.id)} />
          ))}
        </div>
      ))}
    </section>
  );
}

function CarteAction({ action, active }: { action: ActionPC; active: boolean }) {
  const router = useRouter();
  const [valeur, setValeur] = useState("");
  const [confirmer, setConfirmer] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [pending, start] = useTransition();

  function lancer() {
    setRetour(null);
    const params = action.param ? { [action.param]: valeur } : {};
    start(async () => {
      const res = await lancerCommande(action.id, params);
      setConfirmer(false);
      setRetour(res.ok ? { ok: true, texte: res.message } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <h4 className="font-semibold text-white">{action.libelle}</h4>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{action.detail}</p>

      {action.param === "date" && (
        <label className="mt-3 block text-xs text-ink-600">
          Soirée (facultatif)
          <input
            type="date"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            aria-label={`Soirée pour ${action.libelle}`}
            className="mt-1 block w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-white focus:border-court-500 focus:outline-none"
          />
        </label>
      )}
      {action.param === "nuits" && (
        <label className="mt-3 block text-xs text-ink-600">
          Nombre de soirées (facultatif)
          <select
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            aria-label={`Nombre de soirées pour ${action.libelle}`}
            className="mt-1 block w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-white focus:border-court-500 focus:outline-none"
          >
            <option value="">Par défaut (7)</option>
            {[3, 7, 14, 21].map((n) => (
              <option key={n} value={n}>{n} soirées</option>
            ))}
          </select>
        </label>
      )}

      <button
        onClick={() => (action.confirmer ? setConfirmer(true) : lancer())}
        disabled={active || pending}
        aria-label={`Lancer : ${action.libelle}`}
        className="mt-3 w-full rounded-xl bg-court-500 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {active ? "En attente ou en cours…" : pending ? "…" : "Lancer"}
      </button>

      {retour && (
        <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
          {retour.texte}
        </p>
      )}

      {confirmer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setConfirmer(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Confirmer : ${action.libelle}`}
            className="w-full max-w-md rounded-t-3xl border border-ink-800 bg-ink-900 p-5 pb-8 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">{action.libelle}</h3>
            <p className="mt-1 text-sm text-ink-600">{action.confirmer}</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmer(false)}
                disabled={pending}
                className="flex-1 rounded-xl border border-ink-700 py-3 font-semibold text-ink-600 active:bg-ink-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={lancer}
                disabled={pending}
                className="flex-1 rounded-xl bg-court-500 py-3 font-bold text-white active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? "…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
