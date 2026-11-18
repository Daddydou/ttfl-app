import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecapNuit } from "@/components/RecapNuit";
import { classerNuit, rangOrdinal, resultatDuPick, scoreAffiche, topNuit, type LigneNuit } from "@/lib/recap-nuit";

const l = (player: string, ttfl: number, team = "LAL"): LigneNuit => ({ player, team, ttfl, minutes: 30 });

describe("classerNuit", () => {
  it("classe par score décroissant, ex aequo au même rang", () => {
    const c = classerNuit([l("B", 40), l("A", 55), l("C", 40), l("D", -3)]);
    expect(c.map((x) => [x.player, x.rang])).toEqual([
      ["A", 1],
      ["B", 2],
      ["C", 2],
      ["D", 4],
    ]);
  });

  it("repère le pick sans tenir compte des accents ni de la casse", () => {
    const c = classerNuit([l("Luka Doncic", 60), l("Autre", 10)], "Luka Dončić");
    expect(c[0].monPick).toBe(true);
    expect(c[1].monPick).toBe(false);
  });

  it("topNuit coupe à 30", () => {
    const toutes = classerNuit(Array.from({ length: 45 }, (_, i) => l(`J${i}`, 100 - i)));
    expect(topNuit(toutes)).toHaveLength(30);
  });
});

describe("resultatDuPick", () => {
  const c = classerNuit([l("A", 55), l("B", 20)], "B");
  it("rang et score du pick", () => {
    expect(resultatDuPick(c, "B")).toEqual({ nom: "B", rang: 2, ttfl: 20 });
  });
  it("pick sans score = n'a pas joué", () => {
    expect(resultatDuPick(classerNuit([l("A", 55)], "Absent"), "Absent")).toEqual({ nom: "Absent", rang: null, ttfl: null });
  });
  it("pas de pick = rien", () => {
    expect(resultatDuPick(c, null)).toBeNull();
  });
});

it("formats", () => {
  expect(rangOrdinal(1)).toBe("1er");
  expect(rangOrdinal(12)).toBe("12e");
  expect(scoreAffiche(55)).toBe("55");
  expect(scoreAffiche(12.5)).toBe("12,5");
});

describe("<RecapNuit>", () => {
  const nuit = Array.from({ length: 40 }, (_, i) => l(`Joueur ${i + 1}`, 100 - i));

  it("10 lignes visibles, 20 repliées, titre et date", () => {
    const classees = classerNuit(nuit);
    const { container } = render(<RecapNuit soiree="2026-11-17" top={topNuit(classees)} total={classees.length} pick={null} />);
    expect(screen.getByText("Top 30 de la nuit")).toBeTruthy();
    expect(screen.getByText(/mardi 17 novembre/)).toBeTruthy();
    expect(container.querySelectorAll("li")).toHaveLength(30);
    expect(screen.getByText("Voir les 20 suivants")).toBeTruthy();
    expect(container.querySelector("details")?.querySelectorAll("li")).toHaveLength(20);
  });

  it("pick dans le top : ligne marquée, pas de pied de carte", () => {
    const classees = classerNuit(nuit, "Joueur 3");
    const { container } = render(
      <RecapNuit soiree="2026-11-17" top={topNuit(classees)} total={classees.length} pick={resultatDuPick(classees, "Joueur 3")} />,
    );
    expect(container.querySelector('li[aria-current="true"]')?.textContent).toContain("Joueur 3");
    expect(screen.queryByText(/Ton pick :/)).toBeNull();
  });

  it("pick hors du top : rang et score en pied de carte", () => {
    const classees = classerNuit(nuit, "Joueur 35");
    render(<RecapNuit soiree="2026-11-17" top={topNuit(classees)} total={classees.length} pick={resultatDuPick(classees, "Joueur 35")} />);
    expect(screen.getByText(/35e sur 40 \(66 pts\)/)).toBeTruthy();
  });

  it("pick sans score : 0 point", () => {
    const classees = classerNuit(nuit, "Absent");
    render(<RecapNuit soiree="2026-11-17" top={topNuit(classees)} total={classees.length} pick={resultatDuPick(classees, "Absent")} />);
    expect(screen.getByText(/pas de score cette soirée \(0 pt\)/)).toBeTruthy();
  });

  it("aucune ligne : rien n'est affiché", () => {
    const { container } = render(<RecapNuit soiree="2026-11-17" top={[]} total={0} pick={null} />);
    expect(container.innerHTML).toBe("");
  });
});
