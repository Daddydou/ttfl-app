import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { TtflPick } from "@/lib/types";
import { fakeSupabase } from "./fakeSupabase";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/app/actions", () => ({ setScore: vi.fn(), deletePick: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { default: PicksPage } = await import("@/app/(app)/picks/page");

function pick(p: Partial<TtflPick>): TtflPick {
  return {
    id: 0, mode: "regular", pick_date: "2026-03-10", player: "",
    score: null, created_at: "2026-03-10T20:00:00Z", ...p,
  };
}

async function renderPage(mode: string, picks: TtflPick[]) {
  createClient.mockResolvedValue(fakeSupabase({ ttfl_picks: picks, ttfl_runs: [] }));
  render(await PicksPage({ searchParams: Promise.resolve({ mode }) }));
}

// Tuile de stat (valeur + libellé) à partir de son libellé.
function stat(label: string) {
  return screen.getByText(label).parentElement!;
}

describe("Page « Mes picks » (historique)", () => {
  beforeEach(() => createClient.mockReset());

  it("affiche un état vide sans pick", async () => {
    await renderPage("regular", []);
    expect(screen.getByText(/Aucun pick en saison régulière/)).toBeInTheDocument();
    expect(within(stat("Moyenne")).getByText("—")).toBeInTheDocument();
  });

  it("liste les picks et calcule total/moyenne sur les seuls picks notés", async () => {
    await renderPage("regular", [
      pick({ id: 1, player: "Jayson Tatum", score: 50 }),
      pick({ id: 2, player: "Jalen Brunson", score: 35, pick_date: "2026-03-09" }),
      pick({ id: 3, player: "Nikola Jokic", score: null, pick_date: "2026-03-11" }),
    ]);
    expect(screen.getByText("Jayson Tatum")).toBeInTheDocument();
    expect(screen.getByText("Nikola Jokic")).toBeInTheDocument();
    expect(within(stat("Picks")).getByText("3")).toBeInTheDocument();
    expect(within(stat("Total")).getByText("85")).toBeInTheDocument();
    expect(within(stat("Moyenne")).getByText("42.5")).toBeInTheDocument();
    expect(screen.getByLabelText("Supprimer le pick Jalen Brunson")).toBeInTheDocument();
  });

  it("affiche le compteur d'usage unique en playoffs", async () => {
    await renderPage("playoffs", [pick({ id: 1, mode: "playoffs", player: "Jayson Tatum" })]);
    expect(screen.getByText("Usage unique")).toBeInTheDocument();
  });
});
