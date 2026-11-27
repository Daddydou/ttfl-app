import { describe, it, expect } from "vitest";
import { COMPTES_CE_SOIR, comptesPosesSurTtfl, hrefConseilles } from "@/lib/ce-soir-comptes";

describe("COMPTES_CE_SOIR", () => {
  it("liste les 13 comptes dans l'ordre 01, 02, 03 à 12, 13", () => {
    expect(COMPTES_CE_SOIR).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"]);
  });
});

describe("hrefConseilles", () => {
  it("01, 02 et 13 ont leur zone ; 03 à 12 passent par la zone équipe vue pour un compte", () => {
    expect(hrefConseilles("01")).toBe("/ce-soir?pour=c01");
    expect(hrefConseilles("02")).toBe("/ce-soir?pour=c02");
    expect(hrefConseilles("13")).toBe("/ce-soir?pour=c13");
    expect(hrefConseilles("07")).toBe("/ce-soir?pour=equipe&compte=07");
  });
});

describe("comptesPosesSurTtfl", () => {
  const picks = [
    { compte: "01", player: "Giannis Antetokounmpo" },
    { compte: "03", player: "Tyler Herro" },
    { compte: "05", player: "Jaylen Brown" },
  ];

  it("un compte est posé quand le site a CONFIRMÉ le même joueur que le pick voulu", () => {
    const poses = comptesPosesSurTtfl(
      [
        { compte: "01", joueur: "Giannis Antetokounmpo", joueur_site: "Giannis Antetokounmpo", statut: "confirme" },
        { compte: "03", joueur: "Tyler Herro", joueur_site: null, statut: "confirme" },
      ],
      picks,
    );
    expect([...poses].sort()).toEqual(["01", "03"]);
  });

  it("pas posé : envoi en cours, échec ou conflit", () => {
    const poses = comptesPosesSurTtfl(
      [
        { compte: "01", joueur: "Giannis Antetokounmpo", statut: "propose" },
        { compte: "03", joueur: "Tyler Herro", statut: "echec" },
        { compte: "05", joueur: "Jaylen Brown", statut: "conflit" },
      ],
      picks,
    );
    expect(poses.size).toBe(0);
  });

  it("pick changé dans l'application mais pas encore renvoyé : le joueur du site diffère, donc pas vert", () => {
    const poses = comptesPosesSurTtfl(
      [{ compte: "05", joueur: "Jaylen Brown", joueur_site: "Tyrese Maxey", statut: "confirme" }],
      picks,
    );
    expect(poses.has("05")).toBe(false);
  });

  it("insensible aux accents et aux majuscules", () => {
    const poses = comptesPosesSurTtfl(
      [{ compte: "01", joueur: "NIKOLA JOKIĆ", statut: "confirme" }],
      [{ compte: "01", player: "Nikola Jokic" }],
    );
    expect(poses.has("01")).toBe(true);
  });

  it("un compte sans pick voulu (ex. compte secret masqué) n'est jamais posé", () => {
    const poses = comptesPosesSurTtfl([{ compte: "02", joueur: "Joueur Secret", statut: "confirme" }], picks);
    expect(poses.has("02")).toBe(false);
  });
});
