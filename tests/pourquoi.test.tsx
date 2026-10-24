import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { comparerPicks } from "@/lib/pourquoi";
import { PourquoiPick } from "@/components/PourquoiPick";

const A = { player: "Joueur A", projection: 50, forme: 48, ceiling: 70, matchup_factor: 1.1 };
const B = { player: "Joueur B", projection: 46.5, forme: 40, ceiling: 72, matchup_factor: 1.0 };

describe("comparerPicks", () => {
  it("calcule les écarts et trouve l'atout principal", () => {
    const c = comparerPicks(A, B);
    expect(c.lignes[0].ecart).toBeCloseTo(3.5);
    expect(c.atout?.id).toBe("forme"); // +20 % contre +10 % pour le matchup
    expect(c.retard?.id).toBe("plafond");
    expect(c.phrase).toContain("Joueur A devance Joueur B de +3,5 pts en projection");
    expect(c.phrase).toContain("avantage principal : forme récente (+20 %)");
    expect(c.phrase).toContain("mais plafond moins bon (−3 %)");
  });
  it("égalité : coude à coude, pas d'atout inventé", () => {
    const c = comparerPicks({ ...A, projection: 50 }, { ...A, player: "Joueur B", projection: 50 });
    expect(c.atout).toBeNull();
    expect(c.retard).toBeNull();
    expect(c.phrase).toContain("coude à coude");
  });
  it("chiffres manquants : pas de plantage", () => {
    const c = comparerPicks({ player: "X", projection: null, forme: null, ceiling: null, matchup_factor: null }, B);
    expect(c.lignes.every((l) => l.ecart === null)).toBe(true);
    expect(c.phrase).toBe("X passe devant Joueur B.");
  });
});

describe("carte Pourquoi ce pick", () => {
  it("affiche la comparaison avec les valeurs", () => {
    render(<PourquoiPick n1={A} n2={B} />);
    expect(screen.getByRole("heading", { name: "Pourquoi le n°1 ?" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Forme récente : Joueur A 48.0, Joueur B 40.0/ })).toBeInTheDocument();
    expect(screen.getByText(/×1.10/)).toBeInTheDocument();
  });
});

describe("plafond absent (0)", () => {
  it("un plafond à 0 est traité comme inconnu : pas d'écart, jamais l'atout", () => {
    const c = comparerPicks({ ...A, ceiling: 42 }, { ...B, ceiling: 0 });
    const plafond = c.lignes.find((l) => l.id === "plafond")!;
    expect(plafond.b).toBeNull();
    expect(plafond.ecart).toBeNull();
    expect(c.atout?.id).not.toBe("plafond");
  });
});
