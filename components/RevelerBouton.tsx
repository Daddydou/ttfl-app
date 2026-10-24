"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revelerSoiree } from "@/app/(app)/secret/actions";

// « Révéler maintenant » : force la révélation du pick du compte secret pour une soirée. Deux clics (le second
// confirme), pour qu'un geste malheureux au pouce ne gâche pas le secret.
// `discret` : bouton gris (Accueil), pour ne pas tenter le pouce juste avant le lock.
export function RevelerBouton({
  soiree,
  libelle = "Révéler maintenant",
  discret = false,
}: {
  soiree: string;
  libelle?: string;
  discret?: boolean;
}) {
  const router = useRouter();
  const [arme, setArme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reveler() {
    setErreur(null);
    start(async () => {
      const res = await revelerSoiree(soiree);
      setArme(false);
      if (res.ok) router.refresh();
      else setErreur(res.error);
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {!arme ? (
        <button type="button" onClick={() => setArme(true)} className={`btn btn-sm ${discret ? "btn-plain" : "btn-secondary"}`}>
          {libelle}
        </button>
      ) : (
        <>
          <button type="button" onClick={reveler} disabled={pending} className="btn btn-primary btn-sm">
            {pending ? "…" : "Oui, révéler"}
          </button>
          <button type="button" onClick={() => setArme(false)} disabled={pending} className="btn btn-plain btn-sm">
            Annuler
          </button>
        </>
      )}
      {erreur && <span className="text-[13px] text-out">{erreur}</span>}
    </span>
  );
}
