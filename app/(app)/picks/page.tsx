import { createClient } from "@/lib/supabase/server";
import { COMPTE_REF } from "@/lib/compte";
import { ScoreInput } from "@/components/ScoreInput";
import { ModeTabs } from "@/components/ModeTabs";
import { DeletePickButton } from "@/components/DeletePickButton";
import { NuitPicker } from "@/components/NuitPicker";
import { RepartitionEquipe } from "@/components/RepartitionEquipe";
import { EditionComptes } from "@/components/EditionComptes";
import { MoisTabs, VueTabs, ZoneTabs, type ParamsPicks } from "@/components/PlanningTabs";
import { frDate } from "@/lib/format";
import {
  aDesProjections,
  aujourdhuiNY,
  avanceSeule,
  bloquesPourSoiree,
  estMoisValide,
  moisDisponibles,
  resumeEnvois,
  resumeZone,
  zoneDe,
  type EnvoiLigne,
  type EtatEnvoi,
  type Nuit,
  type PickLigne,
  type ResumeEnvoi,
  type ResumeZone,
  type Zone,
} from "@/lib/planning";
import type { Mode, TtflPick } from "@/lib/types";

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
  passee: boolean;
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

  const [nuitsRes, picksRes, envoisRes] = await Promise.all([
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
  ]);
  const erreur =
    nuitsRes.error?.message ?? picksRes.error?.message ?? envoisRes.error?.message ?? null;

  // Les soirées « Aucun match » (run vide du push quotidien) ne sont pas des soirées à picker.
  const nuits = (nuitsRes.data ?? []).filter(aDesProjections);
  const picks = (picksRes.data ?? []).filter((p) => zone.comptes.includes(p.compte));
  const envois = (envoisRes.data ?? []).filter((e) => zone.comptes.includes(e.compte));

  const dates = new Set<string>([...nuits.map((n) => n.game_date), ...picks.map((p) => p.pick_date)]);
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
        passee: date < aujourdhui,
      };
    });

  return { zone, mois, moisCourant, nuits: nuitsDuMois, erreur };
}

// --- Chargement : historique (compte 1) -------------------------------------------

async function chargerHistorique(supabase: Supabase, mode: Mode): Promise<TtflPick[]> {
  const { data: picks } = await supabase
    .from("ttfl_picks")
    .select("*")
    .eq("mode", mode)
    .eq("compte", COMPTE_REF)
    .order("pick_date", { ascending: false })
    .returns<TtflPick[]>();
  return picks ?? [];
}

// --- Page --------------------------------------------------------------------------

export default async function PicksPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; vue?: string; zone?: string; mois?: string }>;
}) {
  const { mode: explicitMode, vue: vueParam, zone: zoneParam, mois: moisParam } = await searchParams;
  const mode = await resolveMode(explicitMode);
  const supabase = await createClient();

  // Le planning n'existe qu'en saison régulière (les playoffs ont un usage unique par joueur).
  const vue: ParamsPicks["vue"] = mode === "regular" && vueParam !== "historique" ? "planning" : "historique";

  if (vue === "planning") {
    const data = await chargerPlanning(supabase, mode, zoneParam, moisParam);
    const params: ParamsPicks = { mode, vue, zone: data.zone.id, mois: data.moisCourant };
    return (
      <div className="space-y-4">
        <ModeTabs base="/picks" current={mode} />
        <VueTabs courant={params} />
        <PlanningVue params={params} data={data} mode={mode} />
      </div>
    );
  }

  const rows = await chargerHistorique(supabase, mode);
  const params: ParamsPicks = { mode, vue, zone: zoneDe(zoneParam).id };
  return (
    <div className="space-y-4">
      <ModeTabs base="/picks" current={mode} />
      {mode === "regular" && <VueTabs courant={params} />}
      <HistoriqueVue rows={rows} mode={mode} />
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
        <p className="rounded-xl bg-out/10 px-4 py-3 text-sm text-out">
          Lecture impossible : {erreur}
        </p>
      )}

      {nuits.length === 0 ? (
        <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-10 text-center">
          <p className="text-sm text-ink-600">Aucune soirée connue ce mois-ci.</p>
          <p className="mt-1 text-xs text-ink-600">
            Les soirées à venir apparaissent après{" "}
            <code className="text-court-400">python -m pont.push_avance</code> sur le PC.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {nuits.map((n) => (
            <section
              key={n.date}
              className={`rounded-2xl border border-ink-800 bg-ink-900 p-4 ${n.passee ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold capitalize text-white">{frDate(n.date)}</h2>
                  <p className="text-xs text-ink-600">
                    {!n.nuit
                      ? "Soirée sans projection"
                      : avanceSeule(n.nuit)
                        ? "Projections à l'avance"
                        : "Projections du soir"}
                  </p>
                </div>
                {n.envoi.label && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES_ENVOI[n.envoi.etat]}`}
                  >
                    {n.envoi.label}
                  </span>
                )}
              </div>

              <p
                className={`mt-2 text-sm ${n.resume.etat === "aucun" ? "text-ink-600" : "font-semibold text-white"}`}
              >
                {libellePick(n.resume)}
              </p>
              {n.envoi.detail && <p className="mt-1 text-xs text-out">{n.envoi.detail}</p>}

              {!n.passee && (
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
              {!n.passee && zone.comptes.length > 1 && (
                <RepartitionEquipe
                  mode={mode}
                  date={n.date}
                  comptes={zone.comptes}
                  bloques={n.bloques}
                  aUnPick={n.resume.nPicks > 0}
                  dejaPose={n.dejaPose}
                />
              )}
              {!n.passee && zone.comptes.length > 1 && (
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

      <p className="px-1 text-xs text-ink-600">
        Ce que tu choisis ici est l&apos;état voulu : le robot du PC l&apos;envoie ensuite sur le site
        TTFL et signale « Conflit » si le site dit autre chose. Un joueur pické à 30 jours ou moins
        sur un compte de la zone est grisé.
      </p>
    </>
  );
}

// --- Vue historique (compte 1) -----------------------------------------------------

function HistoriqueVue({ rows, mode }: { rows: TtflPick[]; mode: Mode }) {
  const scored = rows.filter((p) => p.score !== null);
  const total = scored.reduce((s, p) => s + (p.score ?? 0), 0);
  const avg = scored.length ? total / scored.length : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Picks" value={rows.length.toString()} />
        <Stat label="Total" value={scored.length ? total.toString() : "—"} />
        <Stat label="Moyenne" value={avg !== null ? avg.toFixed(1) : "—"} accent />
      </div>

      {mode === "playoffs" && (
        <div className="rounded-xl border border-court-600/30 bg-court-500/[0.06] px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-court-400">Usage unique</span>
            <span className="text-2xl font-black tabular-nums text-white">{rows.length}</span>
          </div>
          <p className="mt-0.5 text-xs text-ink-600">
            joueur(s) consommé(s) sur l&apos;ensemble des playoffs — chacun ne peut être pické
            qu&apos;une fois.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-10 text-center">
          <p className="text-sm text-ink-600">
            Aucun pick en {mode === "playoffs" ? "playoffs" : "saison régulière"} pour
            l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b border-ink-800 px-3 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{p.player}</div>
                <div className="text-xs text-ink-600">{frDate(p.pick_date)}</div>
              </div>
              <ScoreInput pickId={p.id} score={p.score} />
              <DeletePickButton pickId={p.id} player={p.player} />
            </div>
          ))}
        </div>
      )}

      <p className="px-1 text-xs text-ink-600">
        Historique du compte 1. Saisis le score réel après la soirée : touche le champ, tape le
        total TTFL, valide. Il alimente tes stats et confirme le blocage du joueur.
      </p>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 px-3 py-2.5 text-center">
      <div className={`text-2xl font-black tabular-nums ${accent ? "text-court-400" : "text-white"}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-ink-600">{label}</div>
    </div>
  );
}
