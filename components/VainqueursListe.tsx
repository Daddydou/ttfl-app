"use client";

import { Icon } from "@/components/ui/Icon";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { choisirVainqueur, revenirAuFavori } from "@/app/actions";
import { frDate, humanAge } from "@/lib/format";
import { BlessesMatch, BlessesSansEquipe } from "@/components/BlessesMatch";
import { blessesDuMatch, blessesSansEquipe, derniereMaj, type Blesse } from "@/lib/blesses";
import {
  bilanSoiree,
  choixEffectif,
  commence,
  etatKt,
  heureParis,
  nomEquipe,
  parSoiree,
  pourcent,
  probabilite,
  type ChoixVainqueur,
  type Cote,
  type MatchVainqueur,
  type PronoKt,
} from "@/lib/vainqueurs";

// Liste des matchs avec le favori des bookmakers déjà choisi. Un choix posé ici est « manuel » : le moteur ne l'écrase
// jamais. Plus de changement possible dès que le match a commencé.
export function VainqueursListe({
  matchs,
  choix,
  kt = [],
  blesses = [],
  maintenantMs,
}: {
  matchs: MatchVainqueur[];
  choix: ChoixVainqueur[];
  kt?: PronoKt[];
  blesses?: Blesse[];
  maintenantMs: number;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const parMatch = new Map(choix.map((c) => [c.event_id, c]));
  const parMatchKt = new Map(kt.map((k) => [k.event_id, k]));
  const soirees = parSoiree(matchs);
  const dernierReleve = matchs.map((m) => m.releve_le).filter((x): x is string => !!x).sort().pop() ?? null;

  function agir(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setErreur(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setErreur(res.error);
    });
  }

  if (soirees.length === 0) {
    return (
      <section className="card space-y-2 px-4 py-4" aria-label="Vainqueurs">
        <p className="text-sm font-semibold text-fg">Aucun match relevé pour l&apos;instant.</p>
        <p className="text-[13px] text-fg-muted">
          Le calendrier NBA et les vainqueurs réels sont mis à jour chaque matin. Pour le faire tout de suite : Admin, « Mettre à jour les vainqueurs ».
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {erreur && <p className="rounded-[10px] bg-out/10 px-3 py-2 text-[13px] text-out">{erreur}</p>}
      {soirees.map((s) => {
        const b = bilanSoiree(s.matchs, parMatch, parMatchKt);
        return (
          <section key={s.date} className="card space-y-3 px-4 py-4" aria-label={`Soirée du ${s.date}`}>
            <div>
              <p className="section-label">{frDate(s.date)}</p>
              <p className="mt-0.5 text-[13px] text-fg-muted">
                {b.nbMatchs} match{b.nbMatchs > 1 ? "s" : ""}
                {b.nbSerres > 0 ? ` · ${b.nbSerres} serré${b.nbSerres > 1 ? "s" : ""}` : ""}
                {b.nbManuels > 0 ? ` · ${b.nbManuels} choisi${b.nbManuels > 1 ? "s" : ""} à la main` : ""}
                {b.nbChezThomas > 0 ? ` · ${b.nbChezThomas} validé${b.nbChezThomas > 1 ? "s" : ""} chez Thomas` : ""}
                {b.nbJuges > 0 ? ` · ${b.nbBons}/${b.nbJuges} bon${b.nbBons > 1 ? "s" : ""}` : ""}
              </p>
            </div>
            <ul className="space-y-3">
              {s.matchs.map((m) => {
                const c = parMatch.get(m.event_id);
                const effectif = choixEffectif(m, c);
                const ferme = commence(m, maintenantMs);
                return (
                  <li key={m.event_id} className="space-y-1.5 rounded-[14px] bg-surface-2 px-3 py-2.5">
                    <div className="flex items-center justify-between text-[12px] text-fg-muted">
                      <span>
                        {heureParis(m.commence_time)}
                        {ferme ? " · commencé" : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        {m.prob_dom == null && !m.resultat && (
                          <span className="rounded-full bg-surface px-2 py-0.5 font-medium text-fg-muted">cotes pas encore publiées</span>
                        )}
                        {m.serre && <span className="rounded-full bg-quest/15 px-2 py-0.5 font-semibold text-quest">serré</span>}
                        {c?.source === "manuel" && <span className="rounded-full bg-court-500/15 px-2 py-0.5 font-semibold text-court-400">manuel</span>}
                        {m.resultat && effectif && (
                          <span className={`font-semibold ${effectif === m.resultat ? "text-avail" : "text-out"}`}>
                            {effectif === m.resultat ? "bon" : "raté"}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ext", "dom"] as Cote[]).map((cote) => (
                        <EquipeBouton
                          key={cote}
                          nom={nomEquipe(m, cote)}
                          domicile={cote === "dom"}
                          proba={probabilite(m, cote)}
                          choisie={effectif === cote}
                          gagnante={m.resultat === cote}
                          desactive={ferme || pending}
                          onClick={() => {
                            if (effectif !== cote) agir(() => choisirVainqueur(m.event_id, cote));
                          }}
                        />
                      ))}
                    </div>
                    <LigneKt m={m} effectif={effectif} kt={parMatchKt.get(m.event_id)} choixMaj={c?.maj_le ?? null} />
                    <BlessesMatch m={blessesDuMatch(m, blesses)} />
                    {c?.source === "manuel" && m.favori && c.choix !== m.favori && !ferme && (
                      <button
                        className="text-[12px] font-medium text-court-400"
                        disabled={pending}
                        onClick={() => agir(() => revenirAuFavori(m.event_id))}
                      >
                        Revenir au favori ({nomEquipe(m, m.favori)})
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <BlessesSansEquipe blesses={blessesSansEquipe(blesses)} />
      <p className="px-1 text-[12px] text-fg-muted">
        Favori = cote la plus basse (médiane des bookmakers, marge retirée). 1 point par bon vainqueur, pronostic possible
        jusqu&apos;au coup d&apos;envoi. Tous les matchs NBA des prochains jours sont listés ; les cotes (et donc le favori) arrivent
        quand les bookmakers les publient, en général la veille ou le jour même. Tu peux déjà pronostiquer un match sans cote. « Validé chez Thomas » = ce que l&apos;API de Game Tracker a enregistré, relu par le moteur à chaque passage. Quand tu changes un choix, l&apos;envoi chez Thomas part dans les 2 à 4 minutes. {dernierReleve ? `Dernier relevé il y a ${humanAge(Math.max(0, Math.round((maintenantMs - Date.parse(dernierReleve)) / 60000)))}.` : ""}
      </p>
      {blesses.length > 0 && (
        <p className="px-1 text-[12px] text-fg-muted">
          Blessés : seuls les Out et les Doubtful sont listés (ils sont écartés du classement), pour ce soir (rapport officiel de
          la NBA) et demain (ESPN, « Day-To-Day » compte comme Doubtful). Les « Questionable » et « Probable » n&apos;y figurent
          pas. {blessesMajTexte(blesses, maintenantMs)}
        </p>
      )}
    </div>
  );
}

function blessesMajTexte(blesses: Blesse[], maintenantMs: number): string {
  const maj = derniereMaj(blesses);
  return maj ? `Mis à jour il y a ${humanAge(Math.max(0, Math.round((maintenantMs - Date.parse(maj)) / 60000)))}.` : "";
}

// Ce qui est enregistré chez Thomas pour ce match, comparé à notre choix.
function LigneKt({
  m,
  effectif,
  kt,
  choixMaj = null,
}: {
  m: MatchVainqueur;
  effectif: Cote | null;
  kt: PronoKt | undefined;
  choixMaj?: string | null;
}) {
  const etat = etatKt(effectif, kt);
  if (etat === "inconnu") return null;
  // Choix changé après la dernière relecture de Thomas : l'envoi part dans les minutes qui suivent (passage « vainqueurs »).
  const enAttente = !!choixMaj && !!kt?.maj_le && Date.parse(choixMaj) > Date.parse(kt.maj_le);
  if (etat === "vide") {
    return (
      <p className="text-[12px] text-fg-muted">
        {enAttente ? "Envoi chez Thomas en cours (quelques minutes)…" : "Rien de posé chez Thomas pour l'instant"}
      </p>
    );
  }
  const nom = nomEquipe(m, kt!.cote!);
  if (etat === "identique")
    return (
      <p className="flex items-center gap-1 text-[12px] font-medium text-avail">
        <Icon name="coche" size={13} strokeWidth={2.4} className="shrink-0" />
        Validé chez Thomas : {nom}
      </p>
    );
  if (enAttente) {
    return (
      <p className="text-[12px] font-medium text-fg-muted">
        Envoi chez Thomas en cours (quelques minutes)… pour l&apos;instant chez lui : {nom}
      </p>
    );
  }
  return (
    <p className="text-[12px] font-medium text-quest">
      Chez Thomas : {nom} (différent de ton choix{effectif ? ` : ${nomEquipe(m, effectif)}` : ""})
    </p>
  );
}

function EquipeBouton({
  nom,
  domicile,
  proba,
  choisie,
  gagnante,
  desactive,
  onClick,
}: {
  nom: string;
  domicile: boolean;
  proba: number | null;
  choisie: boolean;
  gagnante: boolean;
  desactive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={desactive}
      aria-pressed={choisie}
      className={`rounded-[12px] px-2.5 py-2 text-left transition ${
        choisie ? "bg-court-500/20 ring-2 ring-court-500" : "bg-surface-2 ring-1 ring-line"
      } ${desactive && !choisie ? "opacity-60" : ""}`}
    >
      <span className="block truncate text-[14px] font-semibold text-fg">{nom}</span>
      {/* Sur le fond orangé, le gris secondaire tombe à 4:1 : texte principal adouci à la place. */}
      <span className={`flex items-baseline justify-between text-[12px] ${choisie ? "text-fg/80" : "text-fg-muted"}`}>
        <span>{domicile ? "à domicile" : "à l'extérieur"}</span>
        <span className={`num font-semibold ${gagnante ? "text-avail" : "text-fg"}`}>{pourcent(proba)}</span>
      </span>
    </button>
  );
}
