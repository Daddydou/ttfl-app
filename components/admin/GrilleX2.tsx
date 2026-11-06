"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retirerX2 } from "@/app/(app)/admin/x2-actions";
import { LIBELLES_STATUT, MOIS_SAISON, type StatutX2 } from "@/lib/x2";

export interface CelluleX2 {
  mois: string;
  statut: StatutX2;
  date: string; // JJ/MM
  joueur: string | null; // null = masqué (soirée secrète)
  source: string;
  message: string | null;
}
export interface LigneGrille {
  compte: string;
  cellules: Record<string, CelluleX2 | null>;
}

const NOM_MOIS = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }).replace(".", "");

// Les 6 mois de la saison par compte : où est (ou sera) chaque x2. Retirer = le robot l'enlève du site au prochain passage.
export function GrilleX2({ lignes }: { lignes: LigneGrille[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

  function retirer(compte: string, mois: string) {
    setRetour(null);
    start(async () => {
      const res = await retirerX2(compte, mois);
      setRetour(res.ok ? { ok: true, texte: res.message } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-2" aria-labelledby="titre-grille-x2">
      <h2 id="titre-grille-x2" className="section-label">Les x2 de la saison</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[13px]">
          <thead>
            <tr className="text-fg-muted">
              <th className="px-3 py-2 font-semibold">Cpt</th>
              {MOIS_SAISON.map((m) => <th key={m} className="px-2 py-2 font-semibold capitalize">{NOM_MOIS(m)}</th>)}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.compte} className="border-t border-line align-top">
                <td className="px-3 py-2 font-semibold text-fg">{l.compte}</td>
                {MOIS_SAISON.map((m) => {
                  const c = l.cellules[m];
                  return (
                    <td key={m} className="px-2 py-2">
                      {c && c.joueur === null ? (
                        <div className="text-fg-muted" title="Pick secret jusqu'à la clôture de la soirée">🔒 secret</div>
                      ) : c ? (
                        <div title={c.message ?? LIBELLES_STATUT[c.statut]}>
                          <div className="font-semibold text-fg">{c.date}</div>
                          <div className="max-w-[88px] truncate text-fg-muted">{c.joueur}</div>
                          <div className="text-[11px] text-fg-muted">{LIBELLES_STATUT[c.statut].split(" (")[0]}</div>
                          {c.statut !== "a_retirer" && (
                            <button type="button" disabled={pending} onClick={() => retirer(l.compte, m)}
                              className="mt-0.5 text-[12px] font-semibold text-out active:opacity-60">
                              Retirer
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {retour && (
        <p className={`rounded-[10px] px-3 py-2 text-[13px] ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
          {retour.texte}
        </p>
      )}
    </section>
  );
}
