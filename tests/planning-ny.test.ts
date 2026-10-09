import { describe, it, expect } from "vitest";
import { aujourdhuiNY } from "@/lib/planning";

describe("aujourdhuiNY", () => {
  it("donne la date de New York, pas celle d'UTC (la nuit, NY a un jour de retard)", () => {
    // 02:30 UTC le 20/10 = 22:30 le 19/10 à New York (EDT, UTC-4).
    expect(aujourdhuiNY(new Date("2026-10-20T02:30:00Z"))).toBe("2026-10-19");
  });

  it("donne la même date qu'UTC en journée", () => {
    expect(aujourdhuiNY(new Date("2026-10-20T16:00:00Z"))).toBe("2026-10-20");
  });

  it("gère l'heure d'hiver (EST, UTC-5)", () => {
    // 04:30 UTC le 20/12 = 23:30 le 19/12 à New York.
    expect(aujourdhuiNY(new Date("2026-12-20T04:30:00Z"))).toBe("2026-12-19");
  });
});
