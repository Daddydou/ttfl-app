import { describe, expect, it } from "vitest";
import { comptesAuto, estPickAuto, type PickAuto, type PickLigne } from "@/lib/planning";
import { construireSemaine } from "@/lib/semaine";

// Décision du 2026-10-17 : un pick posé par le robot (case vide remplie à 23 h 30, joueur indisponible remplacé,
// pick automatique de l'équipe) est marqué « auto » dans l'application : il n'a pas été validé par l'utilisateur.

const D = "2026-10-20";
const marque = (compte: string, player: string, origine = "controle_vide"): PickAuto => ({
  pick_date: D,
  compte,
  player,
  origine,
});

describe("pick auto", () => {
  it("la marque vaut tant que le joueur est celui de la marque (accents et casse tolérés)", () => {
    const autos = [marque("01", "Nikola Jokic")];
    expect(estPickAuto(autos, "01", D, "Nikola Jokić")).toBe(true);
    expect(estPickAuto(autos, "01", D, "nikola jokic")).toBe(true);
  });

  it("si l'utilisateur change de joueur, ce n'est plus un pick auto", () => {
    const autos = [marque("01", "Nikola Jokic")];
    expect(estPickAuto(autos, "01", D, "Luka Doncic")).toBe(false);
    expect(estPickAuto(autos, "02", D, "Nikola Jokic")).toBe(false);
    expect(estPickAuto(autos, "01", "2026-10-21", "Nikola Jokic")).toBe(false);
    expect(estPickAuto(autos, "01", D, null)).toBe(false);
    expect(estPickAuto([], "01", D, "Nikola Jokic")).toBe(false);
  });

  it("comptesAuto : seulement les comptes dont le pick actuel est celui de la marque, triés", () => {
    const picks: PickLigne[] = [
      { pick_date: D, compte: "05", player: "Luka Doncic" },
      { pick_date: D, compte: "03", player: "Luka Doncic" },
      { pick_date: D, compte: "04", player: "Autre Joueur" },
    ];
    const autos = [marque("05", "Luka Doncic", "equipe_auto"), marque("03", "Luka Doncic", "equipe_auto"), marque("04", "Luka Doncic")];
    expect(comptesAuto(autos, picks, D)).toEqual(["03", "05"]); // le 04 a été changé par l'utilisateur
  });

  it("la grille de la semaine marque les cellules auto, et rien sans marque", () => {
    const picks: PickLigne[] = [
      { pick_date: D, compte: "03", player: "Luka Doncic" },
      { pick_date: D, compte: "04", player: "Giannis Antetokounmpo" },
    ];
    const avec = construireSemaine({
      dates: [D],
      comptes: ["03", "04"],
      picks,
      envois: [],
      autos: [marque("03", "Luka Doncic", "equipe_auto")],
    });
    expect(avec.lignes[0].cellules[0].auto).toBe(true);
    expect(avec.lignes[1].cellules[0].auto).toBe(false);
    const sans = construireSemaine({ dates: [D], comptes: ["03", "04"], picks, envois: [] });
    expect(sans.lignes.every((l) => l.cellules.every((c) => c.auto === false))).toBe(true);
  });
});
