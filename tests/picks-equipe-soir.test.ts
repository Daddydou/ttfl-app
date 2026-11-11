// « L'équipe ce soir » : un compte par ligne, son pick, sa projection, son rang et 3 autres choix libres POUR CE COMPTE.
import { describe, it, expect } from "vitest";
import { lignesEquipeSoir } from "@/components/PicksEquipeSoir";
import type { Conseille, LigneSoiree } from "@/lib/conseilles";
import type { PickLigne } from "@/lib/planning";

const D = "2026-11-11";

const ligne = (player: string, projection: number, status = "Available"): LigneSoiree =>
  ({ player, projection, status, source: "soir" }) as unknown as LigneSoiree;

const conseille = (player: string, projection: number, rang: number, comptesLibres: string[]): Conseille =>
  ({ ...ligne(player, projection), rang, comptesLibres, comptesBloques: [] }) as unknown as Conseille;

const lignes = [
  ligne("Jalen Brunson", 42.3),
  ligne("Karl-Anthony Towns", 41.1),
  ligne("Darius Acuff Jr.", 40.4),
  ligne("Franz Wagner", 36.7),
  ligne("Joel Embiid", 36.6, "Out"),
  ligne("Anthony Davis", 30, "Questionable"),
];
const conseilles = [
  conseille("Jalen Brunson", 42.3, 1, ["03", "04", "05"]),
  conseille("Karl-Anthony Towns", 41.1, 2, ["03", "04", "05"]),
  conseille("Darius Acuff Jr.", 40.4, 3, ["03", "05"]), // bloqué sur le compte 04
  conseille("Franz Wagner", 36.7, 4, ["03", "04", "05"]),
  conseille("Joel Embiid", 36.6, 5, ["03", "04", "05"]),
];
const picks: PickLigne[] = [
  { pick_date: D, compte: "03", player: "Karl-Anthony Towns" },
  { pick_date: D, compte: "04", player: "Joel Embiid" },
  { pick_date: "2026-11-12", compte: "05", player: "Jalen Brunson" }, // un autre soir : ne compte pas
];

describe("lignesEquipeSoir", () => {
  const r = lignesEquipeSoir({ comptes: ["03", "04", "05"], date: D, picks, conseilles, lignes });
  const de = (c: string) => r.find((x) => x.compte === c)!;

  it("donne le pick, la projection et le rang du compte", () => {
    expect(de("03")).toMatchObject({ pick: "Karl-Anthony Towns", projection: 41.1, rang: 2, alerte: null });
  });

  it("propose les 3 meilleurs AUTRES choix libres pour ce compte (pas son pick, pas un joueur bloqué)", () => {
    expect(de("03").autres.map((a) => a.player)).toEqual(["Jalen Brunson", "Darius Acuff Jr.", "Franz Wagner"]);
    expect(de("04").autres.map((a) => a.player)).toEqual(["Jalen Brunson", "Karl-Anthony Towns", "Franz Wagner"]); // pas Acuff : bloqué
  });

  it("signale un pick Out / Doubtful", () => {
    expect(de("04").alerte).toBe("out");
  });

  it("un compte sans pick ce soir-là (le pick d'un autre soir ne compte pas) reçoit des choix possibles", () => {
    expect(de("05")).toMatchObject({ pick: null, projection: null, rang: null, alerte: null });
    expect(de("05").autres.map((a) => a.player)).toEqual(["Jalen Brunson", "Karl-Anthony Towns", "Darius Acuff Jr."]);
  });

  it("un pick hors du top affiché n'a pas de rang mais garde sa projection et son alerte", () => {
    const hors = lignesEquipeSoir({
      comptes: ["06"],
      date: D,
      picks: [{ pick_date: D, compte: "06", player: "Anthony Davis" }],
      conseilles,
      lignes,
    })[0];
    expect(hors).toMatchObject({ pick: "Anthony Davis", projection: 30, rang: null, alerte: "incertain" });
  });
});
