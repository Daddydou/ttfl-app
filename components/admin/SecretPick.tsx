"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reglerSecret } from "@/app/(app)/secret/actions";
import { RevelerBouton } from "@/components/RevelerBouton";
import { Icon } from "@/components/ui/Icon";
import { majuscule } from "@/lib/format";

export interface SoireeSecreteVue {
  soiree: string;
  libelle: string; // « mar. 20/10 »
  cloture: string | null; // « 21:00 » (Paris)
  etat: "secrete" | "revelee_force" | "revelee_cloture";
}

// Interrupteur du pick secret du compte 02 et état des prochaines soirées. Ne montre jamais le joueur.
export function SecretPick({ actif, compte, soirees, lisible }: { actif: boolean; compte: string; soirees: SoireeSecreteVue[]; lisible: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [retour, setRetour] = useState<string | null>(null);

  function basculer() {
    setRetour(null);
    start(async () => {
      const res = await reglerSecret(!actif);
      setRetour(res.ok ? res.message : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-2" aria-label="Pick secret">
      <h2 className="section-label">Pick secret · compte {compte}</h2>
      <div className="card space-y-3 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 text-[16px] font-semibold leading-snug text-fg">
              {actif && <Icon name="cadenas" size={16} strokeWidth={2} className="shrink-0 text-court-400" />}
              {actif ? "Secret activé" : "Secret désactivé"}
            </h3>
            <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">
              {actif
                ? `Le joueur du compte ${compte} est caché dans l'application et dans les notifications jusqu'à la clôture de chaque soirée ; une notification te le donne à la clôture.`
                : "Tout est visible et aucune notification de clôture n'est envoyée."}
            </p>
            {!lisible && (
              <p className="mt-1 text-[13px] text-out">Réglage illisible : par prudence, tout reste caché.</p>
            )}
          </div>
          <button type="button" onClick={basculer} disabled={pending} className="btn btn-secondary btn-sm shrink-0">
            {pending ? "…" : actif ? "Désactiver" : "Activer"}
          </button>
        </div>
        {retour && <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-[13px] text-fg-muted">{retour}</p>}

        {actif && soirees.length > 0 && (
          <ul className="divide-y divide-line text-[13px]">
            {soirees.map((s) => (
              <li key={s.soiree} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-fg">
                  <span className="font-semibold">{majuscule(s.libelle)}</span>
                  <span className="text-fg-muted">{s.cloture ? ` · clôture ${s.cloture}` : " · clôture inconnue"}</span>
                </span>
                {s.etat === "secrete" ? (
                  <RevelerBouton soiree={s.soiree} libelle="Révéler" />
                ) : (
                  <span className="text-fg-muted">{s.etat === "revelee_force" ? "révélée à la main" : "révélée (clôture)"}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
