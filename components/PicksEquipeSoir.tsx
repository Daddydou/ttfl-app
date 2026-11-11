import Link from "next/link";
import { BadgeX2 } from "@/components/BadgeX2";
import { hrefConseilles } from "@/components/ConseillesNav";
import { normaliserNom, type PickLigne } from "@/lib/planning";
import type { Conseille, LigneSoiree } from "@/lib/conseilles";
import { fmt } from "@/lib/stats-outils";
import { x2Pour, type CarteX2 } from "@/lib/x2-affichage";

// « L'équipe ce soir » (Conseillés > Équipe > Tous) : UNE ligne par compte 03 à 12 avec son pick de la soirée, sa
// projection et son rang dans les conseillés du jour, puis les 3 meilleurs autres choix encore libres POUR CE COMPTE
// (le blocage de 30 jours est propre à chaque compte). Lecture seule : toucher une ligne ouvre le classement du compte.

const NB_AUTRES = 3;

export interface LigneCompte {
  compte: string;
  pick: string | null;
  projection: number | null;
  rang: number | null; // rang dans les conseillés de la zone (null = hors du top affiché)
  alerte: "out" | "incertain" | null; // statut du joueur pické : Out / Doubtful, ou Questionable
  autres: { player: string; projection: number | null }[];
}

const SANS_PROBLEME = new Set(["", "available", "probable"]);

function alerteDe(status: string | null | undefined): LigneCompte["alerte"] {
  const s = String(status ?? "").trim().toLowerCase();
  if (SANS_PROBLEME.has(s)) return null;
  return s === "out" || s === "doubtful" ? "out" : "incertain";
}

// Logique pure (testée dans tests/picks-equipe-soir.test.ts).
export function lignesEquipeSoir({
  comptes,
  date,
  picks,
  conseilles,
  lignes,
}: {
  comptes: string[];
  date: string;
  picks: PickLigne[];
  conseilles: Conseille[];
  lignes: LigneSoiree[];
}): LigneCompte[] {
  return comptes.map((compte) => {
    const pick = picks.find((p) => p.pick_date === date && p.compte === compte)?.player ?? null;
    const cle = pick ? normaliserNom(pick) : null;
    const ligne = cle ? lignes.find((l) => normaliserNom(l.player) === cle) : undefined;
    const dansTop = cle ? conseilles.find((c) => normaliserNom(c.player) === cle) : undefined;
    return {
      compte,
      pick,
      projection: ligne?.projection ?? null,
      rang: dansTop?.rang ?? null,
      alerte: ligne ? alerteDe(ligne.status) : null,
      autres: conseilles
        .filter((c) => c.comptesLibres.includes(compte) && normaliserNom(c.player) !== cle)
        .slice(0, NB_AUTRES)
        .map((c) => ({ player: c.player, projection: c.projection })),
    };
  });
}

function nomCourt(nom: string): string {
  const mots = nom.trim().split(/\s+/);
  return mots.length <= 1 ? nom : `${mots[0][0]}. ${mots.slice(1).join(" ")}`;
}

export function PicksEquipeSoir({
  comptes,
  date,
  picks,
  conseilles,
  lignes,
  x2,
}: {
  comptes: string[];
  date: string;
  picks: PickLigne[];
  conseilles: Conseille[];
  lignes: LigneSoiree[];
  x2?: CarteX2;
}) {
  const rows = lignesEquipeSoir({ comptes, date, picks, conseilles, lignes });
  const sansPick = rows.filter((r) => !r.pick).length;
  const nJoueurs = new Set(rows.filter((r) => r.pick).map((r) => normaliserNom(r.pick!))).size;

  return (
    <section className="card overflow-hidden" aria-label="Picks de l'équipe ce soir">
      <div className="px-4 pb-2 pt-4">
        <p className="section-label">L&apos;équipe ce soir</p>
        <p className="mt-0.5 text-[13px] text-fg-muted">
          {nJoueurs > 0 ? `${nJoueurs} joueur${nJoueurs > 1 ? "s" : ""} différent${nJoueurs > 1 ? "s" : ""}` : "Aucun pick posé"}
          {sansPick > 0 && nJoueurs > 0 ? ` · ${sansPick} compte${sansPick > 1 ? "s" : ""} sans pick` : ""}. Touche un compte pour
          voir son classement.
        </p>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.compte}>
            <Link href={hrefConseilles(date, "equipe", r.compte)} className="block px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="w-6 shrink-0 text-[13px] font-bold tabular-nums text-fg-muted">{r.compte}</span>
                  <span className={`truncate text-[15px] ${r.pick ? "font-semibold text-fg" : "text-fg-muted"}`}>
                    {r.pick ?? "Pas de pick"}
                  </span>
                  {r.pick && <BadgeX2 etat={x2Pour(x2, r.compte, date, r.pick)} />}
                  {r.alerte && (
                    <span className={`shrink-0 text-[11px] font-semibold ${r.alerte === "out" ? "text-out" : "text-fg-muted"}`}>
                      {r.alerte === "out" ? "Out / Doubtful" : "Incertain"}
                    </span>
                  )}
                </span>
                {r.pick && (
                  <span className="shrink-0 text-[13px] tabular-nums text-fg-muted">
                    {fmt(r.projection)}
                    {r.rang ? ` · n°${r.rang}` : " · hors top"}
                  </span>
                )}
              </div>
              {r.autres.length > 0 && (
                <p className="mt-0.5 pl-8 text-[12px] leading-snug text-fg-muted">
                  {r.pick ? "Autres choix" : "Choix possibles"} :{" "}
                  {r.autres.map((a) => `${nomCourt(a.player)} ${fmt(a.projection)}`).join(" · ")}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
