import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TtflProjection, TtflRun } from "@/lib/types";
import { fakeSupabase } from "./fakeSupabase";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/app/actions", () => ({ pickPlayer: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// Le realtime ouvre un websocket : hors sujet pour ces tests.
vi.mock("@/components/RealtimeRuns", () => ({ RealtimeRuns: () => null }));

const { default: CeSoirPage } = await import("@/app/(app)/ce-soir/page");

const run: TtflRun = {
  id: 1,
  computed_at: new Date().toISOString(),
  mode: "regular",
  game_date: "2026-03-10",
  injury_report_fresh: true,
  n_candidates: 42,
  note: null,
};

function proj(p: Partial<TtflProjection>): TtflProjection {
  return {
    id: 0, run_id: 1, rank: 1, player: "", team: "BOS", opponent: "NYK",
    position: null, projection: 40, forme: 38, ceiling: null,
    matchup_factor: 1.05, status: "Available", is_pick: false,
    is_urgent: false, series_state: null, expected_nights_left: null,
    explanation: null, ...p,
  };
}

async function renderPage(tables: Record<string, unknown[]>) {
  createClient.mockResolvedValue(fakeSupabase(tables));
  render(await CeSoirPage());
}

describe("Page « Ce soir »", () => {
  beforeEach(() => createClient.mockReset());

  it("affiche un état vide quand aucun run n'a été poussé", async () => {
    await renderPage({ ttfl_runs: [] });
    expect(screen.getByText("Aucun calcul pour ce soir")).toBeInTheDocument();
    expect(screen.getByText("python push_to_supabase.py")).toBeInTheDocument();
  });

  it("met en avant le joueur marqué is_pick, même s'il n'est pas rang 1", async () => {
    await renderPage({
      ttfl_runs: [run],
      ttfl_projections: [
        proj({ id: 10, rank: 1, player: "Jayson Tatum", projection: 52.3 }),
        proj({ id: 11, rank: 2, player: "Jalen Brunson", projection: 48.1, is_pick: true }),
      ],
      ttfl_picks: [],
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jalen Brunson");
    expect(screen.getByRole("button", { name: "J'ai pické Brunson" })).toBeInTheDocument();
    expect(screen.getByText(/Top 2/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun pick enregistré pour ce soir/)).toBeInTheDocument();
  });

  it("indique le pick déjà enregistré", async () => {
    await renderPage({
      ttfl_runs: [run],
      ttfl_projections: [proj({ id: 10, player: "Jayson Tatum", is_pick: true })],
      ttfl_picks: [{ player: "Jayson Tatum" }],
    });
    expect(screen.getByText(/Pick du soir enregistré : Jayson Tatum/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /J'ai pické/ })).not.toBeInTheDocument();
  });

  it("prévient quand le dernier run date de plus de 18 h", async () => {
    const old = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    await renderPage({
      ttfl_runs: [{ ...run, computed_at: old }],
      ttfl_projections: [proj({ id: 10, player: "Jayson Tatum", is_pick: true })],
      ttfl_picks: [],
    });
    expect(screen.getByText(/Ci-dessous, le dernier classement connu/)).toBeInTheDocument();
  });
});
