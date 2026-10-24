import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JournalEnvois } from "@/components/admin/JournalEnvois";

describe("JournalEnvois", () => {
  it("dit que la migration manque plutôt que d'afficher un vide", () => {
    render(<JournalEnvois entrees={[]} disponible={false} />);
    expect(screen.getByText(/pas encore activé/i)).toBeTruthy();
  });
  it("affiche l'état vide", () => {
    render(<JournalEnvois entrees={[]} disponible />);
    expect(screen.getByText(/aucun envoi/i)).toBeTruthy();
  });
  it("liste les entrées avec leur statut", () => {
    render(
      <JournalEnvois disponible entrees={[{ id: 1, le: "2026-10-11T09:00:00Z", pick_date: "2026-10-20", compte: "03", joueur: "Victor Wembanyama", statut: "confirme", message: null }]} />,
    );
    expect(screen.getByText(/Wembanyama/)).toBeTruthy();
    expect(screen.getByText("Posé sur TTFL")).toBeTruthy();
  });
});
