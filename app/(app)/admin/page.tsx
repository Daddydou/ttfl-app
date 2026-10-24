import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { etatExecuteur } from "@/lib/admin";
import { ageMs, humanAge } from "@/lib/format";
import { aujourdhuiNY } from "@/lib/planning";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type NomIcone } from "@/components/ui/Icon";
import { Sante } from "@/components/admin/Sante";
import { etatSante, type LigneEtat } from "@/lib/sante";
import { lireModeCloud } from "@/lib/cloud";
import { chargerSecret } from "@/lib/secret";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — TTFL" };

const PILULES = {
  en_ligne: { classe: "bg-avail/10 text-avail", titre: "PC en ligne" },
  lent: { classe: "bg-quest/10 text-quest", titre: "PC lent à répondre" },
  hors_ligne: { classe: "bg-out/10 text-out", titre: "PC hors ligne" },
  inconnu: { classe: "bg-surface text-fg-muted", titre: "Aucun passage reçu" },
} as const;

// Admin : un aperçu court (qui fait tourner le moteur, santé des tâches), puis une liste façon Réglages d'iOS vers
// une sous-page par rubrique (avant : une seule page d'une dizaine d'écrans).
export default async function AdminPage() {
  const supabase = await createClient();
  const [commandesRes, etatsRes, runRes, planRes, cotesRes, cloudRes, secret] = await Promise.all([
    supabase.from("ttfl_commandes").select("statut").in("statut", ["en_attente", "en_cours"]).returns<{ statut: string }[]>(),
    supabase.from("ttfl_robot_etat").select("cle,valeur,maj_le").returns<LigneEtat[]>(),
    supabase.from("ttfl_runs").select("computed_at").eq("mode", "regular").order("computed_at", { ascending: false }).limit(1)
      .maybeSingle<{ computed_at: string }>(),
    supabase.from("ttfl_plan30").select("calcule_le").order("calcule_le", { ascending: false }).limit(1)
      .maybeSingle<{ calcule_le: string }>(),
    supabase.from("ttfl_vainqueurs_releves").select("releve_le").order("releve_le", { ascending: false }).limit(1)
      .maybeSingle<{ releve_le: string }>(),
    supabase.from("ttfl_cloud_reglage").select("mode").eq("id", 1).maybeSingle<{ mode: string }>(),
    chargerSecret(supabase, aujourdhuiNY()),
  ]);
  const maintenantMs = heureServeur();

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
  const { etat, minutes } = etatExecuteur(dernier ? Math.round(ageMs(dernier) / 60000) : null);
  const pilule = modeCloud === "reel"
    ? { classe: "bg-avail/10 text-avail", titre: "Cloud en charge — le PC est au repos" }
    : PILULES[etat];
  const enCours = (commandesRes.data ?? []).length;

  const rubriques: { href: string; titre: string; detail: string; icone: NomIcone }[] = [
    {
      href: "/admin/actions",
      titre: "Actions",
      detail: enCours > 0 ? `${enCours} en cours · historique des demandes` : "Recalculs, synchronisation · historique",
      icone: "eclair",
    },
    { href: "/admin/journal", titre: "Journal des actions", detail: "Ce que chaque action a provoqué", icone: "livre" },
    { href: "/admin/envois", titre: "Journal d'envoi", detail: "Statut des picks envoyés sur TTFL, par compte", icone: "picks" },
    {
      href: "/admin/secret",
      titre: "Pick secret",
      detail: secret.actif ? `Activé · compte ${secret.compte}` : "Désactivé",
      icone: "cadenas",
    },
    { href: "/admin/cloud", titre: "Moteur dans le cloud", detail: "Essai à blanc, cloud en charge ou PC", icone: "reglages" },
    { href: "/admin/masse", titre: "Picks en masse", detail: "Importer, copier ou supprimer des picks", icone: "plus" },
    { href: "/admin/notifications", titre: "Notifications", detail: "Alertes sur ce téléphone", icone: "cloche" },
    { href: "/admin/cookies", titre: "Cookies TTFL", detail: "Âge des connexions et renouvellement", icone: "sortie" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Admin"
        sousTitre="Surveillance du moteur et actions à distance."
        retour={{ href: "/plus", libelle: "Plus" }}
      />

      <section className={`rounded-[20px] px-4 py-3.5 ${pilule.classe}`}>
        <p className="text-sm font-semibold">{pilule.titre}</p>
        <p className="mt-0.5 text-[13px] opacity-90">
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

      <section aria-labelledby="titre-rubriques">
        <h2 id="titre-rubriques" className="section-label mb-2">
          Rubriques
        </h2>
        <ul className="card overflow-hidden">
          {rubriques.map((r) => (
            <li key={r.href} className="list-row !p-0">
              <Link href={r.href} className="flex w-full items-center gap-3 px-4 py-3 active:bg-fill/60">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-fill text-fg">
                  <Icon name={r.icone} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] text-fg">{r.titre}</span>
                  <span className="block truncate text-[13px] text-fg-muted">{r.detail}</span>
                </span>
                <Icon name="chevron" size={16} className="shrink-0 text-fg-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
