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

// Une seule rangée au lieu de deux (Saison/Playoffs + Planning/Historique) :
// saison régulière → Planning | Historique | Playoffs ; playoffs (pas de planning) → Saison régulière | Playoffs.
export function VueTabs({ courant }: { courant: ParamsPicks }) {
  const onglets: { id: string; label: string; href: string; on: boolean }[] =
    courant.mode === "regular"
      ? [
          { id: "planning", label: "Planning", href: hrefPicks({ ...courant, vue: "planning" }), on: courant.vue === "planning" },
          { id: "historique", label: "Historique", href: hrefPicks({ ...courant, vue: "historique" }), on: courant.vue === "historique" },
          { id: "playoffs", label: "Playoffs", href: hrefPicks({ ...courant, mode: "playoffs", vue: "historique" }), on: false },
        ]
      : [
          { id: "regular", label: "Saison régulière", href: hrefPicks({ ...courant, mode: "regular", vue: "planning" }), on: false },
          { id: "playoffs", label: "Playoffs", href: hrefPicks({ ...courant, vue: "historique" }), on: true },
        ];
  return (
    <div className="seg">
      {onglets.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          className={`${base} ${o.on ? actif : inactif}`}
          aria-current={o.on ? "page" : undefined}
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
    <div className="rail -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
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
