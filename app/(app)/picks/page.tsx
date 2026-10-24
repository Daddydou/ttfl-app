import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COMPTE_REF } from "@/lib/compte";
import { compteValide, resumerComptes, type ResumeCompte } from "@/lib/historique";
import { ScoreInput } from "@/components/ScoreInput";
import { DeletePickButton } from "@/components/DeletePickButton";
import { zoneMemorisee } from "@/lib/zone-memo";
import { NuitPicker } from "@/components/NuitPicker";
import { RepartitionEquipe } from "@/components/RepartitionEquipe";
import { EditionComptes } from "@/components/EditionComptes";
import { MoisTabs, VueTabs, ZoneTabs, type ParamsPicks } from "@/components/PlanningTabs";
import { frDate, majuscule } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { RevelerBouton } from "@/components/RevelerBouton";
import { chargerSecret, heureCloture, masquerLignes, soireeSecrete } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import {
  aDesProjections,
  aujourdhuiNY,
  avanceSeule,
  bloquesPourSoiree,
  comptesAuto,
  estMoisValide,
  moisDisponibles,
  resumeEnvois,
  resumeZone,
  zoneDe,
  type EnvoiLigne,
  type EtatEnvoi,
  type Nuit,
  type PickAuto,
  type PickLigne,
  type ResumeEnvoi,
  type ResumeZone,
  type Zone,
} from "@/lib/planning";
import type { Mode, TtflPick } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes picks — TTFL" };

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function resolveMode(explicit?: string): Promise<Mode> {
  if (explicit === "regular" || explicit === "playoffs") return explicit;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ttfl_latest_run")
    .select("mode")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.mode as Mode) ?? "regular";
}

// --- Chargement : planning (plusieurs soirées, une zone de comptes) ---------------

interface NuitVue {
  date: string;
  nuit: Nuit | undefined;
  resume: ResumeZone;
  envoi: ResumeEnvoi;
  dejaPose: boolean; // au moins un compte a ce pick posé sur le site TTFL
  bloques: Record<string, string[]>;
  parCompte: Record<string, string>; // compte → joueur pické pour cette soirée
  autos: string[]; // comptes dont le pick a été posé par le robot (auto-remplissage), pas validé par l'utilisateur
  passee: boolean;
  secret: boolean; // pick du compte secret (02) caché jusqu'à la clôture de la soirée
  clotureSecret: string | null; // heure de clôture (Paris) affichée avec le cadenas
}

interface PlanningData {
  zone: Zone;
  mois: string[];
  moisCourant: string;
  nuits: NuitVue[];
  erreur: string | null;
}

async function chargerPlanning(
  supabase: Supabase,
  mode: Mode,
  zoneParam: string | undefined,
  moisParam: string | undefined,
): Promise<PlanningData> {
  const zone = zoneDe(zoneParam);
  const aujourdhui = aujourdhuiNY();

  const [nuitsRes, picksRes, envoisRes, autosRes, secret] = await Promise.all([
    supabase.from("ttfl_nuits").select("*").eq("mode", mode).returns<Nuit[]>(),
    supabase
      .from("ttfl_picks")
      .select("pick_date,player,compte")
      .eq("mode", mode)
      .in("compte", zone.comptes)
      .returns<PickLigne[]>(),
    supabase
      .from("ttfl_envois")
      .select("pick_date,compte,joueur,statut,message")
      .eq("mode", mode)
      .in("compte", zone.comptes)
      .returns<EnvoiLigne[]>(),
    // Marques « auto » : une erreur (table pas encore créée) est ignorée, elle ne doit jamais casser la page.
    supabase
      .from("ttfl_picks_auto")
      .select("pick_date,compte,player,origine")
      .eq("mode", mode)
      .in("compte", zone.comptes)
      .returns<PickAuto[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);
  const maintenantMs = heureServeur();
  // Pick secret du compte 02 : ses lignes des soirées pas encore closes sont retirées AVANT tout calcul (cycle, envois,
  // marques « auto »), pour que rien n'en trahisse le joueur.
  const masquer = <T extends { compte: string }>(l: T[], champ: keyof T = "pick_date" as keyof T) =>
    masquerLignes(l, secret, aujourdhui, maintenantMs, champ);
  const autosMarques = masquer(autosRes.error ? [] : (autosRes.data ?? []));
  const erreur =
    nuitsRes.error?.message ?? picksRes.error?.message ?? envoisRes.error?.message ?? null;

  // Les soirées « Aucun match » (run vide du push quotidien) ne sont pas des soirées à picker.
  const nuits = (nuitsRes.data ?? []).filter(aDesProjections);
  const picks = masquer((picksRes.data ?? []).filter((p) => zone.comptes.includes(p.compte)));
  const envois = masquer((envoisRes.data ?? []).filter((e) => zone.comptes.includes(e.compte)));

  // Le planning ne montre que les soirées à venir (aujourd'hui compris) : le passé est dans « Historique ».
  const dates = new Set<string>(
    [...nuits.map((n) => n.game_date), ...picks.map((p) => p.pick_date)].filter((d) => d >= aujourdhui),
  );
  const mois = moisDisponibles([...dates], aujourdhui);
  const moisCourant = estMoisValide(moisParam)
    ? moisParam
    : mois.includes(aujourdhui.slice(0, 7))
      ? aujourdhui.slice(0, 7)
      : mois[0];

  const nuitsDuMois = [...dates]
    .filter((d) => d.startsWith(moisCourant))
    .sort()
    .map((date): NuitVue => {
      const resume = resumeZone(picks, zone.comptes, date);
      const envoisDuSoir = envois.filter((e) => e.pick_date === date);
      return {
        date,
        nuit: nuits.find((n) => n.game_date === date),
        resume,
        envoi: resumeEnvois(envoisDuSoir, resume.nPicks),
        dejaPose: envoisDuSoir.some((e) => e.statut === "confirme"),
        bloques: bloquesPourSoiree(picks, zone.comptes, date),
        parCompte: Object.fromEntries(picks.filter((p) => p.pick_date === date).map((p) => [p.compte, p.player])),
        autos: comptesAuto(autosMarques, picks, date),
        passee: date < aujourdhui,
        secret: zone.comptes.includes(secret.compte) && soireeSecrete(secret, secret.compte, date, aujourdhui, maintenantMs),
        clotureSecret: heureCloture(secret, date),
      };
    });

  return { zone, mois, moisCourant, nuits: nuitsDuMois, erreur };
}

// --- Chargement : historique (les 13 comptes) ----------------------------------------

// Tous les picks du mode, tous comptes (par pages de 1 000 : Supabase tronque au-delà), sans les soirées encore
// secrètes du compte 02.
async function chargerHistorique(supabase: Supabase, mode: Mode): Promise<TtflPick[]> {
  const tous: TtflPick[] = [];
  for (let a = 0; ; a += 1000) {
    const { data } = await supabase
      .from("ttfl_picks")
      .select("*")
      .eq("mode", mode)
      .order("pick_date", { ascending: false })
      .range(a, a + 999)
      .returns<TtflPick[]>();
    const lot = data ?? [];
    tous.push(...lot);
    if (lot.length < 1000) break;
  }
  const aujourdhui = aujourdhuiNY();
  const secret = await chargerSecret(supabase, aujourdhui);
  return masquerLignes(tous, secret, aujourdhui, heureServeur());
}

// --- Page --------------------------------------------------------------------------

export default async function PicksPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; vue?: string; zone?: string; mois?: string; compte?: string }>;
}) {
  const { mode: explicitMode, vue: vueParam, zone: zoneUrl, mois: moisParam, compte: compteParam } = await searchParams;
  const zoneParam = zoneUrl ?? (await zoneMemorisee()) ?? undefined;
  const mode = await resolveMode(explicitMode);
  const supabase = await createClient();

  // Le planning n'existe qu'en saison régulière (les playoffs ont un usage unique par joueur).
  const vue: ParamsPicks["vue"] = mode === "regular" && vueParam !== "historique" ? "planning" : "historique";

  if (vue === "planning") {
    const data = await chargerPlanning(supabase, mode, zoneParam, moisParam);
    const params: ParamsPicks = { mode, vue, zone: data.zone.id, mois: data.moisCourant };
    return (
      <div className="space-y-4">
        <PageHeader
          titre="Mes picks"
          sousTitre="Planning et historique de tes comptes"
          action={<Link href="/equipe" className="text-[13px] font-semibold text-court-400">Semaine équipe →</Link>}
        />
        <VueTabs courant={params} />
        <PlanningVue params={params} data={data} mode={mode} />
      </div>
    );
  }

  const tous = await chargerHistorique(supabase, mode);
  const compte = compteValide(compteParam);
  const rows = tous.filter((p) => p.compte === compte);
  const params: ParamsPicks = { mode, vue, zone: zoneDe(zoneParam).id };
  return (
    <div className="space-y-4">
      <PageHeader titre="Mes picks" sousTitre="Historique et points de tes 13 comptes" />
      <VueTabs courant={params} />
      <ChoixCompte resume={resumerComptes(tous)} courant={compte} mode={mode} />
      <HistoriqueVue rows={rows} mode={mode} compte={compte} />
    </div>
  );
}

// --- Vue planning ------------------------------------------------------------------

const STYLES_ENVOI: Record<EtatEnvoi, string> = {
  aucun: "",
  a_envoyer: "bg-quest/10 text-quest",
  pose: "bg-avail/10 text-avail",
  partiel: "bg-quest/10 text-quest",
  conflit: "bg-out/10 text-out",
  echec: "bg-out/10 text-out",
};

function libellePick(r: ResumeZone): string {
  if (r.etat === "aucun") return "Pas de pick";
  const premier = r.joueurs[0];
  if (r.etat === "unique") {
    return r.nComptes > 1 ? `${premier.player} · ${r.nComptes} comptes` : premier.player;
  }
  if (r.etat === "partiel") return `${premier.player} · ${r.nPicks}/${r.nComptes} comptes`;
  return `Picks différents : ${r.joueurs.map((j) => `${j.player} (${j.n})`).join(", ")}`;
}

function PlanningVue({
  params,
  data,
  mode,
}: {
  params: ParamsPicks;
  data: PlanningData;
  mode: Mode;
}) {
  const { zone, mois, nuits, erreur } = data;
  return (
    <>
      <ZoneTabs courant={params} />
      <MoisTabs courant={params} mois={mois} />

      {erreur && (
        <p className="rounded-[14px] bg-out/10 px-4 py-3 text-sm text-out">
          Lecture impossible : {erreur}
        </p>
      )}

      {nuits.length === 0 ? (
        <div className="card px-4 py-10 text-center">
          <p className="text-sm text-fg-muted">Aucune soirée connue ce mois-ci.</p>
          <p className="mt-1 text-[13px] text-fg-muted">
            Les soirées à venir apparaissent après « Recalculer les prochaines soirées » (Plus &gt; Admin &gt;
            Actions), lancé aussi automatiquement par le moteur.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {nuits.map((n) => (
            <section
              key={n.date}
              className={`card p-4 ${n.passee ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[19px] font-bold tracking-[-0.01em] text-fg">{majuscule(frDate(n.date))}</h2>
                  <p className="text-[13px] text-fg-muted">
                    {!n.nuit
                      ? "Soirée sans projection"
                      : avanceSeule(n.nuit)
                        ? "Projections à l'avance"
                        : "Projections du soir"}
                  </p>
                </div>
                {n.envoi.label && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${STYLES_ENVOI[n.envoi.etat]}`}
                  >
                    {n.envoi.label}
                  </span>
                )}
              </div>

              {n.secret ? (
                // Pick secret (compte 02) : ni joueur, ni état d'envoi, ni sélecteur — rien qui permette de le deviner
                // ou de l'écraser à l'aveugle. « Révéler maintenant » le montre tout de suite.
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-semibold text-fg">
                    <Icon name="cadenas" size={15} strokeWidth={2} className="mr-1.5 inline-block -translate-y-px" />
                    Pick secret{n.clotureSecret ? ` · révélé à ${n.clotureSecret} (Paris)` : " · révélé à la clôture de la soirée"}
                  </p>
                  <RevelerBouton soiree={n.date} />
                </div>
              ) : (
                <p
                  className={`mt-2 text-sm ${n.resume.etat === "aucun" ? "text-fg-muted" : "font-semibold text-fg"}`}
                >
                  {libellePick(n.resume)}
                </p>
              )}
              {n.envoi.detail && <p className="mt-1 text-[13px] text-out">{n.envoi.detail}</p>}
              {/* Qui a choisi : une information neutre, pas un avertissement (l'état d'envoi est dans le badge). */}
              {n.autos.length > 0 && (
                <p className="mt-1 text-[13px] text-fg-muted">
                  Choisi par le robot ({n.autos.length > 1 ? "comptes" : "compte"} {n.autos.join(", ")}) : « Changer » pour
                  imposer le tien.
                </p>
              )}

              {!n.passee && !n.secret && (
                <NuitPicker
                  mode={mode}
                  date={n.date}
                  zoneLabel={zone.label}
                  comptes={zone.comptes}
                  aUnPick={n.resume.nPicks > 0}
                  dejaPose={n.dejaPose}
                  bloques={n.bloques}
                />
              )}
              {!n.passee && !n.secret && zone.comptes.length > 1 && (
                <RepartitionEquipe
                  mode={mode}
                  date={n.date}
                  comptes={zone.comptes}
                  bloques={n.bloques}
                  aUnPick={n.resume.nPicks > 0}
                  dejaPose={n.dejaPose}
                />
              )}
              {!n.passee && !n.secret && zone.comptes.length > 1 && (
                <EditionComptes
                  mode={mode}
                  date={n.date}
                  comptes={zone.comptes}
                  parCompte={n.parCompte}
                  bloques={n.bloques}
                  dejaPose={n.dejaPose}
                />
              )}
            </section>
          ))}
        </div>
      )}

      <p className="px-1 text-[13px] text-fg-muted">
        Ce que tu choisis ici est l&apos;état voulu : le robot du PC l&apos;envoie ensuite sur le site
        TTFL et signale « Conflit » si le site dit autre chose. Un joueur pické à 30 jours ou moins
        sur un compte de la zone est grisé.
      </p>
    </>
  );
}

// --- Vue historique (un compte au choix) ----------------------------------------------

// Les 13 comptes avec leur total : touche un compte pour voir ses picks et ses points.
function ChoixCompte({ resume, courant, mode }: { resume: ResumeCompte[]; courant: string; mode: Mode }) {
  return (
    <div className="grid grid-cols-5 gap-1.5" aria-label="Choisir un compte">
      {resume.map((r) => {
        const actif = r.compte === courant;
        return (
          <Link
            key={r.compte}
            href={`/picks?mode=${mode}&vue=historique&compte=${r.compte}`}
            aria-current={actif ? "page" : undefined}
            className={`rounded-[12px] px-1 py-1.5 text-center ${actif ? "bg-court-500 text-white" : "bg-surface-2 text-fg"}`}
          >
            <div className="text-[13px] font-bold tabular-nums">{r.compte}</div>
            <div className={`text-[11px] tabular-nums ${actif ? "text-white/90" : "text-fg-muted"}`}>
              {r.notes ? `${r.total} pts` : "—"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function HistoriqueVue({ rows, mode, compte }: { rows: TtflPick[]; mode: Mode; compte: string }) {
  const scored = rows.filter((p) => p.score !== null);
  const total = scored.reduce((s, p) => s + (p.score ?? 0), 0);
  const avg = scored.length ? total / scored.length : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Picks" value={rows.length.toString()} />
        <Stat label="Total" value={scored.length ? total.toString() : "—"} />
        <Stat label="Moyenne" value={avg !== null ? avg.toFixed(1) : "—"} />
      </div>

      {mode === "playoffs" && (
        <div className="rounded-[20px] bg-court-500/10 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-fg-muted">Usage unique</span>
            <span className="text-2xl font-bold tabular-nums text-fg">{rows.length}</span>
          </div>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            joueur(s) consommé(s) sur l&apos;ensemble des playoffs — chacun ne peut être pické
            qu&apos;une fois.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card px-4 py-10 text-center">
          <p className="text-sm text-fg-muted">
            Aucun pick en {mode === "playoffs" ? "playoffs" : "saison régulière"} pour le compte {compte}
            pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {rows.map((p) => (
            <div
              key={p.id}
              className="list-row"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-fg">{p.player}</div>
                <div className="text-[13px] text-fg-muted">{frDate(p.pick_date)}</div>
              </div>
              <ScoreInput pickId={p.id} score={p.score} />
              {compte === COMPTE_REF && <DeletePickButton pickId={p.id} player={p.player} />}
            </div>
          ))}
        </div>
      )}

      <p className="px-1 text-[13px] text-fg-muted">
        Historique du compte {compte}. Les points sont remplis automatiquement chaque matin (vers 9 h 45) : score TTFL
        réel du joueur, 0 s&apos;il n&apos;a pas joué ; le bonus x2 n&apos;est pas compté. Pour corriger un score :
        touche le champ, tape le total TTFL, valide.
      </p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-3 text-center">
      <div className="text-2xl font-bold tabular-nums text-fg">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-fg-muted">{label}</div>
    </div>
  );
}
