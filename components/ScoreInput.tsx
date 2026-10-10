"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setScore } from "@/app/actions";

// Saisie / correction du score réel d'un pick. Enregistre au blur ou à Entrée.
export function ScoreInput({
  pickId,
  score,
}: {
  pickId: number;
  score: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(score?.toString() ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function commit() {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Math.round(Number(trimmed));
    if (trimmed !== "" && Number.isNaN(next)) return;
    if (next === score) return;

    start(async () => {
      const res = await setScore(pickId, next);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
        className={`field !w-[72px] !px-2 !py-2 text-center font-semibold num ${saved ? "!border-avail" : ""} ${pending ? "opacity-60" : ""}`}
      />
      <span className="text-[13px] text-fg-muted">pts</span>
    </div>
  );
}
