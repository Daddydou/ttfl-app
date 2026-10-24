"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reglerCloud } from "@/app/(app)/admin/cloud-actions";
import { LIBELLES_CLOUD, MODES_CLOUD, type ModeCloud } from "@/lib/cloud";

const CONFIRMATION_REEL =
  "Le cloud va tout faire à la place du PC : projections, Plan 30 et picks automatiques, contrôle des blessures, " +
  "synchro avec le site. Le PC s'arrêtera de lui-même à sa prochaine tâche. Tu peux revenir en arrière à tout moment. Continuer ?";

// Interrupteur « Moteur dans le cloud » (Admin) : arrêté / essai à blanc / cloud en charge.
export function MoteurCloud({ mode, dernier }: { mode: ModeCloud | null; dernier: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [confirmer, setConfirmer] = useState(false);

  function choisir(m: ModeCloud) {
    if (m === mode) return;
    if (m === "reel") {
      setConfirmer(true);
      return;
    }
    appliquer(m);
  }

  function appliquer(m: ModeCloud) {
    setRetour(null);
    start(async () => {
      const res = await reglerCloud(m);
      setConfirmer(false);
      setRetour(res.ok ? { ok: true, texte: res.message } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-2" aria-labelledby="titre-cloud">
      <h2 id="titre-cloud" className="sr-only">Moteur dans le cloud</h2>
      <div className="card space-y-3 px-4 py-3.5">
        <p className="text-[13px] leading-snug text-fg-muted">
          {mode ? LIBELLES_CLOUD[mode].detail : "Réglage illisible : le PC reste en charge."}
          {dernier ? ` Dernier lancement : ${dernier}.` : ""}
        </p>
        <div role="radiogroup" aria-label="Mode du moteur cloud" className="grid grid-cols-3 gap-2">
          {MODES_CLOUD.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === mode}
              disabled={pending}
              onClick={() => choisir(m)}
              className={`btn btn-sm ${m === mode ? "btn-primary" : "btn-secondary"}`}
            >
              {LIBELLES_CLOUD[m].titre}
            </button>
          ))}
        </div>
        {retour && (
          <p className={`rounded-[10px] px-3 py-2 text-[13px] ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
            {retour.texte}
          </p>
        )}
      </div>

      {confirmer && (
        <div className="sheet-backdrop" onClick={() => setConfirmer(false)}>
          <div role="dialog" aria-modal="true" aria-label="Confirmer : cloud en charge" className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="title-2">Passer le cloud en charge ?</h3>
            <p className="mt-1 text-sm text-fg-muted">{CONFIRMATION_REEL}</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmer(false)} disabled={pending} className="btn btn-plain w-full">Annuler</button>
              <button onClick={() => appliquer("reel")} disabled={pending} className="btn btn-primary w-full">
                {pending ? "…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
