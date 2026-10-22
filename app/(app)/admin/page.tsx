import { createClient } from "@/lib/supabase/server";
import { ActionsPC } from "@/components/admin/ActionsPC";
import { HistoriqueCommandes, type Commande } from "@/components/admin/HistoriqueCommandes";
import { JournalEnvois, type EntreeJournal } from "@/components/admin/JournalEnvois";
import { PicksEnMasse } from "@/components/admin/PicksEnMasse";
import { SecretPick, type SoireeSecreteVue } from "@/components/admin/SecretPick";
import { chargerSecret, heureCloture, masquerLignes, soireeSecrete } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { etatExecuteur } from "@/lib/admin";
import { ageMs, humanAge } from "@/lib/format";
import { aujourdhuiNY } from "@/lib/planning";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sante } from "@/components/admin/Sante";
import { etatSante, type LigneEtat } from "@/lib/sante";
import { MoteurCloud } from "@/components/admin/MoteurCloud";
import { lireModeCloud } from "@/lib/cloud";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — TTFL" };

const PILULES = {
  en_ligne: { classe: "bg-avail/10 text-avail", titre: "PC en ligne" },
  lent: { classe: "bg-quest/10 text-quest", titre: "PC lent à répondre" },
  hors_ligne: { classe: "bg-out/10 text-out", titre: "PC hors ligne" },
  inconnu: { classe: "bg-surface text-fg-muted", titre: "Aucun passage reçu" },
} as const;

export default async function AdminPage() {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const [commandesRes, etatsRes, runRes, planRes, cotesRes, cloudRes, journalRes, secret] = await Promise.all([
    supabase.from("ttfl_commandes").select("*").order("id", { ascending: false }).limit(30).returns<Commande[]>(),
    supabase.from("ttfl_robot_etat").select("cle,valeur,maj_le").returns<LigneEtat[]>(),
    supabase.from("ttfl_runs").select("computed_at").eq("mode", "regular").order("computed_at", { ascending: false }).limit(1)
      .maybeSingle<{ computed_at: string }>(),
    supabase.from("ttfl_plan30").select("calcule_le").order("calcule_le", { ascending: false }).limit(1)
      .maybeSingle<{ calcule_le: string }>(),
    supabase.from("ttfl_vainqueurs_releves").select("releve_le").order("releve_le", { ascending: false }).limit(1)
      .maybeSingle<{ releve_le: string }>(),
    supabase.from("ttfl_cloud_reglage").select("mode").eq("id", 1).maybeSingle<{ mode: string }>(),
    supabase
      .from("ttfl_envois_journal")
      .select("id,le,pick_date,compte,joueur,statut,message")
      .order("id", { ascending: false })
      .limit(40)
      .returns<EntreeJournal[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);
  const maintenantMs = heureServeur();
  // Pick secret du compte 02 : ses lignes du journal d'envoi (joueur !) sont retirées tant que la soirée est secrète.
  const journal = masquerLignes(journalRes.data ?? [], secret, aujourdhui, maintenantMs);
  const soireesSecretes: SoireeSecreteVue[] = Object.keys(secret.lignes)
    .sort()
    .filter((d) => d >= aujourdhui)
    .map((d) => {
      const l = secret.lignes[d];
      const secrete = soireeSecrete(secret, secret.compte, d, aujourdhui, maintenantMs);
      return {
        soiree: d,
        libelle: new Date(`${d}T00:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }),
        cloture: heureCloture(secret, d),
        etat: secrete ? "secrete" : l.revele_le && l.motif === "force" ? "revelee_force" : "revelee_cloture",
      };
    });

  const commandes = commandesRes.data ?? [];
  const etats = etatsRes.data ?? [];
  const pouls = etats.find((e) => e.cle === "commandes");
  const dernierPassage = pouls?.valeur?.dernier_passage;
  const dernier = (typeof dernierPassage === "string" ? dernierPassage : null) ?? pouls?.maj_le ?? null;
  const taches = etatSante(
    {
      etats,
      dernierRun: runRes.data?.computed_at ?? null,
      dernierPlan30: planRes.data?.calcule_le ?? null,
      dernierReleveCotes: cotesRes.data?.releve_le ?? null,
      modeCloud: cloudRes.data?.mode ?? null,
    },
    maintenantMs,
  );
  const modeCloud = lireModeCloud(cloudRes.data?.mode);
  const lancement = etats.find((e) => e.cle === "reveil_moteur_envoi");
  const tacheLancee = (lancement?.valeur?.inputs as { tache?: string } | undefined)?.tache;
  const dernierLancement = lancement
    ? `${new Date(lancement.maj_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${tacheLancee ? ` (${tacheLancee})` : ""}`
    : null;
  const { etat, minutes } = etatExecuteur(dernier ? Math.round(ageMs(dernier) / 60000) : null);
  const pilule = modeCloud === "reel"
    ? { classe: "bg-court-500/15 text-court-400", titre: "Cloud en charge — le PC est au repos" }
    : PILULES[etat];
  const actives = commandes.filter((c) => c.statut === "en_attente" || c.statut === "en_cours").map((c) => c.type);

  return (
    <div className="space-y-5">
      <PageHeader titre="Admin" sousTitre="Actions à distance sur ton PC et opérations en masse sur les picks." />

      <section className={`rounded-[20px] px-4 py-3.5 ${pilule.classe}`}>
        <p className="text-sm font-semibold">{pilule.titre}</p>
        <p className="mt-0.5 text-[13px] opacity-80">
          {modeCloud === "reel"
            ? "Toutes les actions s'exécutent dans le cloud (environ 2 à 5 min). Le PC peut rester éteint."
            : etat === "inconnu"
            ? "L'exécuteur du PC n'a encore jamais répondu."
            : etat === "en_ligne"
              ? `Dernier passage ${humanAge(minutes ?? 0)}. Les actions démarrent dans la minute.`
              : `Dernier passage ${humanAge(minutes ?? 0)}. Les actions marquées « Cloud » s'exécutent quand même (environ 2 min) ; les autres attendront le PC.`}
        </p>
      </section>

      <Sante taches={taches} maintenantMs={maintenantMs} />
      <MoteurCloud mode={modeCloud} dernier={dernierLancement} />

      {commandesRes.error && (
        <p className="rounded-[14px] bg-out/10 px-3 py-2 text-[13px] text-out">{commandesRes.error.message}</p>
      )}

      <ActionsPC actives={actives} />
      <HistoriqueCommandes commandes={commandes} />
      <SecretPick actif={secret.actif} compte={secret.compte} soirees={soireesSecretes} lisible={secret.lisible} />
      <JournalEnvois entrees={journal} disponible={!journalRes.error} />
      <PicksEnMasse aujourdhui={aujourdhuiNY()} />
    </div>
  );
}
