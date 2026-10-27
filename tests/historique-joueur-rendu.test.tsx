import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoriqueJoueur } from "@/components/HistoriqueJoueur";
import type { HistoriqueJoueur as Historique } from "@/lib/types";

// Rendu serveur (sans DOM) : vérifie ce que l'utilisateur lit dans le détail d'une carte.
const h: Historique = {
  recents: [
    { date: "2026-10-25", adv: "vs LAL", min: 38, ttfl: 36, pts: 20, reb: 9, pds: 5 },
    { date: "2026-10-23", adv: "vs NO", min: 34, ttfl: 23, pts: 12, reb: 6, pds: 3 },
    { date: "2026-10-21", adv: "@ MEM", min: 36, ttfl: 41, pts: 25, reb: 8, pds: 6 },
  ],
  n10: 3,
  moy5: 33.3,
  moy10: 33.3,
  min5: 36,
  min10: 36,
  pts10: 19,
  reb10: 7.7,
  pds10: 4.7,
  mediane10: 36,
  meilleur10: 41,
  pire10: 23,
  bons_soirs10: 1,
  ecart10: 7.5,
  saison: { n: 3, moy: 33.3 },
  prior: 31.7,
  poids_prior: 0.7,
};

describe("HistoriqueJoueur (rendu)", () => {
  const html = renderToStaticMarkup(<HistoriqueJoueur h={h} />);

  it("liste les derniers matchs avec adversaire, minutes et score TTFL", () => {
    expect(html).toContain("3 derniers matchs");
    expect(html).toContain("dim. 25 oct.");
    expect(html).toContain("vs LAL");
    expect(html).toContain("@ MEM");
    expect(html).toContain("38 min");
    expect(html).toContain(">36<");
    expect(html).toContain(">41<");
  });

  it("explique la forme et affiche les repères", () => {
    expect(html).toContain("33,3 de moyenne TTFL sur ses 3 matchs de la saison");
    expect(html).toContain("70 % pour la saison passée");
    expect(html).toContain("Matchs à 40+");
    expect(html).toContain("1 sur 3");
    expect(html).toContain("Pts · reb · pds");
  });

  it("un seul match : libellé au singulier", () => {
    const un = renderToStaticMarkup(<HistoriqueJoueur h={{ ...h, recents: h.recents.slice(0, 1), n10: 1 }} />);
    expect(un).toContain("Dernier match");
    expect(un).toContain("son seul match de la saison");
  });
});
