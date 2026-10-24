import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PicksValidesCard } from "@/components/PicksValidesCard";

describe("PicksValidesCard", () => {
  it("n'affiche que les 5 prochaines dates", () => {
    const picks = ["20", "21", "22", "23", "24", "25", "26"].map((j) => ({ pick_date: `2026-10-${j}`, player: `Joueur ${j}` }));
    render(<PicksValidesCard picks={picks} aujourdhui="2026-10-20" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("sur 7")).toBeInTheDocument();
    expect(screen.queryByText("Joueur 25")).not.toBeInTheDocument();
  });

  it("affiche chaque pick validé avec sa date : 6 joueurs validés = 5 lignes datées (les 5 prochaines)", () => {
    const picks = [
      ["2026-10-20", "Nikola Jokic"], ["2026-10-21", "Luka Doncic"], ["2026-10-23", "Jayson Tatum"],
      ["2026-10-24", "Shai Gilgeous-Alexander"], ["2026-10-27", "Giannis Antetokounmpo"], ["2026-10-30", "Jalen Brunson"],
    ].map(([pick_date, player]) => ({ pick_date, player }));
    render(<PicksValidesCard picks={picks} aujourdhui="2026-10-20" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("sur 6")).toBeInTheDocument();
    const premiere = screen.getAllByRole("listitem")[0];
    expect(within(premiere).getByText("Nikola Jokic")).toBeInTheDocument();
    expect(premiere).toHaveTextContent(/20 oct/);
    expect(premiere).toHaveTextContent(/aujourd'hui/i);
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent(/demain/i);
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

describe("PicksValidesCard — comptes", () => {
  const picks = [{ pick_date: "2026-10-20", player: "Shai Gilgeous-Alexander" }];
  const autres = [
    { pick_date: "2026-10-20", player: "Jalen Brunson", compte: "02" },
    { pick_date: "2026-10-20", player: "Nikola Jokic", compte: "03" },
    { pick_date: "2026-10-20", player: "Luka Doncic", compte: "04" },
    { pick_date: "2026-10-21", player: "Jayson Tatum", compte: "05" },
  ];

  it("affiche toujours les comptes 1 et 2, et replie les 10 comptes de l'équipe", () => {
    const { container } = render(<PicksValidesCard picks={picks} autres={autres} aujourdhui="2026-10-20" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2); // 20/10 et 21/10 (picks d'équipe seuls)
    expect(items[0]).toHaveTextContent("Shai Gilgeous-Alexander");
    expect(items[0]).toHaveTextContent("Jalen Brunson");
    expect(items[1]).toHaveTextContent("pas de pick"); // 21/10 : comptes 1 et 2 vides
    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(2);
    expect(details[0]).not.toHaveAttribute("open"); // replié par défaut
    expect(details[0]).toHaveTextContent("Équipe · 2/10 comptes");
    expect(details[0].querySelectorAll("div > div > span").length).toBeGreaterThan(0);
    expect(details[0]).toHaveTextContent("Cpt 03");
    expect(details[0]).toHaveTextContent("Nikola Jokic");
    expect(details[0]).toHaveTextContent("Cpt 12"); // les 10 comptes sont listés, même sans pick
    expect(details[1]).toHaveTextContent("Équipe · 1/10 comptes");
  });
});
