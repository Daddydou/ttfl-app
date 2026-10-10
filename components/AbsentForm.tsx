"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAbsent } from "@/app/actions";
import { Icon } from "@/components/ui/Icon";

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
        className="btn btn-secondary w-full"
      >
        <Icon name="plus" size={20} strokeWidth={2.2} />
        Ajouter un absent
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <input
        autoFocus
        value={player}
        onChange={(e) => setPlayer(e.target.value)}
        placeholder="Nom du joueur (ex. Jayson Tatum)"
        className="field w-full"
      />
      <div className="flex gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-[13px] text-fg-muted">Début</span>
          <input
            type="date"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="field w-full"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[13px] text-fg-muted">
            Fin <span className="text-fg-faint">(option.)</span>
          </span>
          <input
            type="date"
            value={fin}
            min={debut}
            onChange={(e) => setFin(e.target.value)}
            className="field w-full"
          />
        </label>
      </div>
      <input
        value={raison}
        onChange={(e) => setRaison(e.target.value)}
        placeholder="Raison (ex. repos annoncé en conférence)"
        className="field w-full"
      />
      {error && (
        <p className="rounded-[10px] bg-out/10 px-3 py-2 text-sm text-out">{error}</p>
      )}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="btn btn-plain w-full"
        >
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={pending || !player.trim()}
          className="btn btn-primary w-full"
        >
          {pending ? "…" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
