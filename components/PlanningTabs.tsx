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

const base = "seg-item";
const actif = "seg-item-on";
const inactif = "";

// Planning (picks à l'avance, par soirée) / Historique (scores et stats du compte 1).
export function VueTabs({ courant }: { courant: ParamsPicks }) {
  const onglets: { vue: ParamsPicks["vue"]; label: string }[] = [
    { vue: "planning", label: "Planning" },
    { vue: "historique", label: "Historique" },
  ];
  return (
    <div className="seg">
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
    <div className="seg">
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
          className={`chip ${courant.mois === m ? "chip-on" : ""}`}
        >
          {libelleMois(m)}
        </Link>
      ))}
    </div>
  );
}
