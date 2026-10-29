import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanEquipe } from "@/components/PlanEquipe";
import type { HistoriqueJoueur } from "@/lib/types";
import type { JourPlan30, TtflPlan30 } from "@/lib/plan30";

// Plan 30 de l'équipe (comptes 03 à 12) : la forme du moment (5 derniers matchs) est dépliable pour chaque joueur
// dont le moteur a fourni l'historique ; les autres joueurs s'affichent comme avant (29/10/2026).
const jour = (date: string, joueur: string | null): JourPlan30 => ({
  date,
  statut: "plan",
  joueur,
  equipe: null,
  adversaire: null,
  position: null,
  projection: joueur ? 40 : null,
  nb_matchs: 1,
  alternatives: [],
});

const plan = (compte: string, parDate: Record<string, string | null>): TtflPlan30 => ({
  compte,
  profil: "equilibre",
  debut: "2026-10-29",
  reference: "2026-10-29",
  calcule_le: "2026-10-29T09:00:00Z",
  total_projection: null,
  reglages: { equipe: true },
  jours: Object.entries(parDate).map(([d, j]) => jour(d, j)),
});

const forme: HistoriqueJoueur = {
  recents: [
    { date: "2026-10-27", adv: "vs LAL", min: 38, ttfl: 36, pts: 20, reb: 9, pds: 5 },
    { date: "2026-10-25", adv: "@ MEM", min: 34, ttfl: 41, pts: 25, reb: 6, pds: 3 },
  ],
  n10: 2,
  moy5: 38.5,
  moy10: 38.5,
  min5: 36,
  min10: 36,
  pts10: 22.5,
  reb10: 7.5,
  pds10: 4,
  mediane10: 38.5,
  meilleur10: 41,
  pire10: 36,
  bons_soirs10: 1,
  ecart10: 2.5,
  saison: { n: 2, moy: 38.5 },
  prior: 31.7,
  poids_prior: 0.7,
};

const plans = [plan("03", { "2026-10-30": "Joueur Alpha" }), plan("04", { "2026-10-30": "Joueur Alpha" }), plan("05", { "2026-10-30": "Joueur Beta" })];

describe("PlanEquipe : forme du moment", () => {
  it("affiche la forme dépliable du joueur dont l'historique est connu, pas des autres", () => {
    const html = renderToStaticMarkup(
      <PlanEquipe plans={plans} aujourdhui="2026-10-29" maintenantMs={Date.parse("2026-10-29T10:00:00Z")} historiques={{ "joueur alpha": forme }} />,
    );
    expect(html).toContain("Joueur Alpha");
    expect(html).toContain("2 derniers matchs");
    expect(html).toContain("vs LAL");
    expect(html.match(/<details/g)?.length).toBe(2); // le bloc de l'équipe + la forme d'Alpha seulement
    expect(html).toContain("Joueur Beta");
  });

  it("sans historique : même affichage qu'avant, aucun bloc de forme", () => {
    const html = renderToStaticMarkup(
      <PlanEquipe plans={plans} aujourdhui="2026-10-29" maintenantMs={Date.parse("2026-10-29T10:00:00Z")} />,
    );
    expect(html).not.toContain("derniers matchs");
    expect(html.match(/<details/g)?.length).toBe(1);
    expect(html).toContain("Joueur Alpha");
  });
});
