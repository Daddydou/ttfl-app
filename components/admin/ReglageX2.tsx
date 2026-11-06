"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reglerX2 } from "@/app/(app)/admin/x2-actions";
import { COMPTES_X2, LIBELLES_X2, MODES_X2, type ModeX2 } from "@/lib/x2";

// Interrupteur du x2 (Admin) : arrêté / à blanc / réel, et comptes sur lesquels le mode réel agit.
export function ReglageX2({ mode, comptes }: { mode: ModeX2; comptes: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choisi, setChoisi] = useState<ModeX2>(mode);
  const [coches, setCoches] = useState<string[]>(comptes);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const modifie = choisi !== mode || coches.join() !== [...comptes].sort().join();

  function basculer(c: string) {
    setCoches((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c].sort()));
  }

  function appliquer() {
    setRetour(null);
    start(async () => {
      const res = await reglerX2(choisi, coches);
      setConfirmer(false);
      setRetour(res.ok ? { ok: true, texte: res.message } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  function valider() {
    if (choisi === "reel") setConfirmer(true);
    else appliquer();
  }

  return (
    <section className="space-y-2" aria-labelledby="titre-reglage-x2">
      <h2 id="titre-reglage-x2" className="section-label">Réglage</h2>
      <div className="card space-y-3 px-4 py-3.5">
        <p className="text-[13px] leading-snug text-fg-muted">{LIBELLES_X2[choisi].detail}</p>
        <div role="radiogroup" aria-label="Mode du x2" className="grid grid-cols-3 gap-2">
          {MODES_X2.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={m === choisi} disabled={pending}
              onClick={() => setChoisi(m)} className={`btn btn-sm ${m === choisi ? "btn-primary" : "btn-secondary"}`}>
              {LIBELLES_X2[m].titre}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-fg">Comptes sur lesquels le robot agit en mode réel</p>
          <div className="flex flex-wrap gap-1.5">
            {COMPTES_X2.map((c) => (
              <button key={c} type="button" aria-pressed={coches.includes(c)} disabled={pending} onClick={() => basculer(c)}
                className={`btn btn-sm min-w-[44px] ${coches.includes(c) ? "btn-primary" : "btn-secondary"}`}>
                {c}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-fg-muted">
            Le compte 01 n&apos;est jamais décidé par le robot (tu poses son x2 à la main ou depuis ici) ; coché, le robot
            applique seulement ce que tu demandes.
          </p>
        </div>
        <button type="button" disabled={pending || !modifie} onClick={valider} className="btn btn-primary w-full">
          {pending ? "…" : "Enregistrer"}
        </button>
        {retour && (
          <p className={`rounded-[10px] px-3 py-2 text-[13px] ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
            {retour.texte}
          </p>
        )}
      </div>

      {confirmer && (
        <div className="sheet-backdrop" onClick={() => setConfirmer(false)}>
          <div role="dialog" aria-modal="true" aria-label="Confirmer : x2 réel" className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="title-2">Activer le x2 en réel ?</h3>
            <p className="mt-1 text-sm text-fg-muted">
              Le robot posera et retirera de VRAIS x2 sur le site TTFL pour les comptes {coches.join(", ")}. Un x2 se pose une
              fois par mois et par compte. Commence par un seul compte et vérifie le résultat sur le site.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmer(false)} disabled={pending} className="btn btn-plain w-full">Annuler</button>
              <button onClick={appliquer} disabled={pending} className="btn btn-primary w-full">{pending ? "…" : "Confirmer"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
