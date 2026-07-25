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
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-avail/15 px-3 py-1.5 text-sm font-semibold text-avail">
        ✓ Pické
      </span>
    );
  }

  if (variant === "primary") {
    return (
      <>
        <button
          onClick={() => setConfirming(true)}
          className="w-full rounded-xl bg-court-500 py-3.5 text-base font-bold text-white shadow-lg shadow-court-600/25 transition active:scale-[0.98]"
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
        className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-medium text-ink-600 transition active:border-court-500 active:text-court-400"
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-ink-800 bg-ink-900 p-5 pb-8 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white">Confirmer le pick</h3>
        <p className="mt-1 text-sm text-ink-600">
          Enregistrer <span className="font-semibold text-white">{player}</span>{" "}
          comme pick du {pickDate} ? Il sera bloqué par le cycle (régulière) ou
          consommé définitivement (playoffs).
        </p>
        {error && (
          <p className="mt-3 rounded-lg bg-out/10 px-3 py-2 text-sm text-out">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-xl border border-ink-700 py-3 font-semibold text-ink-600 active:bg-ink-800 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 rounded-xl bg-court-500 py-3 font-bold text-white active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
