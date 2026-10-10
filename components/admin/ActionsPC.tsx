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
      <h2 className="section-label">Actions sur le PC</h2>
      {GROUPES.map((g) => (
        <div key={g.id} className="space-y-1.5">
          <h3 className="section-label !normal-case !tracking-normal">{g.titre}</h3>
          <div className="card divide-y divide-line">
            {ACTIONS_PC.filter((a) => a.groupe === g.id).map((a) => (
              <CarteAction key={a.id} action={a} active={actives.includes(a.id)} />
            ))}
          </div>
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
    <div className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-[16px] font-semibold leading-snug text-fg">{action.libelle}</h4>
          <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{action.detail}</p>
        </div>
        <button
          onClick={() => (action.confirmer ? setConfirmer(true) : lancer())}
          disabled={active || pending}
          aria-label={`Lancer : ${action.libelle}`}
          className="btn btn-secondary btn-sm shrink-0"
        >
          {active ? "En cours…" : pending ? "…" : "Lancer"}
        </button>
      </div>

      {action.param === "date" && (
        <label className="mt-3 block text-[13px] text-fg-muted">
          Soirée (facultatif)
          <input
            type="date"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            aria-label={`Soirée pour ${action.libelle}`}
            className="field mt-1 block w-full"
          />
        </label>
      )}
      {action.param === "nuits" && (
        <label className="mt-3 block text-[13px] text-fg-muted">
          Nombre de soirées (facultatif)
          <select
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            aria-label={`Nombre de soirées pour ${action.libelle}`}
            className="field mt-1 block w-full"
          >
            <option value="">Par défaut (7)</option>
            {[3, 7, 14, 21].map((n) => (
              <option key={n} value={n}>{n} soirées</option>
            ))}
          </select>
        </label>
      )}

      {retour && (
        <p className={`mt-2 rounded-[10px] px-3 py-2 text-[13px] ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
          {retour.texte}
        </p>
      )}

      {confirmer && (
        <div
          className="sheet-backdrop"
          onClick={() => setConfirmer(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Confirmer : ${action.libelle}`}
            className="sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="title-2">{action.libelle}</h3>
            <p className="mt-1 text-sm text-fg-muted">{action.confirmer}</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmer(false)}
                disabled={pending}
                className="btn btn-plain w-full"
              >
                Annuler
              </button>
              <button
                onClick={lancer}
                disabled={pending}
                className="btn btn-primary w-full"
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
