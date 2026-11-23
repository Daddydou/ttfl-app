"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { poserX2Comptes } from "@/app/(app)/admin/x2-actions";
import { aujourdhuiNY } from "@/lib/planning";
import { x2Possible } from "@/lib/x2";

// Bouton « ×2 » : pose le x2 du mois sur le pick DÉJÀ enregistré (sans changer de joueur), pour les comptes donnés.
// À mettre à côté d'un pick existant (« Pické », « Changer »). Deux temps : un premier appui arme, le second pose.
// Ne s'affiche pas pour une soirée passée ou hors de la saison du x2 ; le serveur revérifie tout.
export function BoutonX2Pick({ date, comptes }: { date: string; comptes: string[] }) {
  const router = useRouter();
  const [arme, setArme] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();
  if (comptes.length === 0 || !x2Possible(date, aujourdhuiNY())) return null;

  function agir() {
    if (!arme) {
      setRetour(null);
      setArme(true);
      return;
    }
    start(async () => {
      const res = await poserX2Comptes(date, comptes);
      setArme(false);
      setRetour(res.ok ? { ok: true, texte: res.message } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={agir}
        disabled={pending}
        aria-label={arme ? "Confirmer : poser le x2 sur ce pick" : "Poser le x2 sur ce pick"}
        title="Poser le x2 du mois sur ce pick (un seul par mois et par compte, déplacé s'il existe déjà)"
        className={arme ? "btn btn-sm bg-court-500/15 text-court-400" : "btn btn-plain btn-sm"}
      >
        {pending ? "…" : arme ? "Poser le x2 ?" : "×2"}
      </button>
      {retour && (
        <p
          role="status"
          className={`w-full rounded-[10px] px-3 py-2 text-left text-[13px] ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}
        >
          {retour.texte}
        </p>
      )}
    </>
  );
}
