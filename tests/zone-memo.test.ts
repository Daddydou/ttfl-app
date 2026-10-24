import { describe, it, expect } from "vitest";
import { zoneChoisie } from "@/lib/planning";

const req = (pathname: string, q: string) => ({ pathname, searchParams: new URLSearchParams(q) });

describe("zoneChoisie (compte retenu d'un écran à l'autre)", () => {
  it("lit ?pour= sur Conseillés et ?zone= sur Mes picks", () => {
    expect(zoneChoisie(req("/ce-soir", "pour=c13"))).toBe("c13");
    expect(zoneChoisie(req("/picks", "zone=equipe&mode=regular"))).toBe("equipe");
  });
  it("ignore les autres pages et les valeurs inconnues", () => {
    expect(zoneChoisie(req("/stats", "zone=c02"))).toBeNull();
    expect(zoneChoisie(req("/ce-soir", "pour=pirate"))).toBeNull();
    expect(zoneChoisie(req("/picks", ""))).toBeNull();
  });
});
