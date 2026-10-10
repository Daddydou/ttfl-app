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
    <div className="seg">
      {tabs.map((t) => (
        <Link
          key={t.mode}
          href={`${base}?mode=${t.mode}`}
          className={`seg-item ${current === t.mode ? "seg-item-on" : ""}`}
          aria-current={current === t.mode ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
