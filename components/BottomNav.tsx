"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type NomIcone } from "@/components/ui/Icon";
import { retenirOrigine } from "@/lib/origine-entonnoir";

// 5 onglets (limite iOS) : les usages du soir d'abord ; Stats, Admin et Mode op. sont rangés dans « Plus »
// (et dans le menu ☰ en haut à gauche). `aussi` : sous-pages rattachées à l'onglet.
const TABS: { href: string; label: string; icon: NomIcone; aussi?: string[] }[] = [
  { href: "/", label: "Accueil", icon: "accueil" },
  { href: "/ce-soir", label: "Conseillés", icon: "ballon" },
  { href: "/picks", label: "Mes picks", icon: "picks", aussi: ["/equipe"] },
  { href: "/vainqueurs", label: "Vainqueurs", icon: "trophee" },
  {
    href: "/plus",
    label: "Plus",
    icon: "autres",
    aussi: ["/stats", "/stars", "/adversaires", "/absents", "/admin", "/mode-operatoire"],
  },
];

// Barre d'onglets « Dark » : bande noire translucide, filet d'un pixel en haut, libellés en capitales
// fines espacées ; l'onglet actif porte un point lumineux qui respire. Un toucher retient ce point :
// la page suivante « sort » de lui (Entonnoir, comme les onglets d'un tournoi dans l'app Tennis).
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#050607]/80 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-md items-stretch px-1">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : [tab.href, ...(tab.aussi ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                if (active || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                const point = e.currentTarget.querySelector("[data-origine]");
                if (point) retenirOrigine("onglet", point, true);
              }}
              className={`group relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 px-0.5 transition duration-200 max-[359px]:min-w-0 ${
                active ? "text-court-400" : "text-fg-muted active:text-fg"
              }`}
            >
              <span
                data-origine
                aria-hidden="true"
                className={`absolute left-1/2 top-0 h-px -translate-x-1/2 transition-all duration-500 ${
                  active ? "w-8 bg-court-500 shadow-[0_0_12px_2px_rgb(var(--c-accent)/0.5)]" : "w-0 bg-transparent"
                }`}
              />
              <Icon name={tab.icon} size={22} strokeWidth={active ? 1.5 : 1.2} />
              <span className="titre-espace max-w-full truncate whitespace-nowrap pl-[0.12em] text-[9px] font-normal leading-none tracking-[0.12em]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
