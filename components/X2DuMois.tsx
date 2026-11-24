import { libelleMois } from "@/lib/x2";
import type { CelluleResumeX2, EtatX2Mois, ResumeCompteX2, SyntheseX2 } from "@/lib/x2-resume";

// Où en est le x2 de chaque compte : posé et validé ce mois-ci ? prévu les jours suivants ? Lecture seule.
// Pas d'orange (réservé aux actions, DESIGN.md) : le vert = validé, le rouge = à regarder.
const LIBELLES: Record<EtatX2Mois, { texte: string; classe: string }> = {
  valide: { texte: "Posé et validé", classe: "text-avail" },
  pose_avenir: { texte: "Posé sur le site, soirée à venir", classe: "text-fg" },
  prevu: { texte: "Prévu, pas encore posé", classe: "text-fg-muted" },
  non_pose: { texte: "Prévu mais jamais posé", classe: "text-out" },
  retrait: { texte: "Retrait demandé", classe: "text-fg-muted" },
  echec: { texte: "Échec de pose, nouvel essai", classe: "text-out" },
  retire_main: { texte: "Retiré à la main sur le site", classe: "text-out" },
  secret: { texte: "🔒 secret", classe: "text-fg-muted" },
  aucun: { texte: "Aucun x2 prévu", classe: "text-fg-faint" },
};

function Ligne({ c, titre }: { c: CelluleResumeX2; titre?: string }) {
  const l = LIBELLES[c.etat];
  return (
    <div className="min-w-0">
      {titre && <span className="mr-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-fg-faint">{titre}</span>}
      <span className={`text-[13px] font-semibold ${l.classe}`}>{l.texte}</span>
      {c.date && (
        <span className="text-[13px] text-fg-muted">
          {" "}· {c.date}
          {c.joueur ? ` · ${c.joueur}` : ""}
        </span>
      )}
    </div>
  );
}

export function X2DuMois({ resume, synthese }: { resume: ResumeCompteX2[]; synthese: SyntheseX2 }) {
  const mois = libelleMois(synthese.mois);
  const parties = [
    `${synthese.valides} validé${synthese.valides > 1 ? "s" : ""}`,
    `${synthese.aVenir} à venir`,
    ...(synthese.problemes > 0 ? [`${synthese.problemes} à vérifier`] : []),
    `${synthese.sans} sans x2`,
  ];
  return (
    <details className="card px-4 py-3">
      <summary className="cursor-pointer list-none">
        <span className="text-[14px] font-semibold text-fg">x2 de {mois}</span>
        <span className="ml-2 text-[13px] text-fg-muted">{parties.join(" · ")}</span>
      </summary>
      <ul className="mt-3 divide-y divide-line">
        {resume.map((r) => (
          <li key={r.compte} className="flex gap-3 py-2">
            <span className="w-8 shrink-0 text-[14px] font-bold text-fg num">{r.compte}</span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <Ligne c={r.ceMois} />
              {r.moisSuivant && r.moisSuivant.etat !== "aucun" && <Ligne c={r.moisSuivant} titre="mois suivant" />}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] leading-snug text-fg-muted">
        « Validé » = x2 posé sur le site et soirée jouée (les points comptent double). Le x2 se pose depuis Plus &gt; Admin &gt;
        x2 ou avec la case « Poser aussi le x2 » en choisissant un joueur.
      </p>
    </details>
  );
}
