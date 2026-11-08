import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Blesse } from "@/lib/blesses";
import { formaterMoyenne, starsAbsentes, type LigneClassement } from "@/lib/stars-absentes";
import { StarsAbsentes } from "@/components/StarsAbsentes";

function blesse(joueur_norm: string, joueur: string, statut: "Out" | "Doubtful", game_date = "2026-11-09"): Blesse {
  return {
    game_date, joueur, joueur_norm, equipe_abbr: "LAL", equipe: "Lakers", statut, statut_brut: null,
    motif: "Back", retour_prevu: null, source: "nba", maj_le: "2026-11-08T18:00:00Z",
  };
}

const CLASSEMENT: LigneClassement[] = [
  { cle: "luka doncic", player: "Luka Dončić", rang: 1, moyenne: "59.11" },
  { cle: "anthony davis", player: "Anthony Davis", rang: 13, moyenne: 37.62 },
  { cle: "scottie barnes", player: "Scottie Barnes", rang: 21, moyenne: 34.25 },
  { cle: "joueur lointain", player: "Joueur Lointain", rang: 31, moyenne: 20 },
];

describe("starsAbsentes", () => {
  it("ne garde que les blessés du top 30, avec leur rang et leur moyenne", () => {
    const r = starsAbsentes(
      [blesse("luka doncic", "Luka Doncic", "Doubtful"), blesse("joueur lointain", "Joueur Lointain", "Out"), blesse("inconnu", "Inconnu", "Out")],
      CLASSEMENT,
      "2026-11-08",
    );
    expect(r).toHaveLength(1);
    expect(r[0].stars).toHaveLength(1);
    expect(r[0].stars[0]).toMatchObject({ joueur: "Luka Dončić", rang: 1, moyenne: 59.11, statut: "Doubtful" });
  });

  it("classe Out avant Doubtful, puis par rang, et regroupe par soirée chronologique", () => {
    const r = starsAbsentes(
      [
        blesse("scottie barnes", "Scottie Barnes", "Out", "2026-11-10"),
        blesse("luka doncic", "Luka Doncic", "Doubtful"),
        blesse("anthony davis", "Anthony Davis", "Out"),
        blesse("scottie barnes", "Scottie Barnes", "Doubtful"),
      ],
      CLASSEMENT,
      "2026-11-08",
    );
    expect(r.map((s) => s.game_date)).toEqual(["2026-11-09", "2026-11-10"]);
    expect(r[0].stars.map((s) => `${s.joueur}:${s.statut}`)).toEqual([
      "Anthony Davis:Out",
      "Luka Dončić:Doubtful",
      "Scottie Barnes:Doubtful",
    ]);
  });

  it("ignore les soirées passées et la taille du top est réglable", () => {
    const b = [blesse("anthony davis", "Anthony Davis", "Out", "2026-11-07")];
    expect(starsAbsentes(b, CLASSEMENT, "2026-11-08")).toEqual([]);
    const b2 = [blesse("anthony davis", "Anthony Davis", "Out")];
    expect(starsAbsentes(b2, CLASSEMENT, "2026-11-08", 10)).toEqual([]);
  });

  it("moyenne illisible = null, formatage à la française", () => {
    const r = starsAbsentes([blesse("luka doncic", "x", "Out")], [{ cle: "luka doncic", player: "Luka Dončić", rang: 1, moyenne: null }], "2026-11-08");
    expect(r[0].stars[0].moyenne).toBeNull();
    expect(formaterMoyenne(59.11)).toBe("59,1");
    expect(formaterMoyenne(null)).toBe("");
  });
});

describe("StarsAbsentes", () => {
  it("affiche les stars de chaque soirée avec leur statut", () => {
    const soirees = starsAbsentes(
      [blesse("luka doncic", "Luka Doncic", "Doubtful"), blesse("anthony davis", "Anthony Davis", "Out")],
      CLASSEMENT,
      "2026-11-08",
    );
    const html = renderToStaticMarkup(<StarsAbsentes soirees={soirees} classementMaj="2026-11-08T15:23:00Z" />);
    expect(html).toContain("Luka Dončić");
    expect(html).toContain("n°13");
    expect(html).toContain("Doubtful");
    expect(html).toContain("2 stars");
    expect(html).toContain("moy. 59,1");
  });

  it("dit clairement quand aucune star n'est absente", () => {
    const html = renderToStaticMarkup(<StarsAbsentes soirees={[]} />);
    expect(html).toContain("Aucune star");
  });
});
