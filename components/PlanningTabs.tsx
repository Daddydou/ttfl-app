import Link from "next/link";
import { ZONES, libelleMois, type ZoneId } from "@/lib/planning";
import type { Mode } from "@/lib/types";

// Paramètres d'URL de la page « Mes picks » (rendu serveur : tout passe par ?…).
export interface ParamsPicks {
  mode: Mode;
  vue: "planning" | "historique";
  zone: ZoneId;
  mois?: string; // YYYY-MM
}

export function hrefPicks(p: ParamsPicks): string {
  const q = new URLSearchParams({ mode: p.mode, vue: p.vue });
  if (p.vue === "planning") {
    q.set("zone", p.zone);
    if (p.mois) q.set("mois", p.mois);
  }
  return `/picks?${q.toString()}`;
}

const base = "flex-1 rounded-lg py-2 text-center text-sm font-semibold transition";
const actif = "bg-court-500 text-white";
const inactif = "text-ink-600 active:text-white";

// Planning (picks à l'avance, par soirée) / Historique (scores et stats du compte 1).
export function VueTabs({ courant }: { courant: ParamsPicks }) {
  const onglets: { vue: ParamsPicks["vue"]; label: string }[] = [
    { vue: "planning", label: "Planning" },
    { vue: "historique", label: "Historique" },
  ];
  return (
    <div className="flex gap-1 rounded-xl bg-ink-850 p-1">
      {onglets.map((o) => (
        <Link
          key={o.vue}
          href={hrefPicks({ ...courant, vue: o.vue })}
          className={`${base} ${courant.vue === o.vue ? actif : inactif}`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

// Compte 1 / Compte 2 / Équipe (10 comptes).
export function ZoneTabs({ courant }: { courant: ParamsPicks }) {
  return (
    <div className="flex gap-1 rounded-xl bg-ink-850 p-1">
      {ZONES.map((z) => (
        <Link
          key={z.id}
          href={hrefPicks({ ...courant, vue: "planning", zone: z.id })}
          className={`${base} ${courant.zone === z.id ? actif : inactif}`}
        >
          {z.label}
        </Link>
      ))}
    </div>
  );
}

// Un onglet par mois ; défilement horizontal si la saison s'allonge.
export function MoisTabs({ courant, mois }: { courant: ParamsPicks; mois: string[] }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {mois.map((m) => (
        <Link
          key={m}
          href={hrefPicks({ ...courant, vue: "planning", mois: m })}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
            courant.mois === m
              ? "bg-court-500 text-white"
              : "border border-ink-700 text-ink-600 active:text-white"
          }`}
        >
          {libelleMois(m)}
        </Link>
      ))}
    </div>
  );
}
