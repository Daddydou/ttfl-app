import Link from "next/link";
import { frDate, humanAge } from "@/lib/format";
import {
  blessesParMatch,
  blessesSansEquipe,
  derniereMaj,
  libelleStatut,
  resumeBlesses,
  sourceBlesses,
  type Blesse,
  type EquipeBlessee,
  type MatchBlesses,
  type MatchSoiree,
} from "@/lib/blesses";
import { heureParis } from "@/lib/vainqueurs";

export function hrefBlesses(date: string | null): string {
  return date ? `/vainqueurs?vue=blesses&date=${date}` : "/vainqueurs?vue=blesses";
}

// Sous-onglets de la page Vainqueurs : les matchs, ou les blessés de la soirée.
export function VainqueursNav({ vue }: { vue: "matchs" | "blesses" }) {
  return (
    <div className="seg" role="tablist" aria-label="Vainqueurs">
      <Link href="/vainqueurs" role="tab" aria-selected={vue === "matchs"} className={`seg-item ${vue === "matchs" ? "seg-item-on" : ""}`}>
        Matchs
      </Link>
      <Link href={hrefBlesses(null)} role="tab" aria-selected={vue === "blesses"} className={`seg-item ${vue === "blesses" ? "seg-item-on" : ""}`}>
        Blessés
      </Link>
    </div>
  );
}

// Ce soir / demain (New York) : le moteur ne tient à jour que ces deux soirées.
export function DatesBlesses({ courant, aujourdhui, demain }: { courant: string; aujourdhui: string; demain: string }) {
  const items = [
    { date: aujourdhui, label: "Ce soir" },
    { date: demain, label: "Demain" },
  ];
  return (
    <div className="flex gap-1.5" role="tablist" aria-label="Soirée">
      {items.map((it) => (
        <Link
          key={it.date}
          href={hrefBlesses(it.date)}
          role="tab"
          aria-selected={courant === it.date}
          className={`chip ${courant === it.date ? "chip-on" : ""}`}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

// Un match = une liste déroulante fermée : la page reste légère, on ouvre seulement ce qui intéresse.
export function BlessesListe({
  date,
  matchs,
  blesses,
  maintenantMs,
}: {
  date: string;
  matchs: MatchSoiree[];
  blesses: Blesse[];
  maintenantMs: number;
}) {
  const parMatch = blessesParMatch(matchs, blesses);
  const sansEquipe = blessesSansEquipe(blesses);
  const resume = resumeBlesses(parMatch);
  const maj = derniereMaj(blesses);
  const source = sourceBlesses(blesses);

  if (matchs.length === 0) {
    return (
      <section className="card space-y-2 px-4 py-4" aria-label="Blessés">
        <p className="text-sm font-semibold text-fg">Aucun match relevé pour le {frDate(date)}.</p>
        <p className="text-[13px] text-fg-muted">Le calendrier est mis à jour chaque matin (Admin, « Mettre à jour les vainqueurs »).</p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <section className="card space-y-1 px-4 py-3" aria-label="Résumé des blessés">
        <p className="section-label">{frDate(date)}</p>
        {blesses.length === 0 ? (
          <p className="text-[13px] text-fg-muted">
            Aucun rapport de blessures lu pour cette soirée pour l&apos;instant : il arrive au fil de l&apos;après-midi (heure de New York).
          </p>
        ) : (
          <p className="text-[13px] text-fg-muted">
            <span className="font-semibold text-out">{resume.nbOut} Out</span>
            {" · "}
            <span className="font-semibold text-quest">{resume.nbDoubtful} Doubtful</span>
            {" · "}
            {resume.nbEquipesTouchees} équipe{resume.nbEquipesTouchees > 1 ? "s" : ""} touchée{resume.nbEquipesTouchees > 1 ? "s" : ""} sur{" "}
            {parMatch.length * 2}
          </p>
        )}
      </section>

      <ul className="space-y-2">
        {parMatch.map((m) => (
          <MatchBlesse key={m.match.event_id} m={m} commence={new Date(m.match.commence_time).getTime() <= maintenantMs} />
        ))}
      </ul>

      {sansEquipe.length > 0 && (
        <details className="card px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-fg">
            Équipe non identifiée ({sansEquipe.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {sansEquipe.map((b) => (
              <LigneBlesse key={b.joueur_norm} b={b} />
            ))}
          </ul>
        </details>
      )}

      <p className="px-1 text-[12px] text-fg-muted">
        {source === "espn"
          ? "Source : ESPN, statut actuel (« Day-To-Day » compte comme Doubtful)."
          : source === "nba"
            ? "Source : rapport officiel de la NBA."
            : ""}{" "}
        Out et Doubtful sont écartés du classement. Seuls les joueurs du rapport sont listés : les « Questionable » et
        « Probable » ne figurent pas ici.{" "}
        {maj ? `Mis à jour il y a ${humanAge(Math.max(0, Math.round((maintenantMs - Date.parse(maj)) / 60000)))}.` : ""}
      </p>
    </div>
  );
}

function MatchBlesse({ m, commence }: { m: MatchBlesses; commence: boolean }) {
  const ext = m.ext.abbr ?? m.ext.nom;
  const dom = m.dom.abbr ?? m.dom.nom;
  return (
    <li>
      <details className="rounded-[14px] bg-surface-2 px-3 py-2.5">
        <summary className="flex cursor-pointer items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[14px] font-semibold text-fg">
            {ext} <span className="font-normal text-fg-muted">@</span> {dom}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[12px]">
            {m.nbOut > 0 && <span className="rounded-full bg-out/10 px-2 py-0.5 font-semibold text-out">{m.nbOut} Out</span>}
            {m.nbDoubtful > 0 && (
              <span className="rounded-full bg-quest/15 px-2 py-0.5 font-semibold text-quest">{m.nbDoubtful} Doubtful</span>
            )}
            {m.nbOut + m.nbDoubtful === 0 && <span className="text-fg-muted">aucun</span>}
            <span className="text-fg-muted">
              {heureParis(m.match.commence_time)}
              {commence ? " · commencé" : ""}
            </span>
          </span>
        </summary>
        <div className="mt-2.5 space-y-3">
          <EquipeListe e={m.ext} />
          <EquipeListe e={m.dom} />
        </div>
      </details>
    </li>
  );
}

function EquipeListe({ e }: { e: EquipeBlessee }) {
  return (
    <div>
      <p className="section-label mb-1">{e.nom}</p>
      {e.joueurs.length === 0 ? (
        <p className="text-[13px] text-fg-muted">Aucun blessé signalé.</p>
      ) : (
        <ul className="space-y-1.5">
          {e.joueurs.map((b) => (
            <LigneBlesse key={b.joueur_norm} b={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LigneBlesse({ b }: { b: Blesse }) {
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-fg">{b.joueur}</p>
        {(b.motif || b.retour_prevu) && (
          <p className="text-[12px] text-fg-muted">
            {b.motif}
            {b.motif && b.retour_prevu ? " · " : ""}
            {b.retour_prevu ? `retour prévu le ${frDate(b.retour_prevu)}` : ""}
          </p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
          b.statut === "Out" ? "bg-out/10 text-out" : "bg-quest/15 text-quest"
        }`}
      >
        {libelleStatut(b)}
      </span>
    </li>
  );
}
