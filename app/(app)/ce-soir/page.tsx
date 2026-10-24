import { createClient } from "@/lib/supabase/server";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { CarteConseille } from "@/components/CarteConseille";
import { PourquoiPick } from "@/components/PourquoiPick";
import { JoursConseilles, ZonesConseilles } from "@/components/ConseillesNav";
import { PlanTrenteJours } from "@/components/PlanTrenteJours";
import { SuiviFormules } from "@/components/SuiviFormules";
import type { LigneSuivi } from "@/lib/suivi-formules";
import { chargerSoiree } from "@/lib/conseilles-data";
import { chargerCaptures } from "@/lib/captures";
import { BandeauSecret } from "@/components/BandeauSecret";
import { RevelerBouton } from "@/components/RevelerBouton";
import { chargerSecret, heureCloture, masquerLignes, soireeSecrete, soireesSecretes } from "@/lib/secret";
import { maintenantMs, type TtflPlan30 } from "@/lib/plan30";
import {
  construireConseilles,
  fusionnerSoiree,
  joursProposes,
  nbMatchs,
  type Masque,
} from "@/lib/conseilles";
import { frDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
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

  // Plan glissant de 30 jours : seulement pour les comptes 01 et 02, pas pour la zone « Équipe ».
  const avecPlan = zone.id === "c01" || zone.id === "c02" || zone.id === "c13";
  const compteAuto = zone.id === "c02" || zone.id === "c13"; // comptes gérés par le robot (verrou « validé à la main »)

  const [soiree, picksRes, absentsRes, planRes, verrousRes, suiviRes, secret, capturesBrutes] = await Promise.all([
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
    avecPlan
      ? supabase.from("ttfl_plan30").select("*").eq("compte", zone.comptes[0]).returns<TtflPlan30[]>()
      : Promise.resolve({ data: [] as TtflPlan30[], error: null }),
    // « Picks manuels validés » des comptes 02 et 13 (rien ne les remplace) et suivi des formules (comptes virtuels du PC).
    compteAuto
      ? supabase
          .from("ttfl_verrous_pick")
          .select("pick_date,joueur")
          .eq("compte", zone.comptes[0])
          .gte("pick_date", aujourdhui)
          .returns<{ pick_date: string; joueur: string }[]>()
      : Promise.resolve({ data: [] as { pick_date: string; joueur: string }[], error: null }),
    avecPlan
      ? supabase
          .from("ttfl_plan30_suivi")
          .select("profil,pick_date,joueur,projection,score_reel")
          .order("pick_date")
          .returns<LigneSuivi[]>()
      : Promise.resolve({ data: [] as LigneSuivi[], error: null }),
    chargerSecret(supabase, aujourdhui),
    avecPlan ? chargerCaptures(supabase) : Promise.resolve([] as Awaited<ReturnType<typeof chargerCaptures>>),
  ]);
  const nowMs = maintenantMs();
  // Pick secret du compte 02 : tout ce qui trahirait son joueur (picks, cycle, plan, verrous, suivi, captures) est
  // retiré tant que la soirée n'est ni close, ni révélée (lib/secret.ts).
  const estSecret = (compte: string, d: string) => soireeSecrete(secret, compte, d, aujourdhui, nowMs);
  const captures = avecPlan ? masquerLignes(capturesBrutes, secret, aujourdhui, nowMs) : [];
  const verrous = Object.fromEntries(
    (verrousRes.data ?? [])
      .filter((v) => !estSecret(zone.comptes[0], String(v.pick_date).slice(0, 10)))
      .map((v) => [String(v.pick_date).slice(0, 10), v.joueur]),
  );
  const suiviVisible = (suiviRes.data ?? []).filter(
    (l) => !(l.profil === secret.profil && estSecret(secret.compte, String(l.pick_date).slice(0, 10))),
  );

  const picks = masquerLignes(picksRes.data ?? [], secret, aujourdhui, nowMs);
  // Le plan du compte secret : on ne garde que les soirées révélées ; s'il n'en reste aucune, un cadenas remplace le plan.
  const planSecret = zone.comptes.includes(secret.compte) && secret.actif;
  const plansVisibles = (planRes.data ?? [])
    .filter((p) => p.compte === zone.comptes[0])
    .map((p) => (planSecret ? { ...p, jours: p.jours.filter((j) => !estSecret(secret.compte, j.date)) } : p));
  const planCache = planSecret && plansVisibles.length > 0 && plansVisibles.every((p) => p.jours.length === 0);
  const datesSecretes = zone.comptes.includes(secret.compte) ? soireesSecretes(secret, jours, aujourdhui, nowMs) : [];
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

      <PageHeader
        titre="Picks conseillés"
        sousTitre={
          <>
            <span className="font-semibold capitalize text-fg">{jourComplet(date)}</span>
            {matchs > 0 ? ` · ${matchs} match${matchs > 1 ? "s" : ""}` : ""}
          </>
        }
      />

      <JoursConseilles jours={jours} courant={date} pour={zone.id} aujourdhui={aujourdhui} />
      <ZonesConseilles courant={zone.id} date={date} />

      <BandeauSecret etat={secret} dates={datesSecretes} />

      {avecPlan && planCache && (
        <section className="card space-y-2 px-4 py-4" aria-label="Plan 30 jours caché">
          <p className="section-label">Plan 30 jours · Compte {secret.compte}</p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-court-400">
            <Icon name="cadenas" size={15} strokeWidth={2} className="shrink-0" />
            Plan caché : il montrerait le pick secret
          </p>
          <p className="text-[13px] text-fg-muted">
            Chaque soirée du plan se dévoile à sa clôture{heureCloture(secret, jours[0]) ? ` (ce soir : ${heureCloture(secret, jours[0])}, heure de Paris)` : ""}.
            Le robot continue de poser le pick comme d&apos;habitude.
          </p>
          <RevelerBouton soiree={jours[0]} libelle="Révéler le plan de ce soir" />
        </section>
      )}

      {avecPlan && !planCache && (
        <PlanTrenteJours
          plans={plansVisibles}
          compte={zone.comptes[0]}
          zoneLabel={zone.label}
          mode={mode}
          aujourdhui={aujourdhui}
          maintenantMs={maintenantMs()}
          verrous={verrous}
          captures={captures}
        />
      )}
      {avecPlan && <SuiviFormules lignes={suiviVisible} />}

      {ancien && (
        <div className="rounded-[20px] bg-quest/10 px-4 py-3">
          <p className="text-sm font-semibold text-quest">Aucun calcul pour ce soir</p>
          <p className="mt-0.5 text-[13px] text-quest/80">
            Lance le push sur ton PC. Ci-dessous, le dernier classement connu ({frDate(date)}).
          </p>
        </div>
      )}

      {soiree.runSoir ? (
        <FreshnessBanner computedAt={soiree.runSoir.computed_at} injuryFresh={soiree.runSoir.injury_report_fresh} />
      ) : (
        <p className="rounded-[14px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
          Projections calculées à l&apos;avance : les blessures ne sont pas encore connues. Le classement du soir (avec
          les blessures) les remplace le jour J.
        </p>
      )}

      {erreur && <p className="rounded-[14px] bg-out/10 px-3 py-2 text-[13px] text-out">{erreur}</p>}

      {conseilles.length === 0 ? (
        <div className="card px-4 py-8 text-center">
          <p className="text-sm font-semibold text-fg">Aucun joueur à conseiller pour cette soirée.</p>
          <p className="mt-1 text-[13px] text-fg-muted">
            Pas de projection pour {frDate(date)}, ou tous les joueurs sont déjà pickés ou absents.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conseilles.length >= 2 && <PourquoiPick n1={conseilles[0]} n2={conseilles[1]} />}
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
        <details className="card px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-medium text-fg-muted">
            {masques.length} joueur{masques.length > 1 ? "s" : ""} masqué{masques.length > 1 ? "s" : ""} (déjà pickés,
            absents ou Out)
          </summary>
          <ul className="mt-2 space-y-1 text-[13px] text-fg-muted">
            {masques.map((m) => (
              <li key={m.player} className="flex justify-between gap-2">
                <span className="truncate text-fg">{m.player}</span>
                <span className="shrink-0">{RAISONS[m.raison]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="px-1 text-[13px] text-fg-muted">
        Classement pour {zone.label.toLowerCase()} : les joueurs pickés à {JOURS_CYCLE} jours ou moins (passé comme futur) et
        les absents n&apos;apparaissent pas.
      </p>
    </div>
  );
}

function AucunCalcul() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-court-500 text-on-accent"><Icon name="ballon" size={34} strokeWidth={1.8} /></div>
      <h1 className="title-2">Aucun calcul pour ce soir</h1>
      <p className="mt-2 max-w-xs text-sm text-fg-muted">
        Lance le push sur ton PC pour voir apparaître les picks conseillés ici :
      </p>
      <code className="mt-3 rounded-[10px] bg-surface-2 px-3 py-2 text-[13px] text-court-400">python push_to_supabase.py</code>
    </div>
  );
}
