import { describe, expect, it } from "vitest";
import { dateCourte, indexerHistoriques, lectureForme, reperes, tendance } from "@/lib/forme-joueur";
import type { HistoriqueJoueur } from "@/lib/types";

const base: HistoriqueJoueur = {
  recents: [{ date: "2026-10-25", adv: "vs MEM", min: 35, ttfl: 37, pts: 15, reb: 15, pds: 3 }],
  n10: 10,
  moy5: 42,
  moy10: 38,
  min5: 34,
  min10: 33,
  pts10: 18.2,
  reb10: 9,
  pds10: 4.5,
  mediane10: 37,
  meilleur10: 55,
  pire10: 21,
  bons_soirs10: 3,
  ecart10: 9.4,
  saison: { n: 10, moy: 38 },
};

describe("forme du joueur", () => {
  it("date courte : jour, numéro et mois, sans dépendre du fuseau", () => {
    expect(dateCourte("2026-10-25")).toBe("dim. 25 oct.");
    expect(dateCourte("pas une date")).toBe("pas une date");
  });

  it("tendance : hausse, baisse, stable, et rien sous 6 matchs", () => {
    expect(tendance(base)).toBe("hausse");
    expect(tendance({ ...base, moy5: 33 })).toBe("baisse");
    expect(tendance({ ...base, moy5: 38.5 })).toBe("stable");
    expect(tendance({ ...base, n10: 5 })).toBeNull();
  });

  it("lecture : moyenne sur 10 matchs, minutes et tendance", () => {
    const t = lectureForme(base);
    expect(t).toContain("38,0 de moyenne TTFL sur ses 10 derniers matchs");
    expect(t).toContain("33 min par match");
    expect(t).toContain("en hausse");
    expect(t).not.toContain("saison passée");
  });

  it("début de saison : peu de matchs et poids de la saison passée expliqués", () => {
    const h: HistoriqueJoueur = { ...base, n10: 3, saison: { n: 3, moy: 49.3 }, moy10: 49.3, moy5: 49.3, prior: 31.7, poids_prior: 0.7 };
    const t = lectureForme(h);
    expect(t).toContain("sur ses 3 matchs de la saison");
    expect(t).toContain("31,7 de moyenne");
    expect(t).toContain("70 % pour la saison passée");
    expect(tendance(h)).toBeNull();
  });

  it("aucun match joué : phrase dédiée", () => {
    expect(lectureForme({ ...base, n10: 0, moy10: null })).toBe("Pas encore de match joué cette saison.");
  });

  it("repères : tous présents à 10 matchs, sans doublon quand la saison tient dans les 10", () => {
    const libelles = reperes(base).map((r) => r.libelle);
    expect(libelles).toContain("Moyenne 5 matchs");
    expect(libelles).toContain("Moyenne 10 matchs");
    expect(libelles).toContain("Matchs à 40+");
    expect(libelles.some((l) => l.startsWith("Saison"))).toBe(false);
    expect(reperes({ ...base, saison: { n: 24, moy: 36.2 } }).map((r) => r.libelle)).toContain("Saison (24 matchs)");
  });

  it("repères : peu de matchs, on n'affiche pas ce qui n'a pas de sens", () => {
    const h: HistoriqueJoueur = { ...base, n10: 2, moy5: 20, moy10: 20, ecart10: null, saison: { n: 2, moy: 20 } };
    const libelles = reperes(h).map((r) => r.libelle);
    expect(libelles).not.toContain("Médiane");
    expect(libelles).not.toContain("Moyenne 5 matchs");
    expect(libelles).not.toContain("Irrégularité (± pts)");
    expect(libelles).toContain("Moyenne 2 matchs");
  });

  it("index par nom : la première ligne rencontrée (la plus récente) gagne", () => {
    const recent = { ...base, moy10: 40 };
    const ancien = { ...base, moy10: 30 };
    const idx = indexerHistoriques(
      [
        { player: "Luka Dončić", historique: recent },
        { player: "Luka Dončić", historique: ancien },
        { player: "Sans historique", historique: null },
      ],
      (n) => n.toLowerCase(),
    );
    expect(Object.keys(idx)).toEqual(["luka dončić"]);
    expect(idx["luka dončić"].moy10).toBe(40);
  });
});
