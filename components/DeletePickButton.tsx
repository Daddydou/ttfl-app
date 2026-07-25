"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePick } from "@/app/actions";

// Suppression d'un pick (erreur de saisie). Confirmation en un tap-and-hold léger
// via un second clic, pour éviter les suppressions accidentelles au pouce.
export function DeletePickButton({
  pickId,
  player,
}: {
  pickId: number;
  player: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const res = await deletePick(pickId);
      if (res.ok) router.refresh();
      else setArmed(false);
    });
  }

  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        aria-label={`Supprimer le pick ${player}`}
        className="shrink-0 rounded-lg px-2 py-1.5 text-ink-600 transition active:text-out"
      >
        ✕
      </button>
    );
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="shrink-0 rounded-lg bg-out/15 px-2 py-1.5 text-xs font-semibold text-out disabled:opacity-50"
    >
      {pending ? "…" : "Supprimer ?"}
    </button>
  );
}
