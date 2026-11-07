"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Menu horizontal des sous-pages Stats (défile sur petit écran). Garde le mode choisi (?mode=) d'une page à l'autre.
export const SOUS_PAGES = [
  { href: "/stats", libelle: "Aperçu" },
  { href: "/stats/equipe", libelle: "Équipe" },
  { href: "/stats/mes-picks", libelle: "Mes picks" },
  { href: "/stats/strategie", libelle: "Stratégie" },
  { href: "/stats/adversaires", libelle: "Adversaires" },
  { href: "/stats/joueurs-nba", libelle: "Joueurs NBA" },
  { href: "/stats/vainqueurs", libelle: "Vainqueurs" },
  { href: "/stats/systeme", libelle: "Système" },
] as const;

export function StatsNav() {
  const chemin = usePathname();
  const mode = useSearchParams().get("mode");
  const suffixe = mode === "regular" || mode === "playoffs" ? `?mode=${mode}` : "";
  return (
    <nav aria-label="Sous-pages des stats" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex gap-2">
        {SOUS_PAGES.map((p) => {
          const actif = p.href === "/stats" ? chemin === "/stats" : chemin.startsWith(p.href);
          return (
            <li key={p.href} className="shrink-0">
              <Link href={`${p.href}${suffixe}`} className={`chip block ${actif ? "chip-on" : ""}`} aria-current={actif ? "page" : undefined}>
                {p.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
