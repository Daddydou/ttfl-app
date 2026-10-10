import { createClient } from "@/lib/supabase/server";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { CarteConseille } from "@/components/CarteConseille";
import { JoursConseilles, ZonesConseilles } from "@/components/ConseillesNav";
import { chargerSoiree } from "@/lib/conseilles-data";
import {
  construireConseilles,
  fusionnerSoiree,
  joursProposes,
  nbMatchs,
  type Masque,
} from "@/lib/conseilles";
import { frDate } from "@/lib/format";
import {
  JOURS_CYCLE,
  ajouterJours,
  aujourdhuiNY,
  normaliserNom,
  zoneDe,
  type Nuit,
  type PickLigne,
} from "@/lib/planning";
import type { Mode, TtflManualAbsent, TtflRun } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Picks conseillés — TTFL" };

const RAISONS: Record<Masque["raison"], string> = {
  cycle: "déjà pické à ≤ 30 jours",
  absent: "absent (saisi à la main)",
  out: "annoncé Out",
};

function jourComplet(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export default async function PicksConseillesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; pour?: string }>;
}) {
  const { date: dateParam, pour } = await searchParams;
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const zone = zoneDe(pour);

  const { data: dernier } = await supabase
    .from("ttfl_latest_run")
    .select("*")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle<TtflRun>();
  const mode: Mode = dernier?.mode ?? "regular";

  const { data: nuits } = await supabase.from("ttfl_nuits").select("*").eq("mode", mode).returns<Nuit[]>();
  let jours = joursProposes(nuits ?? [], aujourdhui);
  // Aucune soirée à venir connue : on retombe sur le dernier classement poussé, signalé comme ancien.
  const ancien = jours.length === 0 && !!dernier;
  if (ancien && dernier) jours = [dernier.game_date];
  if (jours.length === 0) return <AucunCalcul />;

  const date = dateParam && jours.includes(dateParam) ? dateParam : jours[0];

  const [soiree, picksRes, absentsRes] = await Promise.all([
    chargerSoiree(supabase, mode, date),
    supabase
      .from("ttfl_picks")
      .select("pick_date,player,compte")
      .eq("mode", mode)
      .in("compte", zone.comptes)
      .gte("pick_date", ajouterJours(date, -JOURS_CYCLE))
      .lte("pick_date", ajouterJours(date, JOURS_CYCLE))
      .returns<PickLigne[]>(),
    supabase.from("ttfl_manual_absents").select("*").returns<TtflManualAbsent[]>(),
  ]);

  const picks = picksRes.data ?? [];
  const lignes = fusionnerSoiree(soiree.avance, soiree.soir);
  const { conseilles, masques } = construireConseilles({
    lignes,
    comptes: zone.comptes,
    picks,
    absents: absentsRes.data ?? [],
    date,
  });
  const cotesParJoueur = new Map(soiree.cotes.map((c) => [c.player, c]));
  const pickeSurTous = (joueur: string, comptes: string[]) =>
    comptes.length > 0 &&
    comptes.every((c) =>
      picks.some((p) => p.pick_date === date && p.compte === c && normaliserNom(p.player) === normaliserNom(joueur)),
    );

  const matchs = nbMatchs(lignes);
  const erreur = soiree.erreur ?? picksRes.error?.message ?? null;

  return (
    <div className="space-y-4">
      <RealtimeRuns />

      <header>
        <h1 className="text-xl font-extrabold text-white">Picks conseillés</h1>
        <p className="mt-0.5 text-sm text-ink-600">
          <span className="font-semibold capitalize text-white">{jourComplet(date)}</span>
          {matchs > 0 ? ` · ${matchs} match${matchs > 1 ? "s" : ""}` : ""}
        </p>
      </header>

      <JoursConseilles jours={jours} courant={date} pour={zone.id} aujourdhui={aujourdhui} />
      <ZonesConseilles courant={zone.id} date={date} />

      {ancien && (
        <div className="rounded-xl border border-quest/40 bg-quest/10 px-4 py-3">
          <p className="text-sm font-semibold text-quest">Aucun calcul pour ce soir</p>
          <p className="mt-0.5 text-xs text-quest/80">
            Lance le push sur ton PC. Ci-dessous, le dernier classement connu ({frDate(date)}).
          </p>
        </div>
      )}

      {soiree.runSoir ? (
        <FreshnessBanner computedAt={soiree.runSoir.computed_at} injuryFresh={soiree.runSoir.injury_report_fresh} />
      ) : (
        <p className="rounded-xl bg-quest/10 px-3 py-2 text-xs text-quest">
          Projections calculées à l&apos;avance : les blessures ne sont pas encore connues. Le classement du soir (avec
          les blessures) les remplace le jour J.
        </p>
      )}

      {erreur && <p className="rounded-xl bg-out/10 px-3 py-2 text-xs text-out">{erreur}</p>}

      {conseilles.length === 0 ? (
        <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-white">Aucun joueur à conseiller pour cette soirée.</p>
          <p className="mt-1 text-xs text-ink-600">
            Pas de projection pour {frDate(date)}, ou tous les joueurs sont déjà pickés ou absents.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conseilles.map((c) => (
            <CarteConseille
              key={c.player}
              c={c}
              mode={mode}
              date={date}
              zoneLabel={zone.label}
              cotes={cotesParJoueur.get(c.player)}
              picke={pickeSurTous(c.player, c.comptesLibres)}
            />
          ))}
        </div>
      )}

      {masques.length > 0 && (
        <details className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-ink-600">
            {masques.length} joueur{masques.length > 1 ? "s" : ""} masqué{masques.length > 1 ? "s" : ""} (déjà pickés,
            absents ou Out)
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-ink-600">
            {masques.map((m) => (
              <li key={m.player} className="flex justify-between gap-2">
                <span className="truncate text-white">{m.player}</span>
                <span className="shrink-0">{RAISONS[m.raison]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="px-1 text-xs text-ink-600">
        Classement pour {zone.label.toLowerCase()} : les joueurs pickés à {JOURS_CYCLE} jours ou moins (passé comme futur) et
        les absents n&apos;apparaissent pas.
      </p>
    </div>
  );
}

function AucunCalcul() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 text-5xl">🏀</div>
      <h1 className="text-xl font-bold text-white">Aucun calcul pour ce soir</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-600">
        Lance le push sur ton PC pour voir apparaître les picks conseillés ici :
      </p>
      <code className="mt-3 rounded-lg bg-ink-850 px-3 py-2 text-xs text-court-400">python push_to_supabase.py</code>
    </div>
  );
}
