import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CeSoirCard } from "@/components/CeSoirCard";

const base = {
  titreDate: "sam. 24 oct.",
  equipe: { posees: 10, total: 10, href: "/ce-soir?pour=equipe" },
  projection: null,
  fraicheur: <p>fraîcheur</p>,
};

describe("CeSoirCard", () => {
  it("affiche un compte par ligne, avec « posé » quand la case TTFL est confirmée", () => {
    render(
      <CeSoirCard
        {...base}
        lignes={[
          { label: "Cpt 01", joueur: "Anthony Davis", pose: true, href: "/ce-soir?pour=c01" },
          { label: "Cpt 13", joueur: null, href: "/ce-soir?pour=c13" },
        ]}
      />,
    );
    expect(screen.getByText("Anthony Davis")).toBeInTheDocument();
    expect(screen.getByText("sur TTFL")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cpt 01/ })).toHaveAttribute("href", "/ce-soir?pour=c01");
    expect(screen.getByText("pas encore de pick")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les picks conseillés" })).toHaveAttribute("href", "/ce-soir");
  });

  it("compte secret : un cadenas, jamais de nom de joueur", () => {
    render(<CeSoirCard {...base} lignes={[{ label: "Cpt 02", joueur: "Joueur Caché", secret: true, href: "/ce-soir?pour=c02" }]} />);
    expect(screen.queryByText("Joueur Caché")).toBeNull();
    expect(screen.getByText(/secret jusqu'à la clôture/)).toBeInTheDocument();
  });

  it("montre la fourchette du moteur quand la projection est connue, et signale une équipe incomplète", () => {
    render(<CeSoirCard {...base} projection={42} equipe={{ posees: 8, total: 10, href: "/ce-soir?pour=equipe" }} lignes={[]} />);
    expect(screen.getByText(/s'il joue/)).toBeInTheDocument();
    expect(screen.getByText(/de chances de faire 40\+/)).toBeInTheDocument();
    expect(screen.getByText("8/10 comptes avec un pick")).toBeInTheDocument();
  });
});
