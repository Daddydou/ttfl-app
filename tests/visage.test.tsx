// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

// Données fictives : le test ne dépend pas du vrai fichier généré par le script.
vi.mock("@/lib/visages-data.json", () => ({
  default: {
    genereLe: "2026-11-18T00:00:00Z",
    source: "test",
    visages: {
      "Joueur Alpha": { url: "https://upload.wikimedia.org/a.jpg", auteur: "Auteur A", licence: "CC BY 4.0", page: "https://commons.wikimedia.org/wiki/File:A.jpg" },
      "Béta Dončić": { url: "https://upload.wikimedia.org/b.jpg", auteur: "Auteur B", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:B.jpg" },
    },
    sansPhoto: ["Joueur Sans", "Autre Sans"],
  },
}));

const { Visage } = await import("@/components/Visage");
const { creditsVisages, initiales, nbSansPhoto, visageDe } = await import("@/lib/visages");

describe("lib/visages", () => {
  it("initiales : prénom + nom, suffixes ignorés", () => {
    expect(initiales("Luka Dončić")).toBe("LD");
    expect(initiales("Shai Gilgeous-Alexander")).toBe("SG");
    expect(initiales("Bobby Portis Jr.")).toBe("BP");
    expect(initiales("Trey Murphy III")).toBe("TM");
    expect(initiales("Nene")).toBe("N");
    expect(initiales("   ")).toBe("?");
  });

  it("visageDe trouve le joueur malgré accents, casse et ponctuation", () => {
    expect(visageDe("joueur alpha")?.auteur).toBe("Auteur A");
    expect(visageDe("Beta Doncic")?.licence).toBe("CC0");
    expect(visageDe("Joueur Inconnu")).toBeNull();
    expect(visageDe(null)).toBeNull();
  });

  it("crédits : tous les joueurs avec photo, triés ; compteur des sans photo", () => {
    expect(creditsVisages().map((c) => c.nom)).toEqual(["Béta Dončić", "Joueur Alpha"]);
    expect(nbSansPhoto()).toBe(2);
  });
});

describe("Visage", () => {
  it("photo libre : une image décorative, nom écrit à côté (alt vide)", () => {
    const { container } = render(<Visage nom="Joueur Alpha" taille={32} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://upload.wikimedia.org/a.jpg");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(container.querySelector("[data-visage]")?.getAttribute("data-visage")).toBe("photo");
  });

  it("sans photo libre : les initiales", () => {
    const { container } = render(<Visage nom="Joueur Sans" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("JS");
    expect(container.querySelector("[data-visage]")?.getAttribute("data-visage")).toBe("initiales");
  });

  it("photo qui ne charge pas : repli sur les initiales, jamais d'image cassée", () => {
    const { container } = render(<Visage nom="Joueur Alpha" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("JA");
  });

  it("pas de nom (pick secret ou case vide) : rien du tout", () => {
    const a = render(<Visage nom={null} />);
    const b = render(<Visage nom="" />);
    expect(a.container.textContent).toBe("");
    expect(a.container.innerHTML).toBe("");
    expect(b.container.innerHTML).toBe("");
  });
});
