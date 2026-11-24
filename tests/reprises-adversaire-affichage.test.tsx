import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReprisesAdversaire } from "@/components/ReprisesAdversaire";
import type { Reprise } from "@/lib/adversaires-reprises";

// Adversaires (24/11/2026) : en dépliant un adversaire on ne voit que les JOURS ; chaque jour se déplie à son tour.
const AUJ = "2026-11-24";
const r = (player: string, date: string, rang: number): Reprise => ({
  player, date, rang, projection: 50 - rang, team: "DEN", opponent: "LAL", dejaPicke: null,
});

describe("ReprisesAdversaire : un bloc repliable par jour", () => {
  const reprises = [r("Nikola Jokic", "2026-11-24", 1), r("Jamal Murray", "2026-11-24", 5), r("Luka Doncic", "2026-11-26", 2)];

  it("une ligne par jour, repliée au départ, avec le nombre de joueurs", () => {
    const { container } = render(<ReprisesAdversaire reprises={reprises} aujourdhui={AUJ} />);
    const jours = container.querySelectorAll("details");
    expect(jours).toHaveLength(2);
    jours.forEach((d) => expect(d.hasAttribute("open")).toBe(false));
    expect(screen.getByText("2 joueurs")).toBeInTheDocument();
    expect(screen.getByText("1 joueur")).toBeInTheDocument();
  });

  it("les joueurs d'un jour sont dans le bloc de ce jour (visibles seulement une fois déplié)", () => {
    const { container } = render(<ReprisesAdversaire reprises={reprises} aujourdhui={AUJ} />);
    const [premier, second] = Array.from(container.querySelectorAll("details"));
    expect(premier.textContent).toContain("Nikola Jokic");
    expect(premier.textContent).toContain("Jamal Murray");
    expect(premier.textContent).not.toContain("Luka Doncic");
    expect(second.textContent).toContain("Luka Doncic");
  });

  it("aucun joueur : message simple, pas de bloc", () => {
    const { container } = render(<ReprisesAdversaire reprises={[]} aujourdhui={AUJ} />);
    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(screen.getByText(/Aucun joueur du top 30/)).toBeInTheDocument();
  });
});
