import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuestionablesProvider } from "@/components/BadgeQuestionable";
import { lireQuestionables } from "@/lib/questionables";
import { BottomNav } from "@/components/BottomNav";
import { NewRunNotifier } from "@/components/NewRunNotifier";
import { NotifyToggle } from "@/components/NotifyToggle";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Icon } from "@/components/ui/Icon";
import { MenuTiroir } from "@/components/dark/MenuTiroir";
import { IntroOuverture } from "@/components/dark/IntroOuverture";
import { modeLabel } from "@/lib/format";
import { signOut } from "@/app/login/actions";
import type { Mode } from "@/lib/types";

// Badge du mode (Saison régulière / Playoffs) : lu à part pour que l'en-tête et la page s'affichent tout de suite
// (la requête n'est plus sur le chemin de l'affichage ; un emplacement vide le remplace pendant la lecture).
async function ModeBadge() {
  const supabase = await createClient();

  // Mode du dernier run, tous modes confondus.
  const { data: lastRun } = await supabase
    .from("ttfl_latest_run")
    .select("mode")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mode = (lastRun?.mode as Mode) ?? "regular";

  return (
    <span
      className={`titre-espace rounded-full px-3 py-1 text-[10px] ring-1 ${
        mode === "playoffs" ? "text-court-400 ring-court-500/50" : "text-fg-muted ring-white/15"
      }`}
    >
      {modeLabel(mode)}
    </span>
  );
}

/** « 2026-27 » : une saison NBA commence en octobre. */
function saisonEnCours(d = new Date()): string {
  const an = d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${an}-${String(an + 1).slice(2)}`;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Statuts Questionable des prochaines soirées : lus sans bloquer l'affichage (chaque pastille attend dans son <Suspense>).
  const questionables = createClient().then(lireQuestionables).catch(() => [] as string[]);
  return (
    <QuestionablesProvider promesse={questionables}>
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <IntroOuverture saison={saisonEnCours()} />
      {/* Barre du haut transparente (comme Tennis) : le menu à gauche, le nom au centre,
          le ballon (accueil) à droite. Les bandeaux de l'accueil glissent dessous. */}
      <header className="pt-safe relative z-30">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center px-2">
          <MenuTiroir
            haut={
              <Suspense fallback={<span className="inline-block h-[22px] w-[110px] rounded-full ring-1 ring-white/10" aria-hidden="true" />}>
                <ModeBadge />
              </Suspense>
            }
            pied={
              <>
                <Link href="/mode-operatoire" className="titre-espace inline-flex min-h-11 items-center text-[11px] text-fg/80 hover:text-white">
                  Aide
                </Link>
                <NotifyToggle />
                <form action={signOut}>
                  <button
                    type="submit"
                    className="titre-espace inline-flex min-h-11 items-center text-[11px] text-fg/80 transition hover:text-white"
                  >
                    Déconnexion
                  </button>
                </form>
              </>
            }
          />
          <Link
            href="/"
            aria-label="Accueil TTFL"
            className="titre-espace justify-self-center pl-[0.6em] text-[14px] tracking-[0.6em] text-fg transition hover:text-white"
          >
            TTFL
          </Link>
          <Link
            href="/"
            aria-label="Accueil"
            className="flex h-11 w-11 items-center justify-center rounded-md text-fg/80 transition hover:bg-white/5"
          >
            <Icon name="ballon" size={26} strokeWidth={1} />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 pt-1">{children}</main>

      <NewRunNotifier />
      <PullToRefresh />

      <BottomNav />
    </div>
    </QuestionablesProvider>
  );
}
