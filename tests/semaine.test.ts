import { describe, expect, it } from "vitest";
import { construireSemaine, datesDeLaSemaine } from "@/lib/semaine";

const D = datesDeLaSemaine("2026-10-20", 3); // 20, 21, 22

describe("construireSemaine", () => {
  it("génère les dates consécutives", () => {
    expect(D).toEqual(["2026-10-20", "2026-10-21", "2026-10-22"]);
  });

  it("remplit la grille, l'état d'envoi et la date de déblocage", () => {
    const s = construireSemaine({
      dates: D,
      comptes: ["03", "04"],
      picks: [{ pick_date: "2026-10-20", player: "Victor Wembanyama", compte: "03" }],
      envois: [{ pick_date: "2026-10-20", compte: "03", joueur: "Victor Wembanyama", statut: "confirme", message: null }],
    });
    const c = s.lignes[0].cellules[0];
    expect(c.joueur).toBe("Victor Wembanyama");
    expect(c.statut).toBe("confirme");
    expect(c.libreLe).toBe("2026-11-20"); // 20/10 + 31 jours
    expect(s.lignes[1].cellules[0].joueur).toBeNull();
  });

  it("signale un joueur repické à 30 jours ou moins sur le même compte, accents tolérés", () => {
    const s = construireSemaine({
      dates: D,
      comptes: ["03"],
      picks: [
        { pick_date: "2026-10-20", player: "Nikola Jokic", compte: "03" },
        { pick_date: "2026-10-22", player: "Nikola Jokić", compte: "03" },
      ],
      envois: [],
    });
    expect(s.lignes[0].cellules[0].cycle).toBe(true);
    expect(s.lignes[0].cellules[2].cycle).toBe(true);
    expect(s.lignes[0].cellules[1].cycle).toBe(false);
  });

  it("tient compte d'un pick voisin hors de la semaine affichée", () => {
    const s = construireSemaine({
      dates: D,
      comptes: ["03"],
      picks: [
        { pick_date: "2026-10-05", player: "Luka Doncic", compte: "03" },
        { pick_date: "2026-10-21", player: "Luka Doncic", compte: "03" },
      ],
      envois: [],
    });
    expect(s.lignes[0].cellules[1].cycle).toBe(true);
  });

  it("n'accuse pas deux comptes différents avec le même joueur", () => {
    const s = construireSemaine({
      dates: D,
      comptes: ["03", "04"],
      picks: [
        { pick_date: "2026-10-20", player: "Star", compte: "03" },
        { pick_date: "2026-10-21", player: "Star", compte: "04" },
      ],
      envois: [],
    });
    expect(s.lignes.every((l) => l.cellules.every((c) => !c.cycle))).toBe(true);
  });

  it("synthèse : comptes sans pick et sur-concentration", () => {
    const comptes = ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const picks = comptes.slice(0, 7).map((c) => ({ pick_date: "2026-10-20", player: "Star", compte: c }));
    const s = construireSemaine({ dates: D, comptes, picks, envois: [] });
    expect(s.syntheses[0].surconcentration).toBe(true); // 7/10 > 60 %
    expect(s.syntheses[0].sansPick).toEqual(["10", "11", "12"]);
    expect(s.syntheses[1].sansPick).toHaveLength(10);
    expect(s.syntheses[1].surconcentration).toBe(false);
  });
});
