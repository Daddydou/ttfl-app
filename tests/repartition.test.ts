import { describe, it, expect } from "vitest";
import { repartirEquipe, validerAffectations, MARGE_BRUIT, PART_MAX } from "@/lib/repartition";
import { COMPTES_EQUIPE } from "@/lib/planning";

const J = (player: string, projection: number | null, status?: string) => ({ player, projection, status });
const taille = (r: ReturnType<typeof repartirEquipe>, nom: string) =>
  r.groupes.find((g) => g.player === nom)?.comptes.length ?? 0;

describe("repartirEquipe — règle « bruit »", () => {
  it("paramètres de l'étude : marge de 3 points, 60 % des comptes au plus par joueur", () => {
    expect(MARGE_BRUIT).toBe(3);
    expect(PART_MAX).toBe(0.6);
  });

  it("répartit 5/5 deux joueurs à moins de 3 points l'un de l'autre", () => {
    const r = repartirEquipe({
      joueurs: [J("Luka Doncic", 49.3), J("Giannis Antetokounmpo", 47.9), J("Troisième", 41)],
      comptes: COMPTES_EQUIPE, bloques: {},
    });
    expect(taille(r, "Luka Doncic")).toBe(5);
    expect(taille(r, "Giannis Antetokounmpo")).toBe(5);
    expect(taille(r, "Troisième")).toBe(0);
    expect(r.sansPick).toEqual([]);
  });

  it("concentre TOUS les comptes sur le meilleur quand l'écart dépasse la marge (pas d'espérance sacrifiée)", () => {
    const r = repartirEquipe({
      joueurs: [J("Shai Gilgeous-Alexander", 49.9), J("Victor Wembanyama", 44.6)],
      comptes: COMPTES_EQUIPE, bloques: {},
    });
    expect(r.groupes).toHaveLength(1);
    expect(r.groupes[0].comptes).toHaveLength(10);
    expect(r.coutProjection).toBe(0);
  });

  it("respecte le plafond de 6 comptes par joueur et répartit trois joueurs à égalité en 4/3/3", () => {
    const r = repartirEquipe({
      joueurs: [J("A", 50), J("B", 49.5), J("C", 49)], comptes: COMPTES_EQUIPE, bloques: {},
    });
    const tailles = r.groupes.map((g) => g.comptes.length).sort((a, b) => b - a);
    expect(tailles).toEqual([4, 3, 3]);
    expect(Math.max(...tailles)).toBeLessThanOrEqual(6);
  });

  it("ne propose pas un joueur bloqué (30 jours) au compte concerné, seulement à celui-là", () => {
    const r = repartirEquipe({
      joueurs: [J("A", 50), J("B", 49), J("C", 30)],
      comptes: ["03", "04", "05", "06"],
      bloques: { a: ["03", "04"] }, // A bloqué sur 03 et 04
    });
    const compteDe = (c: string) => r.groupes.find((g) => g.comptes.includes(c))!.player;
    expect(compteDe("03")).toBe("B");
    expect(compteDe("04")).toBe("B");
    expect(["A", "B"]).toContain(compteDe("05"));
  });

  it("un compte sans aucun joueur disponible est signalé, les autres sont servis", () => {
    const r = repartirEquipe({
      joueurs: [J("A", 50)], comptes: ["03", "04"], bloques: { a: ["04"] },
    });
    expect(r.sansPick).toEqual(["04"]);
    expect(r.groupes[0].comptes).toEqual(["03"]);
  });

  it("aucun joueur disponible nulle part → aucune affectation", () => {
    const r = repartirEquipe({ joueurs: [], comptes: ["03", "04"], bloques: {} });
    expect(r.groupes).toEqual([]);
    expect(r.sansPick).toEqual(["03", "04"]);
  });

  it("n'attribue jamais un joueur « Out » ni sans projection", () => {
    const r = repartirEquipe({
      joueurs: [J("Blessé", 60, "Out"), J("Sans projection", null), J("Sain", 40)],
      comptes: ["03", "04"], bloques: {},
    });
    expect(r.groupes).toHaveLength(1);
    expect(r.groupes[0].player).toBe("Sain");
  });

  it("le coût en projection mesure ce qu'on cède par rapport à « chacun sur son meilleur »", () => {
    const r = repartirEquipe({
      joueurs: [J("A", 50), J("B", 48)], comptes: ["03", "04"], bloques: {},
    });
    // 03 → A (0 de perte), 04 → B (2 points de moins que A)
    expect(r.coutProjection).toBe(2);
  });

  it("la rotation change QUI prend quoi, jamais combien de comptes par joueur", () => {
    const base = { joueurs: [J("A", 50), J("B", 49)], comptes: COMPTES_EQUIPE, bloques: {} };
    const r0 = repartirEquipe({ ...base, rotation: 0 });
    const r1 = repartirEquipe({ ...base, rotation: 1 });
    expect(r0.groupes.map((g) => g.comptes.length)).toEqual(r1.groupes.map((g) => g.comptes.length));
    expect(r0.groupes[0].comptes).not.toEqual(r1.groupes[0].comptes);
  });

  it("tolère les accents et les suffixes dans les noms bloqués", () => {
    const r = repartirEquipe({
      joueurs: [J("Luka Dončić", 50), J("Autre", 49)], comptes: ["03"],
      bloques: { "luka doncic": ["03"] },
    });
    expect(r.groupes[0].player).toBe("Autre");
  });
});

describe("validerAffectations — revérification côté serveur", () => {
  const date = "2026-10-21";
  it("accepte une répartition cohérente", () => {
    expect(validerAffectations([{ player: "A", comptes: ["03", "04"] }, { player: "B", comptes: ["05"] }], [], date)).toBeNull();
  });
  it("refuse un compte présent dans deux groupes", () => {
    expect(validerAffectations([{ player: "A", comptes: ["03"] }, { player: "B", comptes: ["03"] }], [], date))
      .toMatch(/deux groupes/);
  });
  it("refuse un joueur pické à 30 jours ou moins sur un des comptes (l'écran peut être périmé)", () => {
    const voisins = [{ pick_date: "2026-10-05", player: "A", compte: "04" }];
    expect(validerAffectations([{ player: "A", comptes: ["03", "04"] }], voisins, date)).toMatch(/04/);
  });
  it("ne compte pas un pick de la MÊME soirée comme un blocage (re-picker remplace)", () => {
    const voisins = [{ pick_date: date, player: "A", compte: "03" }];
    expect(validerAffectations([{ player: "A", comptes: ["03"] }], voisins, date)).toBeNull();
  });
  it("refuse un compte invalide, un nom vide ou une liste vide", () => {
    expect(validerAffectations([{ player: "A", comptes: ["13"] }], [], date)).toMatch(/invalides/);
    expect(validerAffectations([{ player: " ", comptes: ["03"] }], [], date)).toMatch(/Joueur invalide/);
    expect(validerAffectations([], [], date)).toMatch(/Aucune/);
  });
});
