import { describe, expect, it } from "vitest";
import { fourchette, phraseFourchette } from "@/lib/fourchette";

describe("fourchette de score", () => {
  it("renvoie null sans projection valable", () => {
    expect(fourchette(null)).toBeNull();
    expect(fourchette(undefined)).toBeNull();
    expect(fourchette(Number.NaN)).toBeNull();
    expect(phraseFourchette(null)).toBeNull();
  });

  it("une projection de 42 vaut en moyenne environ 34 (la projection n'est pas une moyenne)", () => {
    const f = fourchette(42)!;
    expect(f.moyen).toBeCloseTo(34.4, 1);
    expect(f.moyen).toBeLessThan(42);
  });

  it("l'ordre est toujours mauvais < médian < bon, et les chances sont entre 0 et 1", () => {
    for (let p = 20; p <= 70; p += 0.5) {
      const f = fourchette(p)!;
      expect(f.mauvais).toBeLessThan(f.median);
      expect(f.median).toBeLessThan(f.bon);
      expect(f.chance40).toBeGreaterThanOrEqual(0);
      expect(f.chance40).toBeLessThanOrEqual(1);
      expect(f.chance50).toBeLessThanOrEqual(f.chance40);
    }
  });

  it("monte avec la projection (jamais de baisse)", () => {
    let prec = fourchette(20)!;
    for (let p = 20.5; p <= 70; p += 0.5) {
      const f = fourchette(p)!;
      expect(f.moyen).toBeGreaterThanOrEqual(prec.moyen);
      expect(f.chance40).toBeGreaterThanOrEqual(prec.chance40);
      expect(f.bon).toBeGreaterThanOrEqual(prec.bon);
      prec = f;
    }
  });

  it("interpole entre deux tranches et plafonne aux extrémités", () => {
    const a = fourchette(40)!;
    expect(a.moyen).toBeGreaterThan(fourchette(38)!.moyen);
    expect(a.moyen).toBeLessThan(fourchette(42)!.moyen);
    expect(fourchette(5)).toEqual(fourchette(30));
    expect(fourchette(99)).toEqual(fourchette(60));
  });

  it("la phrase est lisible", () => {
    expect(phraseFourchette(42)).toBe("Mauvais soir ≈ 16 · moyen ≈ 34 · bon soir ≈ 53. 36 % de chances de faire 40 ou plus");
  });
});
