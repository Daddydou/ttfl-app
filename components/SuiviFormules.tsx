import { fmtNum } from "@/lib/format";
import { GLOUTON, rapportSuivi, type LigneSuivi } from "@/lib/suivi-formules";

const NOMS: Record<string, string> = {
  prudent: "Prudente",
  equilibre: "Équilibrée",
  ambitieux: "Ambitieuse",
  [GLOUTON]: "Glouton (base)",
};

// Comparaison des formules sur de vrais scores TTFL : chaque formule joue sur un compte virtuel (jamais envoyé sur TTFL).
export function SuiviFormules({ lignes }: { lignes: LigneSuivi[] }) {
  if (lignes.length === 0) return null;
  const r = rapportSuivi(lignes);
  return (
    <section className="card space-y-2 px-4 py-4" aria-label="Suivi des formules">
      <p className="section-label">Suivi des formules</p>
      {r.soirees === 0 ? (
        <p className="text-[13px] text-fg-muted">
          Pas encore de soirée notée pour toutes les formules ({r.enAttente} pick{r.enAttente > 1 ? "s" : ""} en attente du
          score réel, rempli le lendemain).
        </p>
      ) : (
        <>
          <p className="text-[13px] text-fg-muted">
            {r.soirees} soirée{r.soirees > 1 ? "s" : ""} comparée{r.soirees > 1 ? "s" : ""}, scores TTFL réels.
          </p>
          <ul className="space-y-1.5 text-[13px]">
            {r.formules.map((f) => (
              <li key={f.profil} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-fg">{NOMS[f.profil] ?? f.profil}</span>
                <span className="shrink-0 text-right text-fg-muted">
                  <span className="num font-semibold text-fg">{fmtNum(f.total, 0)} pts</span>
                  {f.moyenne !== null ? ` · ${fmtNum(f.moyenne, 1)}/soir` : ""}
                  {f.joursAZero > 0 ? ` · ${f.joursAZero} à 0` : ""}
                  {f.ecartGlouton !== null ? ` · ${f.ecartGlouton > 0 ? "+" : ""}${fmtNum(f.ecartGlouton, 0)} vs glouton` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-[12px] text-fg-muted">
        Chaque formule joue chaque soir son n°1, avec son propre cycle de 30 jours ; la base « glouton » prend la meilleure
        projection du soir sans stratégie. Rien n&apos;est envoyé sur TTFL.
      </p>
    </section>
  );
}
