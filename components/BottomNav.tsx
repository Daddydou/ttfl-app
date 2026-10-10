"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type NomIcone } from "@/components/ui/Icon";

const TABS: { href: string; label: string; icon: NomIcone }[] = [
  { href: "/", label: "Accueil", icon: "accueil" },
  { href: "/ce-soir", label: "Conseillés", icon: "ballon" },
  { href: "/picks", label: "Mes picks", icon: "picks" },
  { href: "/stats", label: "Stats", icon: "stats" },
  { href: "/absents", label: "Absents", icon: "absents" },
  { href: "/admin", label: "Admin", icon: "reglages" },
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
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] px-0.5 text-[11px] font-semibold tracking-tight transition duration-200 ${
                active ? "bg-court-500/15 text-court-400" : "text-fg-muted active:bg-fill/60"
              }`}
            >
              <Icon name={tab.icon} size={24} strokeWidth={active ? 2.1 : 1.8} />
              <span className="leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
