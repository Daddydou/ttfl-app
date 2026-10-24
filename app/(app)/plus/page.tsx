import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type NomIcone } from "@/components/ui/Icon";

export const metadata = { title: "Plus — TTFL" };

// Onglet « Plus » : tout ce qui ne sert pas chaque soir, en liste façon Réglages d'iOS.
const GROUPES: { titre: string; lignes: { href: string; titre: string; detail: string; icone: NomIcone }[] }[] = [
  {
    titre: "Analyse",
    lignes: [
      { href: "/stats", titre: "Stats", detail: "Scores, moyenne, toi vs les repères", icone: "stats" },
      { href: "/stars", titre: "Stars", detail: "Joueurs bloqués par le cycle de 30 jours", icone: "trophee" },
      { href: "/adversaires", titre: "Adversaires", detail: "Classement et picks des joueurs suivis", icone: "picks" },
      { href: "/absents", titre: "Absents", detail: "Joueurs exclus du calcul", icone: "absents" },
    ],
  },
  {
    titre: "Équipe",
    lignes: [{ href: "/equipe", titre: "Semaine équipe", detail: "Picks des 10 comptes, soir par soir", icone: "ballon" }],
  },
  {
    titre: "Système",
    lignes: [
      { href: "/admin", titre: "Admin", detail: "Santé, actions, secret, cookies, notifications", icone: "reglages" },
      { href: "/mode-operatoire", titre: "Mode opératoire", detail: "Que faire, quand, pas à pas", icone: "livre" },
    ],
  },
];

export default function PlusPage() {
  return (
    <div className="space-y-6">
      <PageHeader titre="Plus" />
      {GROUPES.map((g) => (
        <section key={g.titre} aria-labelledby={`plus-${g.titre}`}>
          <h2 id={`plus-${g.titre}`} className="section-label mb-2">
            {g.titre}
          </h2>
          <ul className="card overflow-hidden">
            {g.lignes.map((l) => (
              <li key={l.href} className="list-row !p-0">
                <Link href={l.href} className="flex w-full items-center gap-3 px-4 py-3 active:bg-fill/60">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-fill text-fg">
                    <Icon name={l.icone} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-fg">{l.titre}</span>
                    <span className="block truncate text-[13px] text-fg-muted">{l.detail}</span>
                  </span>
                  <Icon name="chevron" size={16} className="shrink-0 text-fg-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
