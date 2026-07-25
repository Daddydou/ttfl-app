"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAbsent } from "@/app/actions";

// Suppression = le joueur est de retour. Confirmation en deux temps.
export function DeleteAbsentButton({
  id,
  player,
}: {
  id: number;
  player: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const res = await deleteAbsent(id);
      if (res.ok) router.refresh();
      else setArmed(false);
    });
  }

  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        className="shrink-0 rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-medium text-ink-600 transition active:border-avail active:text-avail"
      >
        De retour
      </button>
    );
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="shrink-0 rounded-lg bg-avail/15 px-3 py-1.5 text-xs font-semibold text-avail disabled:opacity-50"
      aria-label={`Retirer ${player} des absents`}
    >
      {pending ? "…" : "Confirmer"}
    </button>
  );
}
