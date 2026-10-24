"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renouvelerCookie } from "@/app/(app)/admin/cookies-actions";
import { LIBELLES_COOKIE, resumeCookies, type LigneCookie } from "@/lib/cookies";

// Admin > Cookies : âge du cookie de chaque compte et renouvellement depuis le téléphone. La valeur collée part vers
// GitHub (secret COOKIE_xx) et n'est ni affichée, ni gardée dans la page après l'envoi.
export function Cookies({ lignes, secretsPrets, maintenantMs }: { lignes: LigneCookie[]; secretsPrets: boolean; maintenantMs: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [valeur, setValeur] = useState("");
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const resume = resumeCookies(lignes, maintenantMs);
  const aRenouveler = resume.filter((r) => r.statut === "bientot" || r.statut === "expire").length;

  function envoyer(compte: string) {
    setRetour(null);
    start(async () => {
      const res = await renouvelerCookie(compte, valeur);
      setValeur(""); // la valeur ne reste jamais à l'écran
      if (res.ok) {
        setOuvert(null);
        setRetour({ ok: true, texte: res.message });
        router.refresh();
      } else {
        setRetour({ ok: false, texte: res.error });
      }
    });
  }

  return (
    <section className="space-y-2" aria-labelledby="titre-cookies">
      <h2 id="titre-cookies" className="sr-only">Cookies TTFL</h2>
      <div className="card space-y-3 px-4 py-3.5">
        <p className="text-[13px] leading-snug text-fg-muted">
          Chaque compte garde sa connexion avec un cookie qui dure environ 2 mois.{" "}
          {aRenouveler > 0
            ? `${aRenouveler} compte${aRenouveler > 1 ? "s" : ""} à renouveler bientôt.`
            : "Tout est à jour."}{" "}
          Pour renouveler : connecte-toi au site TTFL avec « se souvenir de moi », copie le cookie (TTFLhash et TTFLmail),
          colle-le ici.
        </p>
        {!secretsPrets && (
          <p className="rounded-[10px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
            Le renouvellement depuis l&apos;application n&apos;est pas encore activé : il manque le jeton GitHub des secrets
            (GITHUB_SECRETS_TOKEN sur Vercel).
          </p>
        )}
        <ul className="divide-y divide-line">
          {resume.map((r) => (
            <li key={r.compte} className="py-2">
              <div className="flex items-center justify-between gap-2 text-[14px]">
                <span className="font-semibold text-fg">Compte {r.compte}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-[12px] font-medium ${LIBELLES_COOKIE[r.statut].classe}`}>
                    {LIBELLES_COOKIE[r.statut].texte}
                    {r.jours !== null ? ` · ${r.estime ? "≈ " : ""}${r.jours} j` : ""}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={pending || !secretsPrets}
                    onClick={() => {
                      setOuvert(ouvert === r.compte ? null : r.compte);
                      setValeur("");
                      setRetour(null);
                    }}
                  >
                    Renouveler
                  </button>
                </span>
              </div>
              {ouvert === r.compte && (
                <div className="mt-2 space-y-2">
                  <label className="block text-[12px] text-fg-muted" htmlFor={`cookie-${r.compte}`}>
                    Cookie du compte {r.compte}
                  </label>
                  <textarea
                    id={`cookie-${r.compte}`}
                    value={valeur}
                    onChange={(e) => setValeur(e.target.value)}
                    rows={3}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="TTFLhash=…; TTFLmail=…"
                    className="w-full rounded-[10px] bg-surface-2 px-3 py-2 text-[13px] text-fg ring-1 ring-line"
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-plain w-full" disabled={pending} onClick={() => { setOuvert(null); setValeur(""); }}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      disabled={pending || valeur.trim().length < 20}
                      onClick={() => envoyer(r.compte)}
                    >
                      {pending ? "…" : "Enregistrer"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {retour && (
          <p className={`rounded-[10px] px-3 py-2 text-[13px] ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
            {retour.texte}
          </p>
        )}
      </div>
    </section>
  );
}
