import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { comparerSurMemesSoirees } from "@/lib/benchmarks";
import { BenchmarksCard } from "@/components/BenchmarksCard";
import type { TtflBenchmark } from "@/lib/types";

const detail = [
  { date: "2026-10-22", player: "Joueur A", score: 40 },
  { date: "2026-10-23", player: "Joueur B", score: 31 },
];
// Le compte 01 a joué depuis le 20/10, le repère seulement depuis le 22/10.
const picks = [
  { pick_date: "2026-10-20", score: 46 },
  { pick_date: "2026-10-21", score: 43 },
  { pick_date: "2026-10-22", score: 11 },
  { pick_date: "2026-10-23", score: 9 },
  { pick_date: "2026-10-24", score: null },
];

describe("comparerSurMemesSoirees", () => {
  it("ne compare que les soirées communes (les soirées du 20 et 21 n'existent pas chez le repère)", () => {
    const c = comparerSurMemesSoirees(detail, picks);
    expect(c).toMatchObject({ n: 2, toi: 20, repere: 71, delta: -51 });
    expect(c.moyenneToi).toBe(10);
    expect(c.moyenneRepere).toBe(35.5);
  });
  it("ignore un pick sans score et ne plante pas sans soirée commune", () => {
    expect(comparerSurMemesSoirees(detail, [{ pick_date: "2026-10-23", score: null }]).n).toBe(0);
    const vide = comparerSurMemesSoirees([], picks);
    expect(vide).toMatchObject({ n: 0, delta: 0, moyenneToi: null });
  });
});

describe("carte Toi vs les repères", () => {
  const row: TtflBenchmark = {
    id: 1,
    tournoi: "regular-2026-27",
    mode: "regular",
    strategy: "greedy",
    total: 71,
    n_picks: 2,
    avg: 35.5,
    detail_json: detail,
    computed_at: "2026-10-24T07:40:00Z",
  };
  it("affiche l'écart à soirées égales, pas sur toutes les soirées", () => {
    render(<BenchmarksCard rows={[row]} userPicks={picks} />);
    expect(screen.getByText("Glouton réaliste")).toBeInTheDocument();
    expect(screen.getByText("-51")).toBeInTheDocument();
    expect(screen.getByText(/2 soirées/)).toBeInTheDocument();
    expect(screen.getByText(/toi : 20/)).toBeInTheDocument();
  });
  it("dit qu'il n'y a pas de soirée en commun plutôt qu'un faux écart", () => {
    render(<BenchmarksCard rows={[row]} userPicks={[{ pick_date: "2026-10-20", score: 46 }]} />);
    expect(screen.getByText("pas de soirée en commun")).toBeInTheDocument();
  });
});
