import Link from "next/link";
import type { Mode } from "@/lib/types";

// Onglets régulière / playoffs, pilotés par ?mode= dans l'URL (server-friendly).
export function ModeTabs({
  base,
  current,
}: {
  base: string;
  current: Mode;
}) {
  const tabs: { mode: Mode; label: string }[] = [
    { mode: "regular", label: "Saison régulière" },
    { mode: "playoffs", label: "Playoffs" },
  ];
  return (
    <div className="flex gap-1 rounded-xl bg-ink-850 p-1">
      {tabs.map((t) => (
        <Link
          key={t.mode}
          href={`${base}?mode=${t.mode}`}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
            current === t.mode
              ? "bg-court-500 text-white"
              : "text-ink-600 active:text-white"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
