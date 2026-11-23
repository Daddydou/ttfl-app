import { describe, it, expect } from "vitest";
import { MOIS_SAISON, grilleSaison, lireModeX2, validerDemandeX2, x2Possible, type LigneX2 } from "@/lib/x2";

const ligne = (o: Partial<LigneX2> = {}): LigneX2 => ({
  compte: "03", mois: "2026-11", pick_date: "2026-11-09", player: "Luka Doncic", source: "auto", statut: "pose",
  date_site: "2026-11-09", message: null, rang: 1, ...o,
});

describe("x2 : règles de l'application", () => {
  it("la saison compte 6 mois, novembre à avril", () => {
    expect(MOIS_SAISON).toHaveLength(6);
    expect(MOIS_SAISON[0]).toBe("2026-11");
    expect(MOIS_SAISON[5]).toBe("2027-04");
  });

  it("un mode inconnu vaut « off »", () => {
    expect(lireModeX2("reel")).toBe("reel");
    expect(lireModeX2("n'importe quoi")).toBe("off");
    expect(lireModeX2(null)).toBe("off");
  });

  const base = { compte: "03", date: "2026-12-02", aujourdhui: "2026-11-06", joueurDuPick: "Shai Gilgeous-Alexander", lignes: [] as LigneX2[] };

  it("accepte un x2 sur un pick à venir", () => {
    expect(validerDemandeX2(base)).toBeNull();
  });

  it("refuse sans pick sur la soirée (x2 lié au joueur)", () => {
    expect(validerDemandeX2({ ...base, joueurDuPick: null })).toMatch(/pick/);
  });

  it("refuse une soirée passée, un mois hors saison et un compte inconnu", () => {
    expect(validerDemandeX2({ ...base, date: "2026-11-01" })).toMatch(/passée/);
    expect(validerDemandeX2({ ...base, date: "2026-10-30", aujourdhui: "2026-10-01" })).toMatch(/novembre/);
    expect(validerDemandeX2({ ...base, compte: "99" })).toMatch(/Compte/);
  });

  it("refuse un joueur déjà x2 un autre mois sur le même compte, mais pas sur un autre compte", () => {
    const lignes = [ligne({ player: "Shai Gilgeous-Alexander" })];
    expect(validerDemandeX2({ ...base, lignes })).toMatch(/déjà reçu un x2/);
    expect(validerDemandeX2({ ...base, compte: "04", lignes })).toBeNull();
  });

  it("autorise de déplacer le x2 du même mois (même joueur, autre soirée)", () => {
    const lignes = [ligne({ mois: "2026-12", pick_date: "2026-12-01", player: "Shai Gilgeous-Alexander" })];
    expect(validerDemandeX2({ ...base, lignes })).toBeNull();
  });

  it("x2Possible : soirée du jour ou à venir, dans la saison du x2 seulement", () => {
    expect(x2Possible("2026-11-23", "2026-11-23")).toBe(true);
    expect(x2Possible("2027-04-10", "2026-11-23")).toBe(true);
    expect(x2Possible("2026-11-22", "2026-11-23")).toBe(false); // passée
    expect(x2Possible("2026-10-30", "2026-10-01")).toBe(false); // octobre : pas de x2
    expect(x2Possible("2027-05-01", "2026-11-23")).toBe(false); // après avril
  });

  it("la grille donne un état par mois et par compte", () => {
    const g = grilleSaison([ligne()], ["03", "04"]);
    expect(g[0].mois["2026-11"]?.player).toBe("Luka Doncic");
    expect(g[0].mois["2026-12"]).toBeNull();
    expect(g[1].mois["2026-11"]).toBeNull();
  });
});
