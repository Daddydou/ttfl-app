import { describe, it, expect } from "vitest";
import { COMPTES_HISTORIQUE, compteValide, resumerComptes } from "@/lib/historique";
import type { TtflPick } from "@/lib/types";

const pick = (compte: string, score: number | null): TtflPick => ({
  id: 0, mode: "regular", pick_date: "2026-10-23", player: "X", score, created_at: "", compte, source: "app",
});

describe("historique des 13 comptes", () => {
  it("liste les 13 comptes dans l'ordre", () => {
    expect(COMPTES_HISTORIQUE).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"]);
  });
  it("totalise seulement les picks notés", () => {
    const r = resumerComptes([pick("01", 40), pick("01", null), pick("05", 10), pick("05", 20)]);
    expect(r.find((x) => x.compte === "01")).toMatchObject({ picks: 2, notes: 1, total: 40, moyenne: 40 });
    expect(r.find((x) => x.compte === "05")).toMatchObject({ total: 30, moyenne: 15 });
    expect(r.find((x) => x.compte === "13")).toMatchObject({ picks: 0, notes: 0, total: 0, moyenne: null });
  });
  it("compte de l'adresse : valide ou le compte principal", () => {
    expect(compteValide("07")).toBe("07");
    expect(compteValide("7")).toBe("01");
    expect(compteValide(undefined)).toBe("01");
  });
});
