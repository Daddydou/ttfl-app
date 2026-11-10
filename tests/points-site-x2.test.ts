// x2 dans les totaux (10/11/2026) : les totaux comptent les POINTS DU SITE (x2 inclus) ; les moyennes, records et
// comparaisons restent sur le score BRUT. Une ligne sans points_site (ancienne ou pas encore recalculée) = score brut.
import { describe, it, expect } from "vitest";
import { resumerComptes } from "@/lib/historique";
import { parCompte, parSoiree, pointsSite, syntheseEquipe, type ScorePick } from "@/lib/stats-equipe";
import type { TtflPick } from "@/lib/types";

const sp = (compte: string, date: string, score: number | null, points_site?: number | null): ScorePick => ({
  compte, pick_date: date, player: "X", score, points_site,
});

describe("pointsSite", () => {
  it("prend les points du site, sinon le score brut, sinon 0", () => {
    expect(pointsSite({ score: 40, points_site: 80 })).toBe(80);
    expect(pointsSite({ score: 40, points_site: null })).toBe(40);
    expect(pointsSite({ score: 40 })).toBe(40);
    expect(pointsSite({ score: null })).toBe(0);
  });
});

describe("totaux avec x2", () => {
  const picks = [sp("05", "2026-11-12", 40, 80), sp("05", "2026-11-13", 20, 20), sp("06", "2026-11-12", 30)];

  it("parCompte : total en points du site, moyenne et record en brut", () => {
    const c = parCompte(picks).find((x) => x.compte === "05")!;
    expect(c.total).toBe(100);
    expect(c.moyenne).toBe(30);
    expect(c.meilleur?.score).toBe(40);
  });

  it("parSoiree et syntheseEquipe : le x2 est compté dans le total de l'équipe", () => {
    expect(parSoiree(picks).find((s) => s.date === "2026-11-12")).toMatchObject({ n: 2, total: 110 });
    const s = syntheseEquipe(picks);
    expect(s.total).toBe(130);
    expect(s.moyennePick).toBeCloseTo(30, 5); // brut : (40 + 20 + 30) / 3
  });

  it("historique par compte : total du site, moyenne brute", () => {
    const pick = (compte: string, score: number | null, points_site: number | null): TtflPick => ({
      id: 0, mode: "regular", pick_date: "2026-11-12", player: "X", score, points_site, created_at: "", compte, source: "app",
    });
    const r = resumerComptes([pick("05", 40, 80), pick("05", 20, null), pick("05", null, null)]);
    expect(r.find((x) => x.compte === "05")).toMatchObject({ picks: 3, notes: 2, total: 100, moyenne: 30 });
  });

  it("sans aucun x2, rien ne change (points_site absent)", () => {
    const sans = [sp("05", "2026-11-12", 40), sp("05", "2026-11-13", 20)];
    expect(parCompte(sans)[0].total).toBe(60);
    expect(syntheseEquipe(sans).total).toBe(60);
  });
});
