"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { annulerCommande } from "@/app/(app)/admin/actions";
import { ACTIONS_PC, STATUTS_COMMANDE } from "@/lib/admin";

export interface Commande {
  id: number;
  type: string;
  params: Record<string, unknown> | null;
  statut: string;
  demande_le: string;
  debut_le: string | null;
  fin_le: string | null;
  resume: string | null;
  sortie: string | null;
}

const libelle = (type: string) => ACTIONS_PC.find((a) => a.id === type)?.libelle ?? type;

function duree(c: Commande): string | null {
  if (!c.debut_le || !c.fin_le) return null;
  const s = Math.max(0, Math.round((new Date(c.fin_le).getTime() - new Date(c.debut_le).getTime()) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

const quand = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

// Historique des demandes. Tant qu'une demande est en attente ou en cours, la liste se rafraîchit toute seule.
export function HistoriqueCommandes({ commandes }: { commandes: Commande[] }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const enCours = commandes.some((c) => c.statut === "en_attente" || c.statut === "en_cours");

  useEffect(() => {
    if (!enCours) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [enCours, router]);

  function annuler(id: number) {
    setErreur(null);
    start(async () => {
      const res = await annulerCommande(id);
      if (res.ok) router.refresh();
      else setErreur(res.error);
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="section-label">Historique des demandes</h2>
      {erreur && <p className="rounded-[10px] bg-out/10 px-3 py-2 text-[13px] text-out">{erreur}</p>}
      {commandes.length === 0 ? (
        <p className="card px-4 py-6 text-center text-sm text-fg-muted">
          Aucune demande pour l&apos;instant.
        </p>
      ) : (
        <ul className="card overflow-hidden">
          {commandes.map((c) => {
            const st = STATUTS_COMMANDE[c.statut] ?? { label: c.statut, classe: "bg-surface-2 text-fg-muted" };
            const d = duree(c);
            return (
              <li key={c.id} className="border-b border-line px-4 py-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{libelle(c.type)}</p>
                    <p className="text-[13px] text-fg-muted">
                      {quand(c.demande_le)}
                      {d ? ` · ${d}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold ${st.classe}`}>{st.label}</span>
                </div>
                {c.resume && <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{c.resume}</p>}
                {c.statut === "en_attente" && (
                  <button
                    onClick={() => annuler(c.id)}
                    disabled={pending}
                    aria-label={`Annuler la demande ${libelle(c.type)}`}
                    className="mt-2 text-[13px] font-semibold text-out disabled:opacity-50"
                  >
                    Annuler
                  </button>
                )}
                {c.sortie && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[13px] font-medium text-court-400">Détail</summary>
                    <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-[10px] bg-surface-2 p-2.5 text-[11px] leading-snug text-fg-muted">
                      {c.sortie}
                    </pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
