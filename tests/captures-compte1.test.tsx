import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PicksValidesCard } from "@/components/PicksValidesCard";
import type { Capture } from "@/lib/captures";

const capture = (compte: string, joueur: string): Capture => ({
  compte,
  pick_date: "2026-10-21",
  joueur,
  capture_le: "2026-10-21T10:00:00Z",
  url: `https://exemple.test/${compte}`,
});

describe("capture du site pour le compte 01", () => {
  it("vue complète : la ligne « Compte 1 » propose sa capture", () => {
    render(
      <PicksValidesCard
        picks={[{ pick_date: "2026-10-21", player: "Nikola Jokic" }]}
        autres={[]}
        aujourdhui="2026-10-20"
        captures={[capture("01", "Nikola Jokic")]}
      />,
    );
    expect(screen.getAllByRole("button", { name: /Voir la capture du site/ })).toHaveLength(1);
  });

  it("vue simple (compte 1 seul) : la capture est aussi proposée", () => {
    render(
      <PicksValidesCard
        picks={[{ pick_date: "2026-10-21", player: "Nikola Jokic" }]}
        aujourdhui="2026-10-20"
        captures={[capture("01", "Nikola Jokic")]}
      />,
    );
    expect(screen.getAllByRole("button", { name: /Voir la capture du site/ })).toHaveLength(1);
  });

  it("pas de capture affichée si le joueur a changé depuis la capture", () => {
    render(
      <PicksValidesCard
        picks={[{ pick_date: "2026-10-21", player: "Luka Doncic" }]}
        aujourdhui="2026-10-20"
        captures={[capture("01", "Nikola Jokic")]}
      />,
    );
    expect(screen.queryByRole("button", { name: /Voir la capture du site/ })).toBeNull();
  });
});
