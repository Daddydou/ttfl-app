import { createClient } from "@/lib/supabase/server";
import { AbsentForm } from "@/components/AbsentForm";
import { DeleteAbsentButton } from "@/components/DeleteAbsentButton";
import { frDate, todayISO } from "@/lib/format";
import type { TtflManualAbsent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Absents — TTFL" };

export default async function AbsentsPage() {
  const supabase = createClient();
  const today = todayISO();

  const { data: absents } = await supabase
    .from("ttfl_manual_absents")
    .select("*")
    .order("date_debut", { ascending: false })
    .returns<TtflManualAbsent[]>();

  const rows = absents ?? [];
  // Un absent est "actif" si la date du jour est dans [début, fin].
  const isActive = (a: TtflManualAbsent) =>
    a.date_debut <= today && (!a.date_fin || today <= a.date_fin);
  const active = rows.filter(isActive);
  const scheduled = rows.filter((a) => !isActive(a));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-800 bg-ink-850/60 px-4 py-3">
        <p className="text-xs leading-relaxed text-ink-600">
          Ces absents sont pris en compte au{" "}
          <span className="font-semibold text-white">
            prochain calcul du PC
          </span>{" "}
          (ils sont exclus du classement). Sers-t&apos;en pour ce que
          l&apos;injury report ne porte pas encore : repos annoncé, blessure
          tardive, joueur écarté.
        </p>
      </div>

      <AbsentForm today={today} />

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-600">
          Absents en cours ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-8 text-center text-sm text-ink-600">
            Aucun absent manuel actif.
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((a) => (
              <AbsentRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {scheduled.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-600">
            Programmés / passés ({scheduled.length})
          </h2>
          <div className="space-y-2 opacity-70">
            {scheduled.map((a) => (
              <AbsentRow key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AbsentRow({ a }: { a: TtflManualAbsent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white">{a.player}</div>
        <div className="text-xs text-ink-600">
          {frDate(a.date_debut)}
          {a.date_fin ? ` → ${frDate(a.date_fin)}` : " → sans fin"}
          {a.raison ? ` · ${a.raison}` : ""}
        </div>
      </div>
      <DeleteAbsentButton id={a.id} player={a.player} />
    </div>
  );
}
