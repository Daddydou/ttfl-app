import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { rapportSuivi, type LigneSuivi } from "@/lib/suivi-formules";
import { SuiviFormules } from "@/components/SuiviFormules";

const l = (profil: string, pick_date: string, score_reel: number | null): LigneSuivi => ({
  profil, pick_date, joueur: "X", projection: 40, score_reel,
});

describe("rapportSuivi", () => {
  it("compare sur les soirées où TOUTES les formules ont un score réel (même échantillon)", () => {
    const r = rapportSuivi([
      l("glouton", "2026-10-20", 40), l("prudent", "2026-10-20", 45),
      l("glouton", "2026-10-21", 50), l("prudent", "2026-10-21", 0),
      l("glouton", "2026-10-22", 60), l("prudent", "2026-10-22", null), // pas encore noté : exclue pour tous
    ]);
    expect(r.soirees).toBe(2);
    expect(r.enAttente).toBe(1);
    const prudent = r.formules.find((f) => f.profil === "prudent")!;
    const glouton = r.formules.find((f) => f.profil === "glouton")!;
    expect(glouton.total).toBe(90);
    expect(prudent.total).toBe(45);
    expect(prudent.joursAZero).toBe(1);
    expect(prudent.ecartGlouton).toBe(-45);
    expect(glouton.ecartGlouton).toBeNull();
    expect(r.formules.map((f) => f.profil)).toEqual(["glouton", "prudent"]); // meilleur total d'abord
  });

  it("rien de noté : aucune soirée comparée", () => {
    const r = rapportSuivi([l("glouton", "2026-10-20", null), l("prudent", "2026-10-20", null)]);
    expect(r.soirees).toBe(0);
    expect(r.enAttente).toBe(2);
    expect(r.formules.every((f) => f.moyenne === null)).toBe(true);
  });
});

describe("Carte Suivi des formules", () => {
  it("ne s'affiche pas sans aucune ligne", () => {
    const { container } = render(<SuiviFormules lignes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("avant les premiers résultats : explique l'attente", () => {
    render(<SuiviFormules lignes={[l("glouton", "2026-10-20", null), l("equilibre", "2026-10-20", null)]} />);
    expect(screen.getByRole("region", { name: "Suivi des formules" })).toBeInTheDocument();
    expect(screen.getByText(/Pas encore de soirée notée/)).toBeInTheDocument();
  });

  it("affiche les totaux et l'écart avec la base « glouton »", () => {
    render(<SuiviFormules lignes={[
      l("glouton", "2026-10-20", 40), l("equilibre", "2026-10-20", 55),
    ]} />);
    expect(screen.getByText(/1 soirée comparée/)).toBeInTheDocument();
    expect(screen.getByText("Équilibrée")).toBeInTheDocument();
    expect(screen.getByText("Glouton (base)")).toBeInTheDocument();
    expect(screen.getByText(/\+15 vs glouton/)).toBeInTheDocument();
  });
});
