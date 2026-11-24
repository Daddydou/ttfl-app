import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { etatDeLigne, moisSuivant, resumerX2, synthetiser, type LigneResumeX2 } from "@/lib/x2-resume";
import { X2DuMois } from "@/components/X2DuMois";

// Résumé du x2 par compte (23/11/2026) : posé et validé ce mois-ci ? prévu les jours suivants ?
const AUJ = "2026-11-23";
const l = (o: Partial<LigneResumeX2> = {}): LigneResumeX2 => ({
  compte: "03", mois: "2026-11", pick_date: "2026-11-12", player: "Luka Doncic", statut: "pose", date_site: "2026-11-12", ...o,
});

describe("x2 par compte : état du mois", () => {
  it("posé sur le site ET soirée jouée = validé ; soirée à venir = posé, à venir", () => {
    expect(etatDeLigne(l(), AUJ)).toBe("valide");
    expect(etatDeLigne(l({ pick_date: "2026-11-28" }), AUJ)).toBe("pose_avenir");
    expect(etatDeLigne(l({ pick_date: AUJ }), AUJ)).toBe("pose_avenir"); // soirée du jour : pas encore jouée
  });

  it("prévu (voulu) à venir ; voulu mais soirée passée = jamais posé", () => {
    expect(etatDeLigne(l({ statut: "voulu", pick_date: "2026-11-28" }), AUJ)).toBe("prevu");
    expect(etatDeLigne(l({ statut: "voulu", pick_date: "2026-11-12" }), AUJ)).toBe("non_pose");
  });

  it("retrait, échec et retiré à la main ont leur état", () => {
    expect(etatDeLigne(l({ statut: "a_retirer" }), AUJ)).toBe("retrait");
    expect(etatDeLigne(l({ statut: "echec" }), AUJ)).toBe("echec");
    expect(etatDeLigne(l({ statut: "annule_site" }), AUJ)).toBe("retire_main");
  });

  it("le mois suivant gère le passage d'année", () => {
    expect(moisSuivant("2026-11")).toBe("2026-12");
    expect(moisSuivant("2026-12")).toBe("2027-01");
  });
});

describe("x2 par compte : résumé des 13 comptes", () => {
  const lignes = [
    l({ compte: "01" }),
    l({ compte: "03", statut: "voulu", pick_date: "2026-11-28" }),
    l({ compte: "04", mois: "2026-10", pick_date: "2026-10-30" }), // mois précédent : ignoré
    l({ compte: "05", mois: "2026-12", pick_date: "2026-12-03", statut: "voulu" }), // mois suivant seulement
    l({ compte: "02", pick_date: "2026-11-25", statut: "voulu" }),
  ];
  const estSecret = (compte: string, date: string) => compte === "02" && date === "2026-11-25";
  const resume = resumerX2(lignes, AUJ, estSecret);

  it("un état pour chacun des 13 comptes", () => {
    expect(resume).toHaveLength(13);
    expect(resume.find((r) => r.compte === "01")?.ceMois).toEqual({ etat: "valide", date: "12/11", joueur: "Luka Doncic" });
    expect(resume.find((r) => r.compte === "03")?.ceMois.etat).toBe("prevu");
    expect(resume.find((r) => r.compte === "04")?.ceMois.etat).toBe("aucun");
  });

  it("le x2 du mois suivant est montré s'il est déjà prévu", () => {
    const r05 = resume.find((r) => r.compte === "05")!;
    expect(r05.ceMois.etat).toBe("aucun");
    expect(r05.moisSuivant).toEqual({ etat: "prevu", date: "03/12", joueur: "Luka Doncic" });
    expect(resume.find((r) => r.compte === "01")?.moisSuivant).toBeNull();
  });

  it("soirée secrète du compte 02 : ni date ni joueur", () => {
    expect(resume.find((r) => r.compte === "02")?.ceMois).toEqual({ etat: "secret", date: null, joueur: null });
  });

  it("synthèse : validés, à venir, sans x2, secrets", () => {
    const s = synthetiser(resume, AUJ);
    expect(s).toEqual({ mois: "2026-11", valides: 1, aVenir: 1, problemes: 0, sans: 10, secrets: 1 });
  });

  it("l'affichage montre l'état de chaque compte, sans nom ni date pour le secret", () => {
    const { container } = render(<X2DuMois resume={resume} synthese={synthetiser(resume, AUJ)} />);
    expect(screen.getByText(/x2 de novembre 2026/)).toBeInTheDocument();
    expect(screen.getByText(/1 validé · 1 à venir · 10 sans x2/)).toBeInTheDocument();
    expect(screen.getByText("Posé et validé")).toBeInTheDocument();
    // compte 03 (ce mois-ci) + compte 05 (mois suivant)
    expect(screen.getAllByText("Prévu, pas encore posé")).toHaveLength(2);
    expect(screen.getByText("🔒 secret")).toBeInTheDocument();
    expect(container.textContent).toContain("mois suivant");
    expect(container.textContent).not.toContain("25/11");
  });
});
