import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { NewRunNotifier } from "@/components/NewRunNotifier";
import { NotifyToggle } from "@/components/NotifyToggle";
import { Icon } from "@/components/ui/Icon";
import { modeLabel } from "@/lib/format";
import { signOut } from "@/app/login/actions";
import type { Mode } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Mode du dernier run, tous modes confondus : sert le badge de l'en-tête.
  const { data: lastRun } = await supabase
    .from("ttfl_latest_run")
    .select("mode")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mode = (lastRun?.mode as Mode) ?? "regular";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="pt-safe glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Accueil TTFL">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-court-500 text-on-accent">
              <Icon name="ballon" size={18} strokeWidth={2} />
            </span>
            <span className="text-[17px] font-bold tracking-tight text-fg">TTFL</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotifyToggle />
            <span
              className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${
                mode === "playoffs" ? "bg-court-500/15 text-court-400" : "bg-fill text-fg-muted"
              }`}
            >
              {modeLabel(mode)}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition active:bg-fill active:text-fg"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <Icon name="sortie" size={20} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 pt-3">{children}</main>

      <NewRunNotifier />

      <BottomNav />
    </div>
  );
}
