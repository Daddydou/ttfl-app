import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeX2 } from "@/components/BadgeX2";
import { CeSoirCard } from "@/components/CeSoirCard";
import { PicksValidesCard } from "@/components/PicksValidesCard";
import { PickDuSoirResume } from "@/components/PickDuSoirResume";
import { GrilleSemaine } from "@/components/GrilleSemaine";
import { construireCarteX2, cleX2, x2Pour } from "@/lib/x2-affichage";
import type { EtatSecret } from "@/lib/secret";
import { construireSemaine } from "@/lib/semaine";

const lignes = [
  { compte: "01", pick_date: "2026-11-10", player: "Luka Dončić", statut: "pose" },
  { compte: "03", pick_date: "2026-11-11", player: "Nikola Jokic", statut: "voulu" },
  { compte: "04", pick_date: "2026-11-12", player: "Joel Embiid", statut: "a_retirer" },
  { compte: "05", pick_date: "2026-11-12", player: "Joel Embiid", statut: "annule_site" },
  { compte: "06", pick_date: "2026-11-12", player: "Joel Embiid", statut: "echec" },
];

describe("carte x2 (lib)", () => {
  it("ne garde que les x2 posés ou prévus", () => {
    const carte = construireCarteX2(lignes);
    expect(Object.keys(carte).sort()).toEqual([cleX2("01", "2026-11-10"), cleX2("03", "2026-11-11")].sort());
  });

  it("le badge suit le JOUEUR : un autre joueur sur la même soirée n'a pas de badge", () => {
    const carte = construireCarteX2(lignes);
    expect(x2Pour(carte, "01", "2026-11-10", "Luka Doncic")).toBe("pose"); // accents ignorés
    expect(x2Pour(carte, "01", "2026-11-10", "Nikola Jokic")).toBeNull();
    expect(x2Pour(carte, "01", "2026-11-10", null)).toBeNull();
    expect(x2Pour(carte, "03", "2026-11-11", "Nikola Jokic")).toBe("voulu");
    expect(x2Pour(undefined, "01", "2026-11-10", "Luka Doncic")).toBeNull();
  });

  it("date avec heure : seule la partie jour compte", () => {
    const carte = construireCarteX2([{ ...lignes[0], pick_date: "2026-11-10T00:00:00+00:00" }]);
    expect(x2Pour(carte, "01", "2026-11-10", "Luka Doncic")).toBe("pose");
  });

  it("compte 02 : aucun badge tant que la soirée est secrète, badge une fois révélée ou close", () => {
    const l02 = [{ compte: "02", pick_date: "2026-11-10", player: "Jalen Brunson", statut: "pose" }];
    const etat = (revele: string | null, cloture: string | null): EtatSecret => ({
      actif: true, compte: "02", profil: "prudent", lisible: true,
      lignes: { "2026-11-10": { soiree: "2026-11-10", cloture, revele_le: revele, motif: null } },
    });
    const maintenant = Date.parse("2026-11-10T12:00:00Z");
    const secret = (e: EtatSecret) => ({ etat: e, aujourdhui: "2026-11-10", maintenantMs: maintenant });
    expect(Object.keys(construireCarteX2(l02, secret(etat(null, "2026-11-10T20:00:00Z"))))).toHaveLength(0);
    expect(Object.keys(construireCarteX2(l02, secret(etat("2026-11-10T11:00:00Z", null))))).toHaveLength(1);
    expect(Object.keys(construireCarteX2(l02, secret(etat(null, "2026-11-10T10:00:00Z"))))).toHaveLength(1);
    // Lecture du secret impossible : tout est secret, donc aucun badge.
    expect(Object.keys(construireCarteX2(l02, secret({ ...etat(null, null), lisible: false })))).toHaveLength(0);
  });
});

describe("BadgeX2", () => {
  it("rien sans x2 ; posé et prévu se distinguent", () => {
    const { container, rerender } = render(<BadgeX2 etat={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<BadgeX2 etat="pose" />);
    expect(screen.getByTitle("Bonus ×2 posé sur le site")).toHaveTextContent("×2");
    rerender(<BadgeX2 etat="voulu" />);
    expect(screen.getByTitle(/prévu, pas encore posé/)).toBeInTheDocument();
  });
});

describe("badge ×2 dans les écrans", () => {
  const carte = construireCarteX2(lignes);

  it("Accueil — carte « Ce soir »", () => {
    render(
      <CeSoirCard
        titreDate="mar. 10 nov."
        equipe={{ posees: 0, total: 10, href: "/ce-soir?pour=equipe" }}
        projection={null}
        fraicheur={<p>f</p>}
        lignes={[
          { label: "Cpt 01", joueur: "Luka Dončić", x2: "pose", href: "/ce-soir?pour=c01" },
          { label: "Cpt 13", joueur: "Autre Joueur", href: "/ce-soir?pour=c13" },
        ]}
      />,
    );
    expect(screen.getAllByTitle("Bonus ×2 posé sur le site")).toHaveLength(1);
  });

  it("Accueil — prochains soirs : compte 01 seul et lignes par compte", () => {
    const { rerender } = render(
      <PicksValidesCard picks={[{ pick_date: "2026-11-10", player: "Luka Dončić" }]} aujourdhui="2026-11-09" x2={carte} />,
    );
    expect(screen.getAllByTitle("Bonus ×2 posé sur le site")).toHaveLength(1);
    rerender(
      <PicksValidesCard
        picks={[{ pick_date: "2026-11-10", player: "Luka Dončić" }]}
        autres={[{ pick_date: "2026-11-11", player: "Nikola Jokic", compte: "03" }]}
        aujourdhui="2026-11-09"
        x2={carte}
      />,
    );
    expect(screen.getAllByTitle("Bonus ×2 posé sur le site")).toHaveLength(1);
    expect(screen.getAllByTitle(/prévu, pas encore posé/)).toHaveLength(1);
  });

  it("Conseillés — résumé du pick du soir", () => {
    render(<PickDuSoirResume titre="Ce soir · Compte 1" pick="Luka Dončić" projectionPick={50} pose={false} n1={null} x2="voulu" />);
    expect(screen.getByTitle(/prévu, pas encore posé/)).toBeInTheDocument();
  });

  it("Semaine équipe — badge dans la case du bon compte et de la bonne soirée", () => {
    const semaine = construireSemaine({
      dates: ["2026-11-11", "2026-11-12"],
      comptes: ["03", "04"],
      picks: [
        { pick_date: "2026-11-11", player: "Nikola Jokic", compte: "03" },
        { pick_date: "2026-11-11", player: "Nikola Jokic", compte: "04" },
      ],
      envois: [],
      autos: [],
    });
    render(<GrilleSemaine semaine={semaine} x2={carte} />);
    const badges = screen.getAllByTitle(/prévu, pas encore posé/);
    // Un seul dans la grille (compte 03, 11/11) ; la légende en montre un autre, posé ou prévu, sans titre dupliqué.
    expect(badges.length).toBeGreaterThanOrEqual(1);
    const ligne03 = screen.getByRole("rowheader", { name: "03" }).closest("tr")!;
    expect(ligne03.querySelector("[title*='prévu']")).not.toBeNull();
    const ligne04 = screen.getByRole("rowheader", { name: "04" }).closest("tr")!;
    expect(ligne04.querySelector("[title*='×2']")).toBeNull();
  });
});
