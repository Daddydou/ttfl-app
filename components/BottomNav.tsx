"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type NomIcone } from "@/components/ui/Icon";

// 5 onglets (limite iOS) : les usages du soir d'abord ; Stats, Admin et Mode op. sont rangés dans « Plus ».
// `aussi` : sous-pages rattachées à l'onglet (on garde sa place en y entrant).
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

// Barre d'onglets flottante en verre dépoli (façon iOS récent).
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="glass pointer-events-auto mx-auto flex max-w-md items-stretch rounded-[28px] p-1.5"
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : [tab.href, ...(tab.aussi ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
          // Largeurs égales, mais un libellé n'est jamais coupé ni replié (nowrap) :
          // un onglet au mot long s'élargit. Sous 360 px seulement, repli en « … ».
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] flex-1 flex-col max-[359px]:min-w-0 items-center justify-center gap-0.5 rounded-[22px] px-0.5 text-[11px] font-semibold tracking-tight transition duration-200 ${
                active ? "bg-court-500/15 text-court-400" : "text-fg-muted active:bg-fill/60"
              }`}
            >
              <Icon name={tab.icon} size={24} strokeWidth={active ? 2.1 : 1.8} />
              <span className="max-w-full truncate whitespace-nowrap leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
