import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { TtflProjection, TtflRun } from "@/lib/types";
import { fakeSupabase } from "./fakeSupabase";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/app/actions", () => ({ pickPlayerComptes: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// Le realtime ouvre un websocket : hors sujet pour ces tests.
vi.mock("@/components/RealtimeRuns", () => ({ RealtimeRuns: () => null }));

const { default: PicksConseillesPage } = await import("@/app/(app)/ce-soir/page");

type Ligne = Record<string, unknown>;

// « Aujourd'hui » figé : le samedi 10/10/2026 (New York), avant l'ouverture de la saison.
beforeEach(() => {
  createClient.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T16:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const nuit = (game_date: string, extra: Ligne = {}): Ligne => ({
  mode: "regular", game_date, n_runs: 1, n_soir: 0, max_candidats: 50, dernier_calcul: "2026-10-10T10:00:00Z", ...extra,
});

const runAvance = (game_date = "2026-10-20", extra: Partial<TtflRun> = {}): TtflRun => ({
  id: 1, computed_at: new Date().toISOString(), mode: "regular", game_date, injury_report_fresh: false,
  n_candidates: 50, note: "AVANCE · blessures inconnues", ...extra,
});

function proj(player: string, projection: number, extra: Partial<TtflProjection> = {}): TtflProjection {
  return {
    id: 0, run_id: 1, rank: 1, player, team: "LAL", opponent: "GSW", position: "G", projection,
    forme: 38.2, ceiling: 47.5, matchup_factor: 1.07, status: null, is_pick: false, is_urgent: false,
    series_state: null, expected_nights_left: null, explanation: null, ...extra,
  };
}

// 12 joueurs : P1 (la plus forte projection) … P12.
const douze = () => Array.from({ length: 12 }, (_, i) => proj(`Joueur ${i + 1}`, 60 - i * 2, { id: i + 1 }));

async function rendre(tables: Record<string, unknown[]>, params: { date?: string; pour?: string } = {}) {
  createClient.mockResolvedValue(fakeSupabase(tables));
  render(await PicksConseillesPage({ searchParams: Promise.resolve(params) }));
}

const base = (): Record<string, unknown[]> => ({
  ttfl_runs: [runAvance()],
  ttfl_nuits: [nuit("2026-10-20"), nuit("2026-10-21")],
  ttfl_projections: douze(),
  ttfl_picks: [],
  ttfl_manual_absents: [],
  ttfl_cotes: [],
});

describe("Picks conseillés", () => {
  it("affiche un état vide quand rien n'a été poussé", async () => {
    await rendre({ ttfl_runs: [], ttfl_nuits: [] });
    expect(screen.getByText("Aucun calcul pour ce soir")).toBeInTheDocument();
    expect(screen.getByText("python push_to_supabase.py")).toBeInTheDocument();
  });

  it("montre les 10 meilleurs avec leurs stats détaillées, la date des matchs et le nombre de matchs", async () => {
    await rendre(base());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Picks conseillés");
    expect(screen.getByText(/mardi 20 octobre/i)).toBeInTheDocument();
    expect(screen.getByText(/1 match\b/)).toBeInTheDocument(); // LAL–GSW pour tous les joueurs fictifs
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.getByText("Joueur 1")).toBeInTheDocument();
    expect(screen.getByText("Joueur 10")).toBeInTheDocument();
    expect(screen.queryByText("Joueur 11")).not.toBeInTheDocument();
    // Stats détaillées visibles d'emblée (aucun dépli) : forme, plafond, matchup
    expect(screen.getAllByText("38.2")).toHaveLength(10);
    expect(screen.getAllByText("47.5")).toHaveLength(10);
    expect(screen.getAllByText("×1.07")).toHaveLength(10);
  });

  it("propose un onglet par soirée à venir, 7 au plus, sans les soirées passées ni « aucun match »", async () => {
    const dates = ["2026-10-09", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
      "2026-10-26", "2026-10-27"];
    const tables = { ...base(), ttfl_nuits: [...dates.map((d) => nuit(d)), nuit("2026-10-28", { max_candidats: 0 })] };
    await rendre(tables);
    const onglets = within(screen.getByRole("tablist", { name: "Soirées" })).getAllByRole("tab");
    expect(onglets).toHaveLength(7);
    expect(onglets[0]).toHaveTextContent("20/10");
    expect(onglets[6]).toHaveTextContent("26/10");
  });

  it("affiche la soirée demandée dans l'URL", async () => {
    await rendre(base(), { date: "2026-10-21" });
    expect(screen.getByText(/mercredi 21 octobre/i)).toBeInTheDocument();
  });

  it("n'affiche pas un joueur déjà pické à ≤ 30 jours (futur compris) sur le compte 1", async () => {
    await rendre({ ...base(), ttfl_picks: [{ pick_date: "2026-11-02", player: "Joueur 1", compte: "01" }] });
    const cartes = screen.getAllByRole("article");
    expect(cartes).toHaveLength(10);                                       // toujours 10 : le suivant prend la place
    const noms = cartes.map((c) => within(c).getByRole("heading").textContent);
    expect(noms).not.toContain("Joueur 1");                                 // lecture exacte des titres des cartes
    expect(noms[0]).toBe("Joueur 2");                                       // devenu n°1
    expect(screen.getByText(/1 joueur masqué/)).toBeInTheDocument();       // seulement signalé, replié, hors de la liste
  });

  it("n'affiche pas un absent actif (saisi à la main)", async () => {
    await rendre({
      ...base(),
      ttfl_manual_absents: [{ id: 1, player: "Joueur 2", date_debut: "2026-10-01", date_fin: null, raison: "genou", created_at: "" }],
    });
    const cartes = screen.getAllByRole("article");
    expect(cartes).toHaveLength(10);
    const noms = cartes.map((c) => within(c).getByRole("heading").textContent);
    expect(noms).not.toContain("Joueur 2");
    expect(noms[9]).toBe("Joueur 11");                                      // comble la dixième place
  });

  it("le cycle est propre à la zone : un pick du compte 01 ne masque rien pour l'Équipe", async () => {
    await rendre({ ...base(), ttfl_picks: [{ pick_date: "2026-10-12", player: "Joueur 1", compte: "01" }] }, { pour: "equipe" });
    expect(screen.getByText("Joueur 1")).toBeInTheDocument();
  });

  it("pour l'Équipe, un joueur bloqué sur quelques comptes reste proposé avec la liste des comptes bloqués", async () => {
    await rendre(
      { ...base(), ttfl_picks: [{ pick_date: "2026-10-12", player: "Joueur 1", compte: "03" }] },
      { pour: "equipe" },
    );
    expect(screen.getByText("Joueur 1")).toBeInTheDocument();
    expect(screen.getByText(/Bloqué \(≤ 30 jours\) sur le\(s\) compte\(s\) 03/)).toBeInTheDocument();
  });

  it("signale que les projections sont à l'avance (blessures inconnues) quand il n'y a pas de run du soir", async () => {
    await rendre(base());
    expect(screen.getByText(/Projections calculées à l'avance/)).toBeInTheDocument();
  });

  it("indique « pické » quand le joueur est déjà validé pour cette soirée", async () => {
    await rendre({ ...base(), ttfl_picks: [{ pick_date: "2026-10-20", player: "Joueur 1", compte: "01" }] });
    // Un pick du même jour bloque pas le joueur lui-même : il reste affiché, marqué comme pické.
    expect(screen.getByText("Pické")).toBeInTheDocument();
  });

  it("affiche les cotes quand elles existent, jamais un vide ambigu", async () => {
    await rendre({
      ...base(),
      ttfl_cotes: [{ id: 1, game_date: "2026-10-20", mode: "regular", player: "Joueur 1", team: "LAL", opponent: "GSW",
        projection: 60, ligne_points: 28.5, ligne_rebonds: null, ligne_passes: 6.5, score_reel: null,
        bookmaker: "FanDuel", recupere_le: "" }],
    });
    expect(screen.getByText(/28\.5 pts/)).toBeInTheDocument();
    expect(screen.getByText(/reb indispo/)).toBeInTheDocument();
  });

  it("prévient quand il n'y a aucune soirée à venir et montre le dernier classement connu", async () => {
    await rendre({
      ...base(),
      ttfl_runs: [runAvance("2026-10-05", { note: null, injury_report_fresh: true })],
      ttfl_nuits: [nuit("2026-10-05")],
    });
    expect(screen.getByText(/Ci-dessous, le dernier classement connu/)).toBeInTheDocument();
  });
});
