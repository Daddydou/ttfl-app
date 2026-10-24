import { describe, it, expect } from "vitest";
import { texteCloture } from "@/components/Cloture";

const ms = (iso: string) => Date.parse(iso);

describe("texteCloture", () => {
  it("donne l'heure de Paris et le temps restant", () => {
    // 24/10/2026 : Paris = UTC+2. Clôture 00:00 Paris = 22:00 UTC.
    expect(texteCloture("2026-10-24T22:00:00Z", ms("2026-10-24T19:46:00Z"))).toEqual({
      texte: "Clôture à 00:00 · dans 2 h 14",
      proche: false,
    });
  });
  it("passe en minutes et signale la dernière heure", () => {
    expect(texteCloture("2026-10-24T22:00:00Z", ms("2026-10-24T21:35:00Z"))).toEqual({ texte: "Clôture à 00:00 · dans 25 min", proche: true });
  });
  it("après l'heure : soirée close ; heure illisible : rien", () => {
    expect(texteCloture("2026-10-24T22:00:00Z", ms("2026-10-24T22:05:00Z"))?.texte).toBe("Soirée close à 00:00");
    expect(texteCloture("pas une date", 0)).toBeNull();
  });
});
