"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAbsent } from "@/app/actions";

export function AbsentForm({ today }: { today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [player, setPlayer] = useState("");
  const [debut, setDebut] = useState(today);
  const [fin, setFin] = useState("");
  const [raison, setRaison] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await addAbsent(player, debut, fin || null, raison || null);
      if (res.ok) {
        setPlayer("");
        setFin("");
        setRaison("");
        setDebut(today);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-ink-700 py-3.5 text-sm font-semibold text-ink-600 transition active:border-court-500 active:text-court-400"
      >
        + Ajouter un absent
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <input
        autoFocus
        value={player}
        onChange={(e) => setPlayer(e.target.value)}
        placeholder="Nom du joueur (ex. Jayson Tatum)"
        className="w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-white outline-none focus:border-court-500"
      />
      <div className="flex gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-ink-600">Début</span>
          <input
            type="date"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-white outline-none focus:border-court-500"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-ink-600">
            Fin <span className="text-ink-700">(option.)</span>
          </span>
          <input
            type="date"
            value={fin}
            min={debut}
            onChange={(e) => setFin(e.target.value)}
            className="w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-white outline-none focus:border-court-500"
          />
        </label>
      </div>
      <input
        value={raison}
        onChange={(e) => setRaison(e.target.value)}
        placeholder="Raison (ex. repos annoncé en conférence)"
        className="w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-white outline-none focus:border-court-500"
      />
      {error && (
        <p className="rounded-lg bg-out/10 px-3 py-2 text-sm text-out">{error}</p>
      )}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="flex-1 rounded-xl border border-ink-700 py-3 font-semibold text-ink-600 active:bg-ink-800 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={pending || !player.trim()}
          className="flex-1 rounded-xl bg-court-500 py-3 font-bold text-white active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "…" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
