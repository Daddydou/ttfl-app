"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pickPlayer } from "@/app/actions";
import type { Mode } from "@/lib/types";

export function PickButton({
  mode,
  pickDate,
  player,
  alreadyPicked,
  variant = "row",
}: {
  mode: Mode;
  pickDate: string;
  player: string;
  alreadyPicked: boolean;
  variant?: "primary" | "row";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doPick() {
    setError(null);
    start(async () => {
      const res = await pickPlayer(mode, pickDate, player);
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (alreadyPicked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-avail/15 px-3 py-1.5 text-sm font-semibold text-avail">
        ✓ Pické
      </span>
    );
  }

  if (variant === "primary") {
    return (
      <>
        <button
          onClick={() => setConfirming(true)}
          className="btn btn-primary w-full"
        >
          J&apos;ai pické {player.split(" ").slice(-1)[0]}
        </button>
        {confirming && (
          <ConfirmSheet
            player={player}
            pickDate={pickDate}
            pending={pending}
            error={error}
            onCancel={() => setConfirming(false)}
            onConfirm={doPick}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="btn btn-secondary btn-sm"
      >
        Picker
      </button>
      {confirming && (
        <ConfirmSheet
          player={player}
          pickDate={pickDate}
          pending={pending}
          error={error}
          onCancel={() => setConfirming(false)}
          onConfirm={doPick}
        />
      )}
    </>
  );
}

function ConfirmSheet({
  player,
  pickDate,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  player: string;
  pickDate: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="sheet-backdrop"
      onClick={onCancel}
    >
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="title-2">Confirmer le pick</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Enregistrer <span className="font-semibold text-fg">{player}</span>{" "}
          comme pick du {pickDate} ? Il sera bloqué par le cycle (régulière) ou
          consommé définitivement (playoffs).
        </p>
        {error && (
          <p className="mt-3 rounded-[10px] bg-out/10 px-3 py-2 text-sm text-out">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="btn btn-plain w-full"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="btn btn-primary w-full"
          >
            {pending ? "…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
