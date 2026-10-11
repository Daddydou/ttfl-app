import { describe, expect, it } from "vitest";
import { SEUIL_TIRER, distanceAffichee, doitRafraichir } from "@/components/PullToRefresh";

describe("tirer pour actualiser", () => {
  it("ne déclenche qu'au-delà du seuil", () => {
    expect(doitRafraichir(SEUIL_TIRER - 1)).toBe(false);
    expect(doitRafraichir(SEUIL_TIRER)).toBe(true);
  });
  it("freine et borne la distance affichée", () => {
    expect(distanceAffichee(-30)).toBe(0);
    expect(distanceAffichee(60)).toBe(30);
    expect(distanceAffichee(1000)).toBe(90);
  });
});
