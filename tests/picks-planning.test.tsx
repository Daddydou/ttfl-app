import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/app/actions", () => ({
  setScore: vi.fn(),
  deletePick: vi.fn(),
  listerJoueursDuSoir: vi.fn(),
  pickPlayerComptes: vi.fn(),
  retirerPickComptes: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { default: PicksPage } = await import("@/app/(app)/picks/page");

type Ligne = Record<string, unknown>;

// Une ligne de la vue ttfl_nuits (soirée connue, projections à l'avance par défaut).
function nuit(date: string, extra: Ligne = {}): Ligne {
  return {
    mode: "regular",
    game_date: date,
    n_runs: 1,
    n_soir: 0,
    max_candidats: 125,
    dernier_calcul: "2026-10-09T10:00:00Z",
    ...extra,
  };
}

async function renderPage(params: Record<string, string>, tables: Record<string, Ligne[]> = {}) {
  createClient.mockResolvedValue(
    fakeSupabase({ ttfl_nuits: [], ttfl_picks: [], ttfl_envois: [], ttfl_runs: [], ...tables }),
  );
  render(await PicksPage({ searchParams: Promise.resolve({ mode: "regular", ...params }) }));
}

describe("Page « Mes picks » — planning", () => {
  beforeEach(() => {
    createClient.mockReset();
    // Date du jour figée : vendredi 9 octobre 2026 (midi UTC = 8 h à New York).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("liste les soirées du mois et ignore les runs vides « Aucun match »", async () => {
    await renderPage(
      {},
      {
        ttfl_nuits: [
          nuit("2026-10-20"),
          nuit("2026-10-21"),
          nuit("2026-10-09", { n_soir: 1, max_candidats: 0 }), // run vide du push quotidien
        ],
      },
    );
    expect(screen.getByText(/20 oct/)).toBeInTheDocument();
    expect(screen.getByText(/21 oct/)).toBeInTheDocument();
    expect(screen.queryByText(/9 oct/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Projections à l'avance")).toHaveLength(2);
  });

  it("affiche le pick de la zone Équipe et son état « posé sur TTFL »", async () => {
    await renderPage(
      { zone: "equipe" },
      {
        ttfl_nuits: [nuit("2026-10-20")],
        ttfl_picks: [{ pick_date: "2026-10-20", player: "LeBron James", compte: "03" }],
        ttfl_envois: [
          { pick_date: "2026-10-20", compte: "03", joueur: "LeBron James", statut: "confirme", message: null },
        ],
      },
    );
    expect(screen.getByText("LeBron James · 1/10 comptes")).toBeInTheDocument();
    expect(screen.getByText("Posé sur TTFL")).toBeInTheDocument();
  });

  it("n'affiche pas les picks des autres comptes dans la zone Compte 1", async () => {
    await renderPage(
      { zone: "c01" },
      {
        ttfl_nuits: [nuit("2026-10-20")],
        ttfl_picks: [{ pick_date: "2026-10-20", player: "LeBron James", compte: "03" }],
      },
    );
    expect(screen.getByText("Pas de pick")).toBeInTheDocument();
    expect(screen.queryByText(/LeBron James/)).not.toBeInTheDocument();
  });

  it("signale un conflit entre l'application et le site, avec son message", async () => {
    await renderPage(
      { zone: "c01" },
      {
        ttfl_nuits: [nuit("2026-10-20")],
        ttfl_picks: [{ pick_date: "2026-10-20", player: "Nikola Jokic", compte: "01" }],
        ttfl_envois: [
          {
            pick_date: "2026-10-20",
            compte: "01",
            joueur: "LeBron James",
            statut: "conflit",
            message: "le site a « LeBron James », l'application veut « Nikola Jokic »",
          },
        ],
      },
    );
    expect(screen.getByText("Conflit")).toBeInTheDocument();
    expect(screen.getByText(/le site a « LeBron James »/)).toBeInTheDocument();
  });

  it("propose le choix seulement pour les soirées à venir, pas pour les passées", async () => {
    await renderPage(
      {},
      {
        ttfl_nuits: [nuit("2026-10-05"), nuit("2026-10-20")],
        ttfl_picks: [{ pick_date: "2026-10-05", player: "Jamal Murray", compte: "01" }],
      },
    );
    // Une seule soirée (20/10) est encore modifiable.
    expect(screen.getAllByRole("button", { name: "Choisir un joueur" })).toHaveLength(1);
    expect(screen.getByText("Jamal Murray")).toBeInTheDocument(); // la passée reste affichée
  });

  it("explique comment alimenter le planning quand le mois est vide", async () => {
    await renderPage({ mois: "2026-12" });
    expect(screen.getByText("Aucune soirée connue ce mois-ci.")).toBeInTheDocument();
    expect(screen.getByText(/pont\.push_avance/)).toBeInTheDocument();
  });

  it("propose les trois zones et un onglet par mois", async () => {
    await renderPage({}, { ttfl_nuits: [nuit("2026-10-20"), nuit("2026-11-03")] });
    expect(screen.getByRole("link", { name: "Compte 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compte 2" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Équipe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /octobre 2026/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /novembre 2026/i })).toBeInTheDocument();
  });

  it("n'offre pas le planning en playoffs (historique seul, sans onglet Planning)", async () => {
    await renderPage({ mode: "playoffs" });
    expect(screen.queryByRole("link", { name: "Planning" })).not.toBeInTheDocument();
    expect(screen.getByText(/Aucun pick en playoffs/)).toBeInTheDocument();
  });
});
