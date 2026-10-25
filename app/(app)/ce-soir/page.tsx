import { createClient } from "@/lib/supabase/server";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { CarteConseille } from "@/components/CarteConseille";
import { PourquoiPick } from "@/components/PourquoiPick";
import { JoursConseilles, ZonesConseilles } from "@/components/ConseillesNav";
import { PlanTrenteJours } from "@/components/PlanTrenteJours";
import { PlanEquipe } from "@/components/PlanEquipe";
import { SuiviFormules } from "@/components/SuiviFormules";
import type { LigneSuivi } from "@/lib/suivi-formules";
import { chargerSoiree } from "@/lib/conseilles-data";
import { zoneMemorisee } from "@/lib/zone-memo";
import { captureDuPick, chargerCaptures } from "@/lib/captures";
import { PickDuSoirResume } from "@/components/PickDuSoirResume";
import { PickZoneButton } from "@/components/PickZoneButton";
import { BandeauSecret } from "@/components/BandeauSecret";
import { RevelerBouton } from "@/components/RevelerBouton";
import { chargerSecret, heureCloture, masquerLignes, soireeSecrete, soireesSecretes } from "@/lib/secret";
import { maintenantMs, type TtflPlan30 } from "@/lib/plan30";
import {
  construireConseilles,
  etiquetteJour,
  fusionnerSoiree,
  joursProposes,
  nbMatchs,
  type Masque,
} from "@/lib/conseilles";
import { frDate, majuscule } from "@/lib/format";
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

const VISIBLES = 3; // cartes dépliées d'emblée ; les suivantes sont repliées

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
  const zone = zoneDe(pour ?? (await zoneMemorisee()));

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

  // Plan glissant de 30 jours détaillé (formules, verrous, suivi) : comptes 01, 02 et 13. La zone « Équipe » a son
  // propre bloc, plus simple (PlanEquipe).
  const avecPlan = zone.id === "c01" || zone.id === "c02" || zone.id === "c13";
  const compteAuto = zone.id === "c02" || zone.id === "c13"; // comptes gérés par le robot (verrou « validé à la main »)

  const avecPlanEquipe = zone.id === "equipe"; // Plan 30 des comptes 03 à 12 (un plan par compte, écrit par le moteur)

  const [soiree, picksRes, absentsRes, planRes, verrousRes, suiviRes, secret, capturesBrutes, planEquipeRes] = await Promise.all([
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
    avecPlanEquipe
      ? supabase.from("ttfl_plan30").select("*").in("compte", zone.comptes).returns<TtflPlan30[]>()
      : Promise.resolve({ data: [] as TtflPlan30[], error: null }),
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

  // Résumé « Ce soir · Compte X » (comptes 01, 02, 13) : le pick posé d'abord, l'avis du classement ensuite.
  // Soirée encore secrète pour ce compte : pas de résumé (le bandeau secret s'en charge).
  const compteResume = avecPlan && !estSecret(zone.comptes[0], date) ? zone.comptes[0] : null;
  const pickResume = compteResume
    ? picks.find((p) => p.pick_date === date && p.compte === compteResume)?.player ?? null
    : null;
  const ligneDe = (joueur: string) => lignes.find((l) => normaliserNom(l.player) === normaliserNom(joueur));
  const etiquette = etiquetteJour(date, aujourdhui);
  const carte = (c: (typeof conseilles)[number]) => (
    <CarteConseille
      key={c.player}
      c={c}
      mode={mode}
      date={date}
      zoneLabel={zone.label}
      cotes={cotesParJoueur.get(c.player)}
      picke={pickeSurTous(c.player, c.comptesLibres)}
    />
  );

  return (
    <div className="space-y-4">
      <RealtimeRuns />

      <PageHeader
        titre="Picks conseillés"
        sousTitre={
          <>
            <span className="font-semibold text-fg">{majuscule(jourComplet(date))}</span>
            {matchs > 0 ? ` · ${matchs} match${matchs > 1 ? "s" : ""}` : ""}
          </>
        }
      />

      <JoursConseilles jours={jours} courant={date} pour={zone.id} aujourdhui={aujourdhui} />
      <ZonesConseilles courant={zone.id} date={date} />

      {soiree.runSoir ? (
        <FreshnessBanner computedAt={soiree.runSoir.computed_at} injuryFresh={soiree.runSoir.injury_report_fresh} />
      ) : (
        <p className="rounded-[14px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
          Projections calculées à l&apos;avance : les blessures ne sont pas encore connues. Le classement du soir (avec
          les blessures) les remplace le jour J, dès 16 h.
        </p>
      )}

      <BandeauSecret etat={secret} dates={datesSecretes} />

      {compteResume && (
        <PickDuSoirResume
          titre={`${etiquette.relatif === "aujourd'hui" ? "Ce soir" : `Pick du ${etiquette.court}`} · ${zone.label}`}
          pick={pickResume}
          projectionPick={pickResume ? (ligneDe(pickResume)?.projection ?? null) : null}
          pose={!!captureDuPick(captures, compteResume, date, pickResume)}
          n1={conseilles[0] ? { player: conseilles[0].player, projection: conseilles[0].projection } : null}
          action={
            // Une seule grande action, en tête : poser le n° 1 (s'il diffère du pick et reste libre pour ce compte).
            conseilles[0] &&
            conseilles[0].player !== pickResume &&
            conseilles[0].comptesLibres.includes(compteResume) ? (
              <PickZoneButton
                mode={mode}
                date={date}
                player={conseilles[0].player}
                comptes={[compteResume]}
                zoneLabel={zone.label}
                dejaPicke={false}
                variante="large"
                libelle={pickResume ? `Prendre ${conseilles[0].player} à la place` : `Picker ${conseilles[0].player}`}
              />
            ) : undefined
          }
        />
      )}

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

      {/* Plan 30 jours et suivi des formules : le détail, replié par défaut (le résumé ci-dessus suffit avant le lock). */}
      {avecPlan && (
        <details className="group">
          <summary className="card flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="text-[17px] font-semibold text-fg">Plan 30 jours et formules</span>
            <Icon name="chevron" size={16} className="shrink-0 text-fg-faint transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 space-y-4">
            {!planCache && (
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
            <SuiviFormules lignes={suiviVisible} />
          </div>
        </details>
      )}

      {avecPlanEquipe && (
        <PlanEquipe plans={planEquipeRes.data ?? []} aujourdhui={aujourdhui} maintenantMs={maintenantMs()} />
      )}

      {ancien && (
        <div className="rounded-[20px] bg-quest/10 px-4 py-3">
          <p className="text-sm font-semibold text-quest">Aucun calcul pour ce soir</p>
          <p className="mt-0.5 text-[13px] text-fg">
            Le moteur n&apos;a encore rien publié pour les prochains soirs. Ci-dessous, le dernier classement connu (
            {frDate(date)}).
          </p>
        </div>
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
          {conseilles.slice(0, VISIBLES).map(carte)}
          {/* Au-delà du n° 3 : replié (une recommandation, ses suivants proches, puis le reste à la demande). */}
          {conseilles.length > VISIBLES && (
            <details className="group space-y-3">
              <summary className="btn btn-plain w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Voir les {conseilles.length - VISIBLES} suivants</span>
                <span className="hidden group-open:inline">Masquer les suivants</span>
              </summary>
              <div className="mt-3 space-y-3">{conseilles.slice(VISIBLES).map(carte)}</div>
            </details>
          )}
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
        Le moteur calcule toutes les 30 min à partir de 16 h (heure de Paris). Les picks conseillés apparaîtront ici
        dès le premier calcul. En cas de doute : Plus &gt; Admin &gt; Santé des tâches.
      </p>
    </div>
  );
}
