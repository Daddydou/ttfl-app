import { frDate } from "@/lib/format";
import { libelleStatut } from "@/lib/blesses";
import { formaterMoyenne, TAILLE_TOP, type SoireeStars } from "@/lib/stars-absentes";

// Stars absentes : joueurs du top 30 des moyennes TTFL de la saison qui sont Out ou Doubtful, soirée par soirée.
// Lecture seule : tout vient du moteur (ttfl_blesses + ttfl_classement_moyennes).
export function StarsAbsentes({ soirees, classementMaj }: { soirees: SoireeStars[]; classementMaj?: string | null }) {
  return (
    <section>
      <h2 className="section-label mb-2">Stars absentes (top {TAILLE_TOP} des moyennes)</h2>
      {soirees.length === 0 ? (
        <div className="card px-4 py-6 text-center text-sm text-fg-muted">
          Aucune star du top {TAILLE_TOP} n&apos;est signalée Out ou Doubtful pour l&apos;instant.
        </div>
      ) : (
        <div className="space-y-2">
          {soirees.map((s) => (
            <div key={s.game_date} className="card px-4 py-3">
              <p className="mb-1.5 text-[13px] font-semibold text-fg">
                Soirée du {frDate(s.game_date)} · {s.stars.length} star{s.stars.length > 1 ? "s" : ""}
              </p>
              <ul className="space-y-1.5">
                {s.stars.map((b) => (
                  <li key={`${b.game_date}-${b.joueur_norm}`} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-fg">
                        <span className="mr-1.5 text-[12px] font-bold text-fg-muted">n°{b.rang}</span>
                        {b.joueur}
                        {b.equipe_abbr ? <span className="ml-1.5 text-[12px] text-fg-muted">{b.equipe_abbr}</span> : null}
                      </p>
                      <p className="text-[12px] text-fg-muted">
                        {b.moyenne !== null ? `moy. ${formaterMoyenne(b.moyenne)}` : ""}
                        {b.moyenne !== null && (b.motif || b.retour_prevu) ? " · " : ""}
                        {b.motif}
                        {b.motif && b.retour_prevu ? " · " : ""}
                        {b.retour_prevu ? `retour prévu le ${frDate(b.retour_prevu)}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                        b.statut === "Out" ? "bg-out/10 text-out" : "bg-quest/15 text-quest"
                      }`}
                    >
                      {libelleStatut(b)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[12px] text-fg-muted">
        Mis à jour à chaque passage du moteur
        {classementMaj ? ` · classement du ${frDate(classementMaj.slice(0, 10))}` : ""}. Une notification te prévient aussi
        sur le téléphone.
      </p>
    </section>
  );
}
