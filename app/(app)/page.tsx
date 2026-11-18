import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SceneAccueil } from "@/components/dark/SceneAccueil";
import { CeSoirCard, type LigneCeSoir } from "@/components/CeSoirCard";
import { captureDuPick } from "@/lib/captures";
import { COMPTE_REF } from "@/lib/compte";
import { RealtimeRuns } from "@/components/RealtimeRuns";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { AlertsBanner, type Alert } from "@/components/AlertsBanner";
import { BenchmarksCard } from "@/components/BenchmarksCard";
import { RecapNuit } from "@/components/RecapNuit";
import { classerNuit, resultatDuPick, topNuit, type LigneNuit } from "@/lib/recap-nuit";
import { PicksValidesCard, type PickCompte } from "@/components/PicksValidesCard";
import { alerteCookies, alertePcSilencieux, type EtatCookies } from "@/lib/etat-robot";
import { AlertesPicks } from "@/components/AlertesPicks";
import { InstallerApp } from "@/components/InstallerApp";
import { SauvegardeHorsLigne } from "@/components/SauvegardeHorsLigne";
import { alertesPicksDuSoir, type AlertePick } from "@/lib/alertes-picks";
import { chargerSoiree } from "@/lib/conseilles-data";
import { fusionnerSoiree } from "@/lib/conseilles";
import { COMPTES_EQUIPE, JOURS_CYCLE, ZONES, ajouterJours, normaliserNom, type PickLigne } from "@/lib/planning";
import { BandeauSecret } from "@/components/BandeauSecret";
import { construireCarteX2, lireLignesX2, x2Pour } from "@/lib/x2-affichage";
import { chargerSecret, masquerLignes, soireeSecrete, soireesSecretes } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import type { TtflManualAbsent } from "@/lib/types";
import { picksAVenir } from "@/lib/conseilles";
import { aujourdhuiNY } from "@/lib/planning";
import { chargerCaptures } from "@/lib/captures";
import { ageMs, nb, todayISO } from "@/lib/format";
import type { Mode, TtflBenchmark, TtflRun } from "@/lib/types";
import type { PickScore } from "@/lib/benchmarks";

export const dynamic = "force-dynamic";

/** « 2026-27 » : une saison NBA commence en octobre (soirée datée à New York). */
function saisonDe(iso: string): string {
  const an = Number(iso.slice(5, 7)) >= 9 ? Number(iso.slice(0, 4)) : Number(iso.slice(0, 4)) - 1;
  return `${an}-${String(an + 1).slice(2)}`;
}
export const metadata = { title: "Accueil — TTFL" };

// LECTURE SEULE : cette page ne calcule ni score ni projection. En tête, la carte « Ce soir » (un compte par ligne,
// fraîcheur, fourchette du moteur) ; dessous, les soirées suivantes, les alertes et les repères.
// Le classement conseillé est dans l'onglet « Conseillés ».

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();
  const aujourdhui = aujourdhuiNY(); // une soirée NBA se date à New York

  // --- Ce qui doit peindre en premier : le run + les alertes qui en dépendent.
  const [{ data: run }, { data: expiredAbsents }, { data: etatsRobot }, { data: cloud }] = await Promise.all([
    supabase
      .from("ttfl_latest_run")
      .select("*")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle<TtflRun>(),
    supabase
      .from("ttfl_manual_absents")
      .select("id")
      .not("date_fin", "is", null)
      .lt("date_fin", today)
      .returns<{ id: number }[]>(),
    supabase
      .from("ttfl_robot_etat")
      .select("cle,valeur,maj_le")
      .in("cle", ["cookies", "commandes"])
      .returns<{ cle: string; valeur: Record<string, unknown> | null; maj_le: string }[]>(),
    supabase.from("ttfl_cloud_reglage").select("mode").eq("id", 1).maybeSingle<{ mode: string }>(),
  ]);

  const mode: Mode = run?.mode ?? "regular";

  // Données des alertes avant matchs : lancées tout de suite, EN MÊME TEMPS que le reste (elles ne dépendent que du run).
  const alertesData =
    run && run.mode === "regular" && run.game_date >= aujourdhui
      ? Promise.all([
          chargerSoiree(supabase, run.mode, run.game_date),
          supabase
            .from("ttfl_picks")
            .select("pick_date,player,compte")
            .eq("mode", run.mode)
            .gte("pick_date", ajouterJours(run.game_date, -JOURS_CYCLE))
            .lte("pick_date", ajouterJours(run.game_date, JOURS_CYCLE))
            .returns<PickLigne[]>(),
          supabase.from("ttfl_manual_absents").select("*").returns<TtflManualAbsent[]>(),
        ])
      : null;

  const [pickRes, aVenirRes, secret, capturesBrutes, lignesX2] = await Promise.all([
    run
      ? supabase
          .from("ttfl_picks")
          .select("player")
          .eq("mode", run.mode)
          .eq("pick_date", run.game_date)
          .eq("compte", COMPTE_REF)
          .maybeSingle<{ player: string }>()
      : Promise.resolve({ data: null }),
    supabase
      .from("ttfl_picks")
      .select("pick_date,player,compte")
      .eq("mode", mode)
      .gte("pick_date", aujourdhui)
      .order("pick_date", { ascending: true })
      .limit(800)
      .returns<PickCompte[]>(),
    chargerSecret(supabase, aujourdhui),
    chargerCaptures(supabase),
    lireLignesX2(supabase, aujourdhui),
  ]);
  const maintenantMs = heureServeur();
  // Pick secret du compte 02 : ses picks, captures et alertes des soirées pas encore closes sont retirés (lib/secret.ts).
  const datesSecretes = soireesSecretes(
    secret,
    [...new Set([...(run ? [run.game_date] : []), ...Object.keys(secret.lignes)])].sort(),
    aujourdhui,
    maintenantMs,
  );
  const pickedPlayer = pickRes.data?.player ?? null;
  const captures = masquerLignes(capturesBrutes, secret, aujourdhui, maintenantMs);
  const x2 = construireCarteX2(lignesX2, { etat: secret, aujourdhui, maintenantMs }); // bonus ×2 (badge à côté du joueur)
  const tousPicks = picksAVenir(masquerLignes(aVenirRes.data ?? [], secret, aujourdhui, maintenantMs), aujourdhui);
  const picksValides = tousPicks.filter((p) => p.compte === COMPTE_REF); // compte 1 : alertes et photo hors-ligne
  const picksAutres = tousPicks.filter((p) => p.compte !== COMPTE_REF);

  const runIsToday = run?.game_date === today;

  // --- Alertes, non bloquantes -------------------------------------------
  const alerts: Alert[] = [];
  if (run && runIsToday) {
    const ageHours = ageMs(run.computed_at) / 3600000;
    if (!run.injury_report_fresh) {
      alerts.push({
        id: "stale-report",
        tone: "danger",
        message:
          "Report des blessures NBA indisponible : aucun blessé n'est exclu des picks conseillés. Vérifie le statut des joueurs avant de picker.",
      });
    }
    if (ageHours > 2) {
      alerts.push({
        id: "stale-calcul",
        tone: "danger",
        message: `Dernier calcul il y a ${Math.floor(ageHours)} h : le moteur n'a rien publié depuis. Regarde Plus > Admin > Santé des tâches.`,
      });
    }
    if (!pickedPlayer) {
      alerts.push({
        id: "pick-not-validated",
        tone: "warn",
        message: "Pick du soir non encore validé.",
      });
    }
  }
  if ((expiredAbsents?.length ?? 0) > 0) {
    alerts.push({
      id: "expired-absents",
      tone: "info",
      message: `${nb(expiredAbsents!.length, "absent")} dont la date de fin est dépassée : à retirer dans Plus > Absents ?`,
    });
  }

  // --- Alertes avant matchs : picks de ce soir devenus Out / incertains, comptes sans pick, remplaçant proposé.
  let alertesPicks: AlertePick[] = [];
  let projectionC1: number | null = null; // projection du moteur pour le pick du compte 01 ce soir (carte « Ce soir »)
  if (run && alertesData) {
    const [soiree, voisinsRes, absentsRes] = await alertesData;
    if (run.game_date === aujourdhui) {
      const c1 = tousPicks.find((p) => p.pick_date === aujourdhui && p.compte === COMPTE_REF)?.player;
      const ligne = c1 ? fusionnerSoiree(soiree.avance, soiree.soir).find((l) => normaliserNom(l.player) === normaliserNom(c1)) : null;
      projectionC1 = ligne?.projection ?? null;
    }
    const voisins = masquerLignes(voisinsRes.data ?? [], secret, aujourdhui, maintenantMs);
    // Ce soir encore secret : aucune alerte pour le compte secret (« sans pick » serait faux, « Out » trahirait le joueur).
    const zonesAlertes = soireeSecrete(secret, secret.compte, run.game_date, aujourdhui, maintenantMs)
      ? ZONES.filter((z) => !z.comptes.includes(secret.compte))
      : ZONES;
    alertesPicks = alertesPicksDuSoir({
      zones: zonesAlertes,
      date: run.game_date,
      picksDuSoir: voisins.filter((p) => p.pick_date === run.game_date),
      voisins,
      lignes: fusionnerSoiree(soiree.avance, soiree.soir),
      absents: absentsRes.data ?? [],
      runDuSoirDisponible: !!soiree.runSoir,
    });
  }

  // --- Santé du robot : cookies TTFL à renouveler, PC silencieux.
  const cookiesEtat = etatsRobot?.find((e) => e.cle === "cookies");
  const alerteCk = alerteCookies(cookiesEtat ? { ...(cookiesEtat.valeur as EtatCookies | null), le: (cookiesEtat.valeur as EtatCookies | null)?.le ?? cookiesEtat.maj_le } : null);
  if (alerteCk) alerts.push(alerteCk);
  const pouls = etatsRobot?.find((e) => e.cle === "commandes");
  // Cloud en charge (migration sans PC) : le PC se tait exprès, ce n'est pas une alerte.
  const alertePc = cloud?.mode === "reel"
    ? null
    : alertePcSilencieux((pouls?.valeur as { dernier_passage?: string } | null)?.dernier_passage ?? pouls?.maj_le);
  if (alertePc) alerts.push(alertePc);

  // --- Carte « Ce soir » : un compte par ligne (le compte secret n'affiche qu'un cadenas, jamais de joueur).
  const joueurDuSoir = (compte: string) => tousPicks.find((p) => p.pick_date === aujourdhui && p.compte === compte)?.player ?? null;
  const ligneCeSoir = (compte: string): LigneCeSoir => {
    const secretCeSoir = compte === secret.compte && datesSecretes.includes(aujourdhui);
    const joueur = secretCeSoir ? null : joueurDuSoir(compte);
    return {
      label: `Cpt ${compte}`,
      href: `/ce-soir?pour=c${compte}`,
      joueur,
      secret: secretCeSoir,
      pose: !!captureDuPick(captures, compte, aujourdhui, joueur),
      x2: x2Pour(x2, compte, aujourdhui, joueur),
    };
  };
  const equipePosees = COMPTES_EQUIPE.filter((c) => joueurDuSoir(c)).length;
  const titreDate = new Date(`${aujourdhui}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-5">
      {/* Scène d'ouverture « Dark » (comme l'accueil de l'app Tennis) : terrain dessiné, pick du soir du compte 01. */}
      <SceneAccueil
        aujourdhui={aujourdhui}
        saison={saisonDe(aujourdhui)}
        titreDate={titreDate}
        matchCeSoir={run?.game_date === aujourdhui}
        joueur={joueurDuSoir(COMPTE_REF)}
        projection={mode === "regular" ? projectionC1 : null}
        equipe={{ posees: equipePosees, total: COMPTES_EQUIPE.length }}
        cloture={secret.lignes[aujourdhui]?.cloture ?? null}
        soireesAvecPick={picksValides.map((p) => p.pick_date)}
      />
      <RealtimeRuns />
      <SauvegardeHorsLigne soiree={run?.game_date ?? null} pickDuSoir={pickedPlayer} aVenir={picksValides} />
      <div className="cascade space-y-5">
      <AlertsBanner alerts={alerts} />
      {run && <AlertesPicks alertes={alertesPicks} mode={run.mode} date={run.game_date} />}

      {/* Bloc 1 — ce soir : chaque compte, la fourchette du compte 01, la fraîcheur, l'accès aux conseillés ---- */}
      <CeSoirCard
        titreDate={titreDate}
        date={aujourdhui}
        lignes={[ligneCeSoir(COMPTE_REF), ligneCeSoir("02"), ligneCeSoir("13")]}
        equipe={{ posees: equipePosees, total: COMPTES_EQUIPE.length, href: "/ce-soir?pour=equipe" }}
        cloture={secret.lignes[aujourdhui]?.cloture ?? null}
        projection={mode === "regular" ? projectionC1 : null}
        fraicheur={
          run ? (
            <FreshnessBanner computedAt={run.computed_at} injuryFresh={run.injury_report_fresh} />
          ) : (
            <p className="rounded-[16px] bg-fill/60 px-4 py-3 text-[14px] font-medium text-fg-muted">
              Aucun calcul pour l&apos;instant : le moteur calcule toutes les 30 min à partir de 16 h.
            </p>
          )
        }
      />

      {/* Bloc 2 — pick secret (révéler) puis les soirées suivantes ---- */}
      <BandeauSecret etat={secret} dates={datesSecretes} discret />
      {/* Recap de la veille : les 30 meilleurs scores TTFL de la nuit (table ttfl_resultats_nuit, remplie par le moteur) */}
      <Suspense fallback={<BlockSkeleton />}>
        <RecapNuitBlock mode={mode} aujourdhui={aujourdhui} />
      </Suspense>

      <PicksValidesCard
        titre="Prochains soirs"
        picks={picksValides.filter((p) => p.pick_date > aujourdhui)}
        autres={picksAutres.filter((p) => p.pick_date > aujourdhui)}
        aujourdhui={aujourdhui}
        captures={captures}
        x2={x2}
        datesSecretes={datesSecretes}
      />

      <InstallerApp />

      {/* Bloc 3 — toi vs les repères modèle ------------------------------ */}
      <Suspense fallback={<BlockSkeleton />}>
        <BenchmarksBlock mode={mode} />
      </Suspense>
      </div>
    </div>
  );
}

// --- Repères modèle (streaming indépendant) ---------------------------------

async function BenchmarksBlock({ mode }: { mode: Mode }) {
  const supabase = await createClient();

  const [{ data: benchmarks }, { data: mesPicks }] = await Promise.all([
    supabase
      .from("ttfl_benchmarks")
      .select("*")
      .eq("mode", mode)
      .order("computed_at", { ascending: false })
      .returns<TtflBenchmark[]>(),
    // Les picks scorés du compte 01 : la carte compare à soirées égales avec chaque repère (lib/benchmarks.ts).
    supabase
      .from("ttfl_picks")
      .select("pick_date,score")
      .eq("mode", mode)
      .eq("compte", COMPTE_REF)
      .not("score", "is", null)
      .returns<PickScore[]>(),
  ]);

  // Un seul tournoi par mode pour l'instant (ttfl_picks ne distingue pas
  // encore les éditions de playoffs) : si plusieurs lignes existaient quand
  // même pour une même stratégie, ne garder que la plus récente.
  const rows = Object.values(
    (benchmarks ?? []).reduce<Record<string, TtflBenchmark>>((acc, b) => {
      if (!acc[b.strategy]) acc[b.strategy] = b;
      return acc;
    }, {}),
  );

  // Pas encore de benchmarks pour ce tournoi (début de saison) : on masque le
  // bloc proprement plutôt que d'afficher des zéros.
  if (rows.length === 0) return null;

  return <BenchmarksCard rows={rows} userPicks={mesPicks ?? []} />;
}

// --- Recap de la veille (streaming independant) -----------------------------

async function RecapNuitBlock({ mode, aujourdhui }: { mode: Mode; aujourdhui: string }) {
  const supabase = await createClient();
  // Derniere soiree DEJA jouee (date de New York) : celle d'hier matin une fois le moteur passe a 9 h 40.
  const { data: derniere } = await supabase
    .from("ttfl_resultats_nuit")
    .select("soiree")
    .lt("soiree", aujourdhui)
    .order("soiree", { ascending: false })
    .limit(1)
    .maybeSingle<{ soiree: string }>();
  if (!derniere) return null;

  const [{ data: lignes }, { data: pick }] = await Promise.all([
    supabase
      .from("ttfl_resultats_nuit")
      .select("player,team,ttfl,minutes")
      .eq("soiree", derniere.soiree)
      .limit(1000)
      .returns<LigneNuit[]>(),
    supabase
      .from("ttfl_picks")
      .select("player")
      .eq("mode", mode)
      .eq("pick_date", derniere.soiree)
      .eq("compte", COMPTE_REF)
      .maybeSingle<{ player: string }>(),
  ]);
  if (!lignes || lignes.length === 0) return null;

  const classees = classerNuit(
    lignes.map((l) => ({ ...l, ttfl: Number(l.ttfl), minutes: l.minutes === null ? null : Number(l.minutes) })),
    pick?.player ?? null,
  );
  return (
    <RecapNuit
      soiree={derniere.soiree}
      top={topNuit(classees)}
      total={classees.length}
      pick={resultatDuPick(classees, pick?.player ?? null)}
    />
  );
}
function BlockSkeleton() {
  return (
    <div className="card p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-surface-2" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-2" />
    </div>
  );
}
