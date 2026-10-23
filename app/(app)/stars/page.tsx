import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { chargerSecret, masquerLignes } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { JOURS_CYCLE, ajouterJours, aujourdhuiNY } from "@/lib/planning";
import { FIN_SAISON_REGULIERE, starsParCompte, type PickStar } from "@/lib/stars";
import { frDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stars — TTFL" };

const COMPTES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"];

// LECTURE SEULE : pour chaque compte, les stars déjà prises (bloquées 30 jours), la date où elles redeviennent permises
// et le nombre de soirées restantes. Le compte secret n'est pas montré tant que sa soirée est secrète.
export default async function StarsPage() {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY(); // une soirée NBA se date à New York
  const maintenantMs = heureServeur();
  const [res, secret] = await Promise.all([
    supabase
      .from("ttfl_picks")
      .select("compte,player,pick_date")
      .eq("mode", "regular")
      .gte("pick_date", ajouterJours(aujourdhui, -(JOURS_CYCLE + 1)))
      .returns<PickStar[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);

  const picks = masquerLignes(res.data ?? [], secret, aujourdhui, maintenantMs);
  const resumes = starsParCompte(picks, COMPTES, aujourdhui);
  const restantes = resumes[0]?.soirees_restantes ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        titre="Stars"
        sousTitre={`Joueurs bloqués par le cycle de ${JOURS_CYCLE} jours, compte par compte`}
        action={<Link href="/stats" className="text-[13px] font-semibold text-court-400">← Stats</Link>}
      />

      {res.error && (
        <p className="rounded-[14px] bg-out/10 px-4 py-3 text-sm text-out">Lecture impossible ({res.error.message}).</p>
      )}

      <p className="card px-4 py-3 text-[13px] text-fg-muted">
        Jusqu&apos;à la fin de la saison régulière ({frDate(FIN_SAISON_REGULIERE)}) : environ{" "}
        <strong className="text-fg">{restantes}</strong> soirées (certains jours n&apos;ont pas de match).
      </p>

      <ul className="card divide-y divide-line overflow-hidden">
        {resumes.map((r) => {
          const compteSecret = secret.actif && r.compte === secret.compte;
          return (
            <li key={r.compte} className="px-4 py-3">
              <details>
                <summary className="flex cursor-pointer items-baseline justify-between gap-3">
                  <span className="text-[17px] font-semibold text-fg">Compte {r.compte}</span>
                  <span className="text-right text-[13px] text-fg-muted">
                    {r.bloquees.length} bloquée{r.bloquees.length > 1 ? "s" : ""}
                    {r.prochaine_libre && (
                      <>
                        {" "}· prochaine libre le {frDate(r.prochaine_libre.libre_le)} (dans {r.prochaine_libre.jours_restants} j)
                      </>
                    )}
                  </span>
                </summary>
                {r.bloquees.length === 0 ? (
                  <p className="mt-2 text-[13px] text-fg-muted">Aucun joueur bloqué : tout le monde est permis.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {r.bloquees.map((b) => (
                      <li key={b.player} className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate font-medium text-fg">{b.player}</span>
                        <span className="shrink-0 text-fg-muted">
                          {b.a_venir ? "prévu le" : "pris le"} {frDate(b.pris_le)} · libre le {frDate(b.libre_le)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {compteSecret && (
                  <p className="mt-2 text-[12px] text-fg-muted">Les picks des soirées encore secrètes ne sont pas montrés ici.</p>
                )}
                <p className="mt-2 text-[12px] text-fg-muted">
                  {r.deja_posees} pick{r.deja_posees > 1 ? "s" : ""} déjà posé{r.deja_posees > 1 ? "s" : ""} à partir d&apos;aujourd&apos;hui ·{" "}
                  {Math.max(0, r.soirees_restantes - r.deja_posees)} soirées encore à remplir
                </p>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="px-1 text-[12px] text-fg-muted">
        Un joueur pické ne peut plus l&apos;être pendant {JOURS_CYCLE} jours : il redevient permis le {JOURS_CYCLE + 1}e jour après son pick.
      </p>
    </div>
  );
}
