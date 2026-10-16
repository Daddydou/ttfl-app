import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TtflProjection, TtflRun } from "@/lib/types";
import { fakeSupabase } from "./fakeSupabase";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/app/actions", () => ({ pickPlayerComptes: vi.fn() }));
vi.mock("@/app/(app)/admin/actions", () => ({ lancerCommande: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/RealtimeRuns", () => ({ RealtimeRuns: () => null }));

const { default: PicksConseillesPage } = await import("@/app/(app)/ce-soir/page");

// « Aujourd'hui » figé : le samedi 10/10/2026 (New York), avant l'ouverture de la saison.
beforeEach(() => {
  createClient.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T16:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const run: TtflRun = {
  id: 1, computed_at: "2026-10-10T10:00:00Z", mode: "regular", game_date: "2026-10-20", injury_report_fresh: false,
  n_candidates: 50, note: "AVANCE · blessures inconnues",
};

const projections = (): TtflProjection[] =>
  Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, run_id: 1, rank: i + 1, player: `Joueur ${i + 1}`, team: "LAL", opponent: "GSW", position: "G",
    projection: 60 - i * 2, forme: 38.2, ceiling: 47.5, matchup_factor: 1.07, status: null, is_pick: false,
    is_urgent: false, series_state: null, expected_nights_left: null, explanation: null,
  }));

const base = (): Record<string, unknown[]> => ({
  ttfl_runs: [run],
  ttfl_nuits: [{ mode: "regular", game_date: "2026-10-20", n_runs: 1, n_soir: 0, max_candidats: 50, dernier_calcul: "2026-10-10T10:00:00Z" }],
  ttfl_projections: projections(),
  ttfl_picks: [],
  ttfl_manual_absents: [],
  ttfl_cotes: [],
});

const jours = (prefixe: string) =>
  Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 20 + i)).toISOString().slice(0, 10), statut: "plan", joueur: `${prefixe} ${i + 1}`,
    equipe: "LAL", adversaire: "GSW", position: "G", projection: 50 - i, nb_matchs: 1, alternatives: [],
  }));

const planDe = (compte: string, prefixe: string) => ({
  compte, profil: "equilibre", debut: "2026-10-20", reference: "2026-10-10", calcule_le: new Date().toISOString(),
  total_projection: 1000, reglages: { libelle: "Équilibrée", ordre: 1, defaut: true }, jours: jours(prefixe),
});

const avecPlans = () => ({ ...base(), ttfl_plan30: [planDe("01", "Plan-C1"), planDe("02", "Plan-C2")] });

async function rendre(tables: Record<string, unknown[]>, pour: string) {
  createClient.mockResolvedValue(fakeSupabase(tables));
  render(await PicksConseillesPage({ searchParams: Promise.resolve({ pour }) }));
}

describe("Plan 30 jours dans Picks conseillés", () => {
  it("Compte 1 : le plan du compte 01", async () => {
    await rendre(avecPlans(), "c01");
    expect(screen.getByRole("region", { name: "Plan 30 jours" })).toBeInTheDocument();
    expect(screen.getByText("Plan-C1 1", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText(/Plan-C2/)).not.toBeInTheDocument();
  });

  it("Compte 2 : le plan du compte 02", async () => {
    await rendre(avecPlans(), "c02");
    expect(screen.getByText("Plan-C2 1", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText(/Plan-C1/)).not.toBeInTheDocument();
  });

  it("zone Équipe : aucun plan 30 jours", async () => {
    await rendre(avecPlans(), "equipe");
    expect(screen.queryByRole("region", { name: "Plan 30 jours" })).not.toBeInTheDocument();
  });

  it("sans plan calculé : message d'attente, le classement du soir reste affiché", async () => {
    await rendre(base(), "c01");
    expect(screen.getByText("Aucun plan calculé pour l'instant.")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(10);
  });
});
