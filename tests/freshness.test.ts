import { describe, it, expect } from "vitest";
import { freshness, nb } from "@/lib/format";

// 24/10/2026 : heure d'été, Paris = UTC+2.
const a = (iso: string) => new Date(iso);

describe("freshness", () => {
  it("avant 16 h (Paris), un calcul de la veille est neutre, pas rouge", () => {
    const f = freshness("2026-10-23T20:45:00Z", true, a("2026-10-24T12:40:00Z")); // 14:40 Paris
    expect(f.tone).toBe("waiting");
  });
  it("après 16 h, un calcul vieux de plus de 2 h est rouge", () => {
    expect(freshness("2026-10-23T20:45:00Z", true, a("2026-10-24T15:00:00Z")).tone).toBe("stale"); // 17:00 Paris
  });
  it("la nuit (jusqu'à 3 h), la règle normale s'applique", () => {
    expect(freshness("2026-10-23T22:40:00Z", true, a("2026-10-23T22:50:00Z")).tone).toBe("fresh"); // 00:50 Paris
  });
  it("un calcul récent reste vert même avant 16 h", () => {
    expect(freshness("2026-10-24T09:50:00Z", true, a("2026-10-24T10:00:00Z")).tone).toBe("fresh");
  });
  it("report non rafraîchi : jamais vert", () => {
    expect(freshness("2026-10-24T15:50:00Z", false, a("2026-10-24T16:00:00Z")).tone).toBe("aging");
  });
});

describe("nb", () => {
  it("accorde au pluriel à partir de 2", () => {
    expect(nb(0, "tâche")).toBe("0 tâche");
    expect(nb(1, "tâche")).toBe("1 tâche");
    expect(nb(3, "tâche")).toBe("3 tâches");
    expect(nb(2, "cheval", "chevaux")).toBe("2 chevaux");
  });
});
