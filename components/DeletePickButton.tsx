"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePick } from "@/app/actions";
import { Icon } from "@/components/ui/Icon";

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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition active:bg-out/10 active:text-out"
      >
        <Icon name="fermer" size={18} strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="shrink-0 rounded-full bg-out/15 px-3 py-1.5 text-[13px] font-semibold text-out disabled:opacity-50"
    >
      {pending ? "…" : "Supprimer ?"}
    </button>
  );
}
