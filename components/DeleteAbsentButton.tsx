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
        className="btn btn-plain btn-sm shrink-0"
      >
        De retour
      </button>
    );
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="btn btn-sm shrink-0 bg-avail/15 text-avail"
      aria-label={`Retirer ${player} des absents`}
    >
      {pending ? "…" : "Confirmer"}
    </button>
  );
}
