import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { adversairesAvecPicks, derniersChoix, fmtRang, scoresParAdversaire, type ScoreSuivi } from "@/lib/adversaires";
import { frDate, majuscule } from "@/lib/format";
import type { TtflSuivi, TtflSuiviPick } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adversaires — TTFL" };

// LECTURE SEULE : la liste vient du « Centre de surveillance » du site TTFL, relevée chaque jour par le robot du PC.
// Le site n'affiche que le pick d'HIER de chaque joueur suivi : l'historique ci-dessous n'existe que parce qu'il est gardé.
export default async function AdversairesPage() {
  const supabase = await createClient();
  const [suivisRes, picksRes, scoresRes] = await Promise.all([
    supabase.from("ttfl_suivis").select("*").eq("suivi", true).returns<TtflSuivi[]>(),
    supabase
      .from("ttfl_suivis_picks")
      .select("users_id,pick_date,joueur")
      .order("pick_date", { ascending: false })
      .limit(1500)
      .returns<TtflSuiviPick[]>(),
    // Scores du jour de chaque adversaire (vue ttfl_suivis_scores). Facultatif : si la vue manque, la page reste utilisable.
    supabase
      .from("ttfl_suivis_scores")
      .select("users_id,soiree,score_du_jour")
      .order("soiree", { ascending: false })
      .limit(1500)
      .returns<ScoreSuivi[]>(),
  ]);
  const erreur = suivisRes.error?.message ?? picksRes.error?.message ?? null;
  const suivis = suivisRes.data ?? [];
  const picks = picksRes.data ?? [];
  const adversaires = adversairesAvecPicks(suivis, picks);
  const dernier = derniersChoix(suivis, picks);
  const scores = scoresParAdversaire(scoresRes.data ?? []);

  return (
    <div className="space-y-4">
      <PageHeader
        titre="Adversaires"
        sousTitre="Les joueurs de ton Centre de surveillance TTFL"
        retour={{ href: "/plus", libelle: "Plus" }}
      />

      {erreur && (
        <p className="rounded-[14px] bg-out/10 px-4 py-3 text-sm text-out">
          Lecture impossible ({erreur}). Si les tables des suivis n&apos;existent pas encore, lance le fichier{" "}
          <code>pont/migration_suivis.sql</code> dans l&apos;éditeur SQL de Supabase.
        </p>
      )}

      {!erreur && adversaires.length === 0 && (
        <div className="card px-4 py-10 text-center">
          <p className="text-sm text-fg-muted">
            Aucun adversaire relevé pour l&apos;instant. Le robot du PC lit ta liste de suivis sur le site TTFL
            (<code>node lire-suivis.js --ecrire</code>).
          </p>
        </div>
      )}

      {dernier && (
        <section className="card p-4">
          <h2 className="text-[15px] font-semibold text-fg">Picks du {frDate(dernier.date)}</h2>
          <ul className="mt-2 space-y-1.5">
            {dernier.choix.map((c) => (
              <li key={c.joueur} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate font-semibold text-fg">{c.joueur}</span>
                <span className="shrink-0 text-fg-muted">{c.pseudos.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adversaires.length > 0 && (
        <ul className="card overflow-hidden">
          {adversaires.map(({ suivi: s, picks: ps }) => {
            const resume = scores.get(s.users_id);
            return (
            <li key={s.users_id} className="list-row items-start">
              <div className="w-16 shrink-0 text-right text-[15px] font-bold num text-fg">{fmtRang(s.rang)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[17px] font-semibold tracking-[-0.01em] text-fg">{s.pseudo}</span>
                  <span className="shrink-0 text-[14px] num text-fg-muted">
                    {s.points === null ? "—" : `${s.points.toLocaleString("fr-FR")} pts`}
                  </span>
                </div>
                <div className="text-[13px] text-fg-muted">
                  {s.equipe ?? "Sans équipe"}
                  {resume && resume.moyenne !== null && (
                    <span> · moy. {resume.moyenne.toFixed(1)} sur {resume.n} soirée{resume.n > 1 ? "s" : ""} · meilleur {resume.meilleur}</span>
                  )}
                </div>
                {ps.length === 0 ? (
                  <p className="mt-1 text-[13px] text-fg-muted">Aucun pick gardé pour l&apos;instant.</p>
                ) : (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[13px] font-medium text-fg-muted">
                      Dernier pick : {ps[0].joueur} · {ps.length} gardé{ps.length > 1 ? "s" : ""}
                    </summary>
                    <ul className="mt-1.5 space-y-0.5">
                      {ps.map((p) => (
                        <li key={p.pick_date} className="flex justify-between gap-3 text-[13px]">
                          <span className="text-fg-muted">{majuscule(frDate(p.pick_date))}</span>
                          <span className="min-w-0 flex-1 truncate font-medium text-fg">{p.joueur}</span>
                          {resume?.parSoiree.has(p.pick_date) && (
                            <span className="w-10 shrink-0 text-right font-semibold num text-fg">{resume.parSoiree.get(p.pick_date)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <p className="px-1 text-[13px] text-fg-muted">
        Le site TTFL ne montre que le pick de la veille. L&apos;application le relève chaque jour et le garde ici ;
        l&apos;historique commence donc le jour où le robot a été branché.
      </p>
    </div>
  );
}
