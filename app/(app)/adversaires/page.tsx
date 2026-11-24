import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReprisesAdversaire } from "@/components/ReprisesAdversaire";
import { fmtRang, scoresParAdversaire, type ScoreSuivi } from "@/lib/adversaires";
import { reprisesAdversaires } from "@/lib/adversaires-reprises";
import { chargerTopNuits } from "@/lib/adversaires-reprises-data";
import { ajouterJours, aujourdhuiNY } from "@/lib/planning";
import { NB_JOURS } from "@/lib/conseilles";
import type { TtflSuivi, TtflSuiviPick } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adversaires — TTFL" };

// LECTURE SEULE : la liste vient du « Centre de surveillance » du site TTFL, relevée chaque jour par le robot.
// Pour chaque adversaire : ce qu'il peut encore prendre dans les 7 prochains jours parmi les 30 meilleurs joueurs de
// chaque soirée (nos projections), compte tenu des joueurs qu'il a déjà pickés à 30 jours ou moins. Ses derniers
// picks ne sont plus affichés ici (ils servent seulement au calcul).
export default async function AdversairesPage() {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const [suivisRes, picksRes, scoresRes, top] = await Promise.all([
    supabase.from("ttfl_suivis").select("*").eq("suivi", true).returns<TtflSuivi[]>(),
    // 45 jours de picks suffisent : le blocage dure 30 jours, la fenêtre de reprise 7 jours de plus.
    supabase
      .from("ttfl_suivis_picks")
      .select("users_id,pick_date,joueur")
      .gte("pick_date", ajouterJours(aujourdhui, -45))
      .order("pick_date", { ascending: false })
      .limit(2500)
      .returns<TtflSuiviPick[]>(),
    // Scores du jour de chaque adversaire (vue ttfl_suivis_scores). Facultatif : si la vue manque, la page reste utilisable.
    supabase
      .from("ttfl_suivis_scores")
      .select("users_id,soiree,score_du_jour")
      .order("soiree", { ascending: false })
      .limit(1500)
      .returns<ScoreSuivi[]>(),
    chargerTopNuits(supabase, "regular", aujourdhui),
  ]);
  const erreur = suivisRes.error?.message ?? picksRes.error?.message ?? null;
  const suivis = suivisRes.data ?? [];
  const adversaires = reprisesAdversaires(suivis, picksRes.data ?? [], top.nuits, aujourdhui);
  const scores = scoresParAdversaire(scoresRes.data ?? []);
  const nNuits = top.nuits.length;

  return (
    <div className="space-y-4">
      <PageHeader
        titre="Adversaires"
        sousTitre="Ce que tes adversaires peuvent encore prendre"
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
            Aucun adversaire relevé pour l&apos;instant. Le robot lit ta liste de suivis sur le site TTFL
            (<code>node lire-suivis.js --ecrire</code>).
          </p>
        </div>
      )}

      {adversaires.length > 0 && (
        <p className="px-1 text-[13px] leading-snug text-fg-muted">
          Pour chaque adversaire : les 30 meilleurs joueurs de chaque soirée selon nos projections (blessés et absents
          retirés), sur les {NB_JOURS} prochains jours, sans ceux qu&apos;il a pickés à 30 jours ou moins. Chaque joueur
          est rangé à la première date où il peut le prendre.
          {top.erreur && <span className="text-out"> Projections incomplètes : {top.erreur}</span>}
          {!top.erreur && nNuits === 0 && " Aucune projection pour les prochains jours pour l'instant."}
        </p>
      )}

      {adversaires.length > 0 && (
        <ul className="card overflow-hidden">
          {adversaires.map(({ suivi: s, reprises: rs }) => {
            const resume = scores.get(s.users_id);
            const ceSoir = rs.filter((r) => r.date === aujourdhui).length;
            return (
              <li key={s.users_id} className="list-row items-start">
                <div className="w-16 shrink-0 text-right text-[15px] font-bold num text-fg">{fmtRang(s.rang)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 break-words text-[17px] font-semibold tracking-[-0.01em] text-fg">{s.pseudo}</span>
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
                  {nNuits > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[13px] font-medium text-fg-muted">
                        Peut prendre : {rs.length} joueur{rs.length > 1 ? "s" : ""} du top 30
                        {ceSoir > 0 ? ` · ${ceSoir} dès ce soir` : ""}
                      </summary>
                      <ReprisesAdversaire reprises={rs} aujourdhui={aujourdhui} />
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="px-1 text-[13px] text-fg-muted">
        Le site TTFL ne montre que le pick de la veille : le pick de ce soir n&apos;est connu que demain, et un pick
        manqué par le robot peut faire apparaître à tort un joueur encore bloqué.
      </p>
    </div>
  );
}
