import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { engineBenchmark, versusLastNights } from "@/lib/stats";
import { VersusEngineCard } from "@/components/VersusEngineCard";
import type { TtflBenchmark, TtflPick } from "@/lib/types";

function pick(date: string, player: string, score: number | null): TtflPick {
  return { id: Number(date.slice(-2)), mode: "regular", pick_date: date, player, score, created_at: date };
}

function bench(strategy: TtflBenchmark["strategy"], detail: TtflBenchmark["detail_json"]): TtflBenchmark {
  return {
    id: 1, tournoi: "regular-2025-26", mode: "regular", strategy, total: 0,
    n_picks: detail.length, avg: null, detail_json: detail, computed_at: "",
  };
}

describe("versusLastNights", () => {
  it("préfère la doctrine au glouton comme pick du moteur", () => {
    const g = bench("greedy", []);
    const d = bench("doctrine", []);
    expect(engineBenchmark([g, d])).toBe(d);
    expect(engineBenchmark([g])).toBe(g);
    expect(engineBenchmark([])).toBeNull();
  });

  it("garde les 7 derniers soirs, du plus récent au plus ancien, alignés par date", () => {
    const picks = Array.from({ length: 9 }, (_, i) =>
      pick(`2026-03-${String(i + 1).padStart(2, "0")}`, `Joueur ${i + 1}`, 30),
    );
    const b = bench("greedy", [
      { date: "2026-03-09", player: "Nikola Jokic", score: 55 },
      { date: "2026-03-08T00:00:00", player: "Joueur 8", score: 30 },
    ]);
    const rows = versusLastNights(picks, b, 7);
    expect(rows.map((r) => r.date)).toEqual([
      "2026-03-09", "2026-03-08", "2026-03-07", "2026-03-06",
      "2026-03-05", "2026-03-04", "2026-03-03",
    ]);
    expect(rows[0].engine?.player).toBe("Nikola Jokic");
    expect(rows[1].engine?.player).toBe("Joueur 8");
    expect(rows[2].engine).toBeNull();
  });
});

describe("VersusEngineCard", () => {
  it("affiche l'écart cumulé sur les soirs comparables uniquement", () => {
    const rows = versusLastNights(
      [
        pick("2026-03-10", "Jayson Tatum", 40),
        pick("2026-03-09", "Jalen Brunson", 50),
        pick("2026-03-08", "Nikola Jokic", null),
      ],
      bench("greedy", [
        { date: "2026-03-10", player: "Nikola Jokic", score: 55 },
        { date: "2026-03-09", player: "Jalen Brunson", score: 50 },
        { date: "2026-03-08", player: "Luka Doncic", score: 60 },
      ]),
    );
    render(<VersusEngineCard rows={rows} engineLabel="Glouton réaliste" />);
    // 40-55 + 50-50 = -15 ; le soir non noté est ignoré.
    expect(screen.getAllByText("-15")).toHaveLength(2);
    expect(screen.getByText("même choix")).toBeInTheDocument();
    expect(screen.getByText(/3 dernier\(s\) soir\(s\)/)).toBeInTheDocument();
  });
});
