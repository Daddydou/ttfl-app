import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PickDuSoirResume } from "@/components/PickDuSoirResume";

describe("PickDuSoirResume", () => {
  it("le pick posé commande ; le classement n'est qu'un second avis quand il préfère un autre joueur", () => {
    render(
      <PickDuSoirResume
        titre="Ce soir · Compte 1"
        pick="Joueur A"
        projectionPick={40.9}
        pose
        n1={{ player: "Joueur B", projection: 41.6 }}
      />,
    );
    expect(screen.getByText("Joueur A")).toBeInTheDocument();
    expect(screen.getByText("Posé sur TTFL")).toBeInTheDocument();
    expect(screen.getByText(/Le classement préfère/)).toHaveTextContent("Le classement préfère Joueur B (+0.7 pts de projection)");
  });

  it("dit quand le classement est d'accord", () => {
    render(
      <PickDuSoirResume titre="Ce soir · Compte 1" pick="Joueur A" projectionPick={41} pose={false} n1={{ player: "Joueur A", projection: 41 }} />,
    );
    expect(screen.getByText(/Le classement est d'accord/)).toBeInTheDocument();
    expect(screen.queryByText("Posé sur TTFL")).toBeNull();
  });
});
