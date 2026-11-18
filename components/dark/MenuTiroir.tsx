"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { retenirOrigine } from "@/lib/origine-entonnoir";
import TerrainDessine, { VUES } from "@/components/dark/TerrainDessine";

/**
 * MENU TIROIR — la navigation complète, façon guide de la série Dark (repris
 * de l'app Tennis).
 *
 * Un bouton « deux traits » en haut à gauche ouvre un panneau qui glisse
 * depuis la gauche, en sections accordéon : « Ce soir » (ouverte par défaut)
 * montre les écrans du soir en vignettes, chacune avec un morceau du terrain
 * dessiné ; « Analyse » et « Système » listent le reste. La barre d'onglets du
 * bas reste là pour le pouce.
 *
 * Accessibilité : vrai <dialog> modal (piège le focus, Échap ferme, le reste
 * de la page devient inerte), sections en <button aria-expanded>. Le panneau
 * se referme tout seul quand on change de page.
 */

type Vignette = { href: string; nom: string; meta: string; vue: string };

const VIGNETTES: Vignette[] = [
  { href: "/", nom: "Accueil", meta: "Ce soir", vue: VUES.centre },
  { href: "/ce-soir", nom: "Conseillés", meta: "Classement", vue: VUES.raquette },
  { href: "/picks", nom: "Mes picks", meta: "13 comptes", vue: VUES.troisPoints },
  { href: "/equipe", nom: "Équipe", meta: "Semaine", vue: VUES.lancer },
  { href: "/vainqueurs", nom: "Vainqueurs", meta: "Jeu KT", vue: VUES.corner },
  { href: "/stats", nom: "Stats", meta: "Saison", vue: VUES.entier },
];

const GROUPES: { cle: string; titre: string; liens: { href: string; label: string }[] }[] = [
  {
    cle: "analyse",
    titre: "Analyse",
    liens: [
      { href: "/stats", label: "Stats" },
      { href: "/stars", label: "Stars" },
      { href: "/adversaires", label: "Adversaires" },
      { href: "/absents", label: "Absents" },
    ],
  },
  {
    cle: "systeme",
    titre: "Système",
    liens: [
      { href: "/admin", label: "Admin" },
      { href: "/credits-photos", label: "Crédits photos" },
      { href: "/mode-operatoire", label: "Mode opératoire" },
      { href: "/plus", label: "Toutes les pages" },
    ],
  },
];

/** Accent à l'essai (site test) : lu et écrit dans localStorage + <html data-accent>. */
const ACCENTS = [
  { cle: "balle", nom: "Balle", detail: "comme Tennis", couleur: "#d7f25a" },
  { cle: "or", nom: "Or", detail: "TTFL actuel", couleur: "#d6b66e" },
  { cle: "ballon", nom: "Ballon", detail: "orange basket", couleur: "#ff914d" },
] as const;
type Accent = (typeof ACCENTS)[number]["cle"];

const ecouteurs = new Set<() => void>();
function lireAccent(): Accent {
  const a = document.documentElement.dataset.accent;
  return a === "or" || a === "ballon" ? a : "balle";
}
function choisirAccent(a: Accent) {
  if (a === "balle") delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = a;
  try {
    localStorage.setItem("ttfl-accent", a);
  } catch {
    /* navigation privée : le choix ne sera pas retenu */
  }
  ecouteurs.forEach((f) => f());
}

function actif(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function CarteVignette({ v, fermer }: { v: Vignette; fermer: () => void }) {
  const pathname = usePathname();
  const ici = actif(pathname, v.href);
  return (
    <Link
      href={v.href}
      aria-current={ici ? "page" : undefined}
      // La page s'ouvrira depuis cette vignette (lib/origine-entonnoir.ts) ; rien à faire si on y est déjà.
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (ici) return;
        const cadre = e.currentTarget.querySelector("[data-origine]");
        if (!cadre) return;
        retenirOrigine("vignette", cadre);
        // Le menu se range tout de suite : on voit le point lumineux attendre la page.
        fermer();
      }}
      className="group flex min-w-0 flex-col gap-1.5"
    >
      <span
        data-origine
        className={`relative block aspect-square overflow-hidden rounded-sm ring-1 transition ${
          ici ? "ring-court-500/80" : "ring-white/10 group-hover:ring-white/40"
        }`}
      >
        <TerrainDessine variante="plan" vue={v.vue} />
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" aria-hidden="true" />
        {ici && (
          <span className="animate-halo absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-court-500" aria-hidden="true" />
        )}
      </span>
      <span className={`truncate text-[12px] leading-tight ${ici ? "text-court-400" : "text-fg group-hover:text-white"}`}>
        {v.nom}
      </span>
      <span className="-mt-1 truncate text-[11px] leading-tight text-fg-muted">{v.meta}</span>
    </Link>
  );
}

function Section({
  titre,
  ouvert,
  basculer,
  children,
}: {
  titre: string;
  ouvert: boolean;
  basculer: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="border-b border-white/[0.08]">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={basculer}
        className="titre-espace flex min-h-16 w-full items-center justify-between px-8 text-[14px] text-fg transition hover:text-white"
      >
        <span>{titre}</span>
        <span aria-hidden="true" className="text-base font-light tracking-normal text-fg-muted">
          {ouvert ? "–" : "+"}
        </span>
      </button>
      <div id={id} hidden={!ouvert} className="px-8 pb-6">
        {children}
      </div>
    </div>
  );
}

export function MenuTiroir({ pied, haut }: { pied?: ReactNode; haut?: ReactNode }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  // Le menu est ouvert « sur une page » : changer de page le referme tout seul.
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const ouvert = ouvertSur === pathname;
  const setOuvert = (o: boolean) => setOuvertSur(o ? pathname : null);
  const [section, setSection] = useState<string | null>("soir");
  const accent = useSyncExternalStore(
    (f) => {
      ecouteurs.add(f);
      return () => ecouteurs.delete(f);
    },
    lireAccent,
    () => "balle" as Accent,
  );

  // Ouvre / ferme le vrai <dialog> (focus piégé et Échap fournis par le navigateur).
  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (ouvert && !d.open) d.showModal();
    if (!ouvert && d.open) d.close();
  }, [ouvert]);

  const basculer = (s: string) => setSection((x) => (x === s ? null : s));

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir le menu"
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-md transition hover:bg-white/5 active:scale-[0.97]"
      >
        <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true" className="stroke-fg">
          <path d="M0 1h22M0 11h22" strokeWidth="1.2" />
        </svg>
      </button>

      <dialog
        ref={dialogue}
        aria-label="Menu"
        onClose={() => setOuvert(false)}
        onClick={(e) => {
          // Un clic sur le voile (hors du panneau) referme.
          if (e.target === e.currentTarget) setOuvert(false);
        }}
        className="tiroir m-0 h-dvh max-h-none w-full max-w-md overflow-hidden border-r border-white/[0.08] bg-[#050607] p-0 text-fg open:flex open:flex-col"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3 pl-3">{haut}</div>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            aria-label="Fermer le menu"
            className="flex h-11 w-11 items-center justify-center rounded-md text-fg-muted transition hover:bg-white/5 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
              <path d="M3 3l14 14M17 3L3 17" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.08]">
          <Section titre="Ce soir" ouvert={section === "soir"} basculer={() => basculer("soir")}>
            <div className="cascade grid grid-cols-3 gap-4">
              {VIGNETTES.map((v) => (
                <CarteVignette key={v.href} v={v} fermer={() => setOuvert(false)} />
              ))}
            </div>
          </Section>
          {GROUPES.map((g) => (
            <Section key={g.cle} titre={g.titre} ouvert={section === g.cle} basculer={() => basculer(g.cle)}>
              <ul className="cascade">
                {g.liens.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={actif(pathname, l.href) ? "page" : undefined}
                      className="flex min-h-11 items-center text-[15px] text-fg/80 transition hover:text-white aria-[current=page]:text-court-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
          <Section titre="Apparence" ouvert={section === "apparence"} basculer={() => basculer("apparence")}>
            <p className="mb-3 text-[13px] leading-snug text-fg-muted">
              Couleur d&apos;accent (retenue sur cet appareil).
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.cle}
                  type="button"
                  onClick={() => choisirAccent(a.cle)}
                  aria-pressed={accent === a.cle}
                  className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-md text-[12px] ring-1 transition active:scale-[0.97] ${
                    accent === a.cle ? "text-fg ring-white/50" : "text-fg-muted ring-white/10 hover:ring-white/30"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: a.couleur, boxShadow: `0 0 12px 2px ${a.couleur}55` }} />
                  <span>{a.nom}</span>
                  <span className="text-[10px] text-fg-faint">{a.detail}</span>
                </button>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/[0.08] px-8 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {pied}
        </div>
      </dialog>
    </>
  );
}
