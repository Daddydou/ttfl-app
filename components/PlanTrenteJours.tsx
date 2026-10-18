"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lancerCommande } from "@/app/(app)/admin/actions";
import { deverrouillerPickManuel, verrouillerPickManuel } from "@/app/actions";
import { normaliserNom } from "@/lib/planning";
import { PickZoneButton } from "@/components/PickZoneButton";
import { frDate, fmtNum, humanAge } from "@/lib/format";
import {
  bilanPlan,
  decrireReglages,
  fenetre,
  formuleChoisie,
  formulesTriees,
  jourParDefaut,
  joursNonCouverts,
  libelleFormule,
  optionsDates,
  planPerime,
  type JourPlan30,
  type TtflPlan30,
} from "@/lib/plan30";
import type { Mode } from "@/lib/types";

// Plan glissant de 30 jours pour un compte (01 ou 02) : un joueur par soirée, choisi pour maximiser le total de points
// TTFL attendu sur la fenêtre. Le plan est calculé sur le PC (moteur/plan30.py) ; ici on le lit, on change de formule et
// de date sans aucun calcul.
export function PlanTrenteJours({
  plans,
  compte,
  zoneLabel,
  mode,
  aujourdhui,
  maintenantMs,
  verrous,
}: {
  plans: TtflPlan30[];
  compte: string;
  zoneLabel: string;
  mode: Mode;
  aujourdhui: string;
  maintenantMs: number;
  verrous?: Record<string, string>; // « picks manuels validés » du compte 02 : { date: joueur }
}) {
  const router = useRouter();
  const formules = formulesTriees(plans);
  const [formuleId, setFormuleId] = useState<string | null>(null);
  const [dateId, setDateId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();

  const plan = formuleChoisie(plans, formuleId);

  function recalculer() {
    setMessage(null);
    start(async () => {
      const res = await lancerCommande("plan30");
      setMessage(res.ok ? { ok: true, texte: res.message } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  const boutonRecalcul = (
    <button onClick={recalculer} disabled={pending} className="btn btn-plain btn-sm">
      {pending ? "…" : "Recalculer le plan"}
    </button>
  );

  if (!plan) {
    return (
      <section className="card space-y-2 px-4 py-4" aria-label="Plan 30 jours">
        <p className="section-label">Plan 30 jours · {zoneLabel}</p>
        <p className="text-sm font-semibold text-fg">Aucun plan calculé pour l&apos;instant.</p>
        <p className="text-[13px] text-fg-muted">
          Le plan est calculé sur ton PC. Demande-le ici, ou lance <code className="text-court-400">python -m pont.push_plan30</code>.
        </p>
        <div className="flex items-center gap-3">{boutonRecalcul}</div>
        {message && <Retour message={message} />}
      </section>
    );
  }

  const options = optionsDates(plan, aujourdhui);
  const choisie = dateId && options.some((o) => o.date === dateId) ? dateId : jourParDefaut(plan, aujourdhui);
  const jour = plan.jours.find((j) => j.date === choisie) ?? null;
  const bilan = bilanPlan(plan, aujourdhui);
  const manque = joursNonCouverts(plan, aujourdhui);
  const perime = planPerime(plan, maintenantMs);
  const phrases = decrireReglages(plan.reglages ?? {});

  return (
    <section className="card space-y-3 px-4 py-4" aria-label="Plan 30 jours">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">Plan 30 jours · {zoneLabel}</p>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            {fenetre(plan)} · {fmtNum(bilan.total, 0)} pts attendus sur {bilan.nbSoirees} soirée
            {bilan.nbSoirees > 1 ? "s" : ""}
            {bilan.nbValidees > 0 ? ` · ${bilan.nbValidees} déjà validée${bilan.nbValidees > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {boutonRecalcul}
      </div>

      {formules.length > 1 && (
        <div className="seg" role="tablist" aria-label="Formule du plan">
          {formules.map((f) => (
            <button
              key={f.profil}
              role="tab"
              aria-selected={f.profil === plan.profil}
              onClick={() => setFormuleId(f.profil)}
              className={`seg-item ${f.profil === plan.profil ? "seg-item-on" : ""}`}
            >
              {libelleFormule(f)}
            </button>
          ))}
        </div>
      )}
      {plan.reglages?.description && <p className="text-[13px] text-fg-muted">{plan.reglages.description}</p>}

      {(perime || manque > 0) && (
        <p className="rounded-[14px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
          {perime ? `Plan calculé il y a ${humanAge(Math.max(0, Math.round((maintenantMs - Date.parse(plan.calcule_le)) / 60000)))} : relance le calcul pour tenir compte des dernières blessures. ` : ""}
          {manque > 0 ? `Les ${manque} derniers jours de la fenêtre ne sont pas encore couverts (calendrier ou projections inconnus).` : ""}
        </p>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-fg-muted">Toutes les soirées de ce plan sont passées : relance le calcul.</p>
      ) : (
        <>
          <label className="block">
            <span className="text-[13px] font-medium text-fg-muted">Date</span>
            <select
              className="field mt-1 w-full"
              value={choisie ?? ""}
              onChange={(e) => setDateId(e.target.value)}
              aria-label="Date du plan"
            >
              {options.map((o) => (
                <option key={o.date} value={o.date}>
                  {o.libelle} — {o.resume}
                </option>
              ))}
            </select>
          </label>

          {jour && (
            <DetailJour
              jour={jour}
              compte={compte}
              mode={mode}
              zoneLabel={zoneLabel}
              verrouille={
                jour.statut === "valide" &&
                !!jour.joueur &&
                !!verrous?.[jour.date] &&
                normaliserNom(verrous[jour.date]) === normaliserNom(jour.joueur)
              }
            />
          )}

          <details className="rounded-[14px] bg-surface-2 px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-medium text-fg-muted">Les {options.length} soirées d&apos;un coup d&apos;œil</summary>
            <ul className="mt-2 space-y-1 text-[13px]">
              {plan.jours
                .filter((j) => j.date >= aujourdhui)
                .map((j) => (
                  <li key={j.date} className="flex items-baseline justify-between gap-2 py-1.5">
                    <button className="text-left text-fg-muted" onClick={() => setDateId(j.date)}>
                      {frDate(j.date)}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-right font-medium text-fg">{j.joueur ?? "—"}</span>
                    <span className="num w-12 shrink-0 text-right text-fg-muted">
                      {j.projection !== null ? fmtNum(j.projection, 1) : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </details>
        </>
      )}

      {phrases.length > 0 && (
        <details className="text-[13px] text-fg-muted">
          <summary className="cursor-pointer font-medium">Comment cette formule choisit</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {phrases.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}

      {message && <Retour message={message} />}
      <p className="text-[12px] text-fg-muted">
        Le joueur du soir est celui du plan ; il est revu à chaque calcul selon les blessures et les absents saisis.
        {compte === COMPTE_AUTO
          ? " Le compte 02 pose automatiquement le n°1 de la formule Prudente et le remplace si son joueur devient Out, Doubtful ou absent (même un pick manuel validé). Un pick manuel validé n'est protégé que contre un changement de n°1."
          : ""}
      </p>
    </section>
  );
}

function Retour({ message }: { message: { ok: boolean; texte: string } }) {
  return (
    <p className={`rounded-[10px] px-3 py-2 text-[13px] ${message.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
      {message.texte}
    </p>
  );
}

const COMPTE_AUTO = "02"; // le compte géré par le robot (pick automatique + contrôle de 23h30)

// « Pick manuel validé » : tant que le joueur posé ce soir-là est celui-ci, le pick automatique ne le remplace pas par
// un autre n°1. Depuis le 2026-10-17 il est tout de même remplacé (pick auto et contrôle de 23h30) s'il devient Out,
// Doubtful ou absent. Réservé au compte 02 (les autres comptes ne sont jamais remplacés par le pick automatique).
function VerrouManuel({ jour, mode, verrouille }: { jour: JourPlan30; mode: Mode; verrouille: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();

  function agir() {
    setMessage(null);
    start(async () => {
      const res = verrouille
        ? await deverrouillerPickManuel(jour.date)
        : await verrouillerPickManuel(mode, jour.date, jour.joueur ?? "");
      setMessage(res.ok ? { ok: true, texte: res.message ?? "Enregistré." } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-1.5 border-t border-line pt-2">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[13px] ${verrouille ? "font-semibold text-avail" : "text-fg-muted"}`}>
          {verrouille ? "Pick manuel validé : gardé même si un autre joueur devient n°1 (remplacé s'il est Out, Doubtful ou absent)" : "Pick remplaçable par le robot"}
        </span>
        <button onClick={agir} disabled={pending} className="btn btn-plain btn-sm">
          {pending
            ? "…"
            : verrouille
              ? "Déverrouiller"
              : jour.statut === "valide"
                ? "Valider à la main"
                : "Poser et valider à la main"}
        </button>
      </div>
      {message && <Retour message={message} />}
    </div>
  );
}

function DetailJour({
  jour,
  compte,
  mode,
  zoneLabel,
  verrouille,
}: {
  jour: JourPlan30;
  compte: string;
  mode: Mode;
  zoneLabel: string;
  verrouille: boolean;
}) {
  if (jour.statut === "aucun" || !jour.joueur) {
    return (
      <div className="rounded-[14px] bg-surface-2 px-3 py-3">
        <p className="text-sm font-semibold text-fg">Aucun joueur pour le {frDate(jour.date)}</p>
        <p className="mt-0.5 text-[13px] text-fg-muted">Pas de match exploitable ou personne de disponible ce soir-là.</p>
      </div>
    );
  }
  const infos = [jour.equipe && jour.adversaire ? `${jour.equipe} vs ${jour.adversaire}` : null, jour.position]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="space-y-3 rounded-[14px] bg-surface-2 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-fg">{jour.joueur}</p>
          <p className="text-[13px] text-fg-muted">
            {infos}
            {jour.nb_matchs > 1 ? ` · ${jour.nb_matchs} matchs` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-[22px] font-bold text-fg">{jour.projection !== null ? fmtNum(jour.projection, 1) : "—"}</p>
          <p className="text-[12px] text-fg-muted">pts attendus</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {jour.statut === "valide" ? (
          <span className="text-[13px] font-semibold text-avail">Déjà pické pour cette soirée</span>
        ) : (
          <span className="text-[13px] text-fg-muted">Pick prévu par le plan</span>
        )}
        <PickZoneButton
          mode={mode}
          date={jour.date}
          player={jour.joueur}
          comptes={[compte]}
          zoneLabel={zoneLabel}
          dejaPicke={jour.statut === "valide"}
        />
      </div>

      {compte === COMPTE_AUTO && <VerrouManuel jour={jour} mode={mode} verrouille={verrouille} />}

      {jour.alternatives.length > 0 && (
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-fg-muted">Alternatives</p>
          <ul className="mt-1 space-y-1 text-[13px]">
            {jour.alternatives.map((a) => (
              <li key={a.joueur} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-fg">{a.joueur}</span>
                <span className="shrink-0 text-fg-muted">
                  {a.projection !== null ? `${fmtNum(a.projection, 1)} pts` : ""}
                  {a.reserve_le ? ` · réservé le ${frDate(a.reserve_le)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
