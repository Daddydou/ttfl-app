import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MODES, SECTIONS, modesParSection } from "@/lib/modes-operatoires";
import ModeOperatoirePage from "@/app/(app)/mode-operatoire/page";

describe("contenu des modes opératoires", () => {
  it("chaque fiche est complète, avec une section connue et une date valide", () => {
    const sections = new Set(SECTIONS.map((s) => s.id));
    for (const m of MODES) {
      expect(sections.has(m.section), m.id).toBe(true);
      expect(m.titre.length, m.id).toBeGreaterThan(5);
      expect(m.pourQuoi.length, m.id).toBeGreaterThan(10);
      expect(m.quand.length, m.id).toBeGreaterThan(5);
      expect(m.etapes.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.etapes.every((e) => e.trim().length > 5), m.id).toBe(true);
      expect(m.misAJour, m.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (m.lien) expect(m.lien.href.startsWith("/"), m.id).toBe(true);
    }
  });

  it("les identifiants (ancres) sont uniques", () => {
    const ids = MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("aucune section n'est vide et l'ordre des sections est respecté", () => {
    const g = modesParSection();
    expect(g.map((x) => x.section.id)).toEqual(SECTIONS.map((s) => s.id));
    expect(g.every((x) => x.modes.length > 0)).toBe(true);
  });

  it("le contenu ne contient ni secret, ni Telegram", () => {
    const texte = JSON.stringify(MODES);
    expect(texte).not.toMatch(/telegram/i);
    expect(texte).not.toMatch(/github_pat_[A-Za-z0-9_]{10,}/);
    expect(texte).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(texte).not.toMatch(/TTFLhash=[A-Za-z0-9]{8,}/);
    expect(texte).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
  });

  it("couvre les sujets importants", () => {
    const ids = MODES.map((m) => m.id);
    for (const attendu of ["fonctionnement", "choisir-pick", "pick-secret", "vainqueurs", "notifications", "cookies", "jeton-github", "mode-cloud", "regles", "modifier-modes"]) {
      expect(ids).toContain(attendu);
    }
  });
});

describe("page Mode opératoire", () => {
  it("affiche le titre, toutes les fiches et leurs étapes", () => {
    render(<ModeOperatoirePage />);
    expect(screen.getByRole("heading", { name: "Mode opératoire" })).toBeInTheDocument();
    for (const s of SECTIONS) {
      expect(screen.getByRole("heading", { name: s.titre })).toBeInTheDocument();
    }
    const cookies = MODES.find((m) => m.id === "cookies")!;
    expect(screen.getByText(cookies.titre)).toBeInTheDocument();
    const fiche = document.getElementById("cookies")!;
    expect(within(fiche).getAllByRole("listitem").length).toBeGreaterThanOrEqual(cookies.etapes.length);
    expect(within(fiche).getByText(/Mis à jour le 24\/10\/2026/)).toBeInTheDocument();
  });

  it("propose un raccourci vers l'écran concerné", () => {
    render(<ModeOperatoirePage />);
    const fiche = document.getElementById("vainqueurs")!;
    expect(within(fiche).getByRole("link", { name: /Ouvrir Vainqueurs/ })).toHaveAttribute("href", "/vainqueurs");
  });
});
