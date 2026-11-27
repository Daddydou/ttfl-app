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

  it("13 comptes en une vue : vert + « sur TTFL » seulement quand le site a confirmé, x2 posé en pastille, compteur, lien par compte", () => {
    const comptes = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"];
    const lignes = comptes.map((c) => ({
      label: `Cpt ${c}`,
      joueur: c === "02" ? null : `Joueur ${c}`,
      secret: c === "02",
      pose: c === "01" || c === "03" || c === "07",
      x2: c === "03" ? ("pose" as const) : null,
      href: c === "03" ? "/ce-soir?pour=equipe&compte=03" : `/ce-soir?pour=c${c}`,
    }));
    const { container } = render(<CeSoirCard titreDate="ven. 27 nov." projection={null} fraicheur={<p>f</p>} lignes={lignes} />);
    expect(container.querySelectorAll("ul > li")).toHaveLength(13);
    // 3 comptes posés sur TTFL, le compte secret n'est pas compté (12 comptes visibles)
    expect(screen.getByText("3/12 posés sur TTFL")).toBeInTheDocument();
    expect(screen.getAllByText("sur TTFL")).toHaveLength(3);
    expect(screen.getByText("Joueur 01")).toHaveClass("text-avail");
    expect(screen.getByText("Joueur 04")).not.toHaveClass("text-avail");
    // pastille ×2 pleine uniquement sur le compte 03
    expect(screen.getAllByTitle("Bonus ×2 posé sur le site")).toHaveLength(1);
    // le compte (la ligne) mène aux conseillés de CE compte
    expect(screen.getByRole("link", { name: /Cpt 03/ })).toHaveAttribute("href", "/ce-soir?pour=equipe&compte=03");
    expect(screen.getByRole("link", { name: /Cpt 13/ })).toHaveAttribute("href", "/ce-soir?pour=c13");
    // le secret : cadenas, aucun nom de joueur
    expect(screen.getByText(/secret jusqu'à la clôture/)).toBeInTheDocument();
  });

  it("montre la fourchette du moteur quand la projection est connue, et signale une équipe incomplète", () => {
    render(<CeSoirCard {...base} projection={42} equipe={{ posees: 8, total: 10, href: "/ce-soir?pour=equipe" }} lignes={[]} />);
    expect(screen.getByText(/s'il joue/)).toBeInTheDocument();
    expect(screen.getByText(/de chances de faire 40\+/)).toBeInTheDocument();
    expect(screen.getByText("8/10 comptes avec un pick")).toBeInTheDocument();
  });
});
