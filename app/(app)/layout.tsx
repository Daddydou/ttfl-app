import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { NewRunNotifier } from "@/components/NewRunNotifier";
import { NotifyToggle } from "@/components/NotifyToggle";
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
    .from("ttfl_runs")
    .select("mode")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mode = (lastRun?.mode as Mode) ?? "regular";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="pt-safe sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🏀</span>
            <span className="font-bold tracking-tight text-white">TTFL</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotifyToggle />
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                mode === "playoffs"
                  ? "bg-court-500/15 text-court-400"
                  : "bg-ink-700/60 text-ink-600"
              }`}
            >
              {modeLabel(mode)}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-ink-600 transition active:text-white"
                aria-label="Se déconnecter"
              >
                Quitter
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <NewRunNotifier />

      <BottomNav />
    </div>
  );
}
