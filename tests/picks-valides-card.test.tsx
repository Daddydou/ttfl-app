import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PicksValidesCard } from "@/components/PicksValidesCard";

describe("PicksValidesCard", () => {
  it("affiche chaque pick validé avec sa date : 6 joueurs validés = 6 lignes datées", () => {
    const picks = [
      ["2026-10-20", "Nikola Jokic"], ["2026-10-21", "Luka Doncic"], ["2026-10-23", "Jayson Tatum"],
      ["2026-10-24", "Shai Gilgeous-Alexander"], ["2026-10-27", "Giannis Antetokounmpo"], ["2026-10-30", "Jalen Brunson"],
    ].map(([pick_date, player]) => ({ pick_date, player }));
    render(<PicksValidesCard picks={picks} aujourdhui="2026-10-20" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByText("6")).toBeInTheDocument(); // compteur
    const premiere = screen.getAllByRole("listitem")[0];
    expect(within(premiere).getByText("Nikola Jokic")).toBeInTheDocument();
    expect(premiere).toHaveTextContent(/20 oct/);
    expect(premiere).toHaveTextContent("aujourd'hui");
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("demain");
  });

  it("renvoie vers Mes picks pour gérer", () => {
    render(<PicksValidesCard picks={[{ pick_date: "2026-10-20", player: "A B" }]} aujourdhui="2026-10-10" />);
    expect(screen.getByRole("link", { name: /Gérer/ })).toHaveAttribute("href", "/picks");
  });

  it("sans pick à venir : le dit et propose les picks conseillés", () => {
    render(<PicksValidesCard picks={[]} aujourdhui="2026-10-10" />);
    expect(screen.getByText(/Aucun pick validé à venir/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /picks conseillés/ })).toHaveAttribute("href", "/ce-soir");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
